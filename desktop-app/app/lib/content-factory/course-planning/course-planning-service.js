const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('../../json-store');
const { readWorkbookXml } = require('../course-plan-parser');
const { extractSourceOutline } = require('../source-extraction/source-extractor-service');
const { normalizeDocumentAnalysis, validateDocumentAnalysis } = require('./document-analysis-schema');
const { createSourceStorageService } = require('./source-storage-service');
const { prepareDocument, cleanupPreparedFiles } = require('../document-processing/document-preparation-service');
const { normalizeCollaboration, buildAiUnderstanding, validateRanges, revisePlanTarget, diffPlans } = require('./collaboration-model');
const { normalizeCanonicalPlan, validateCanonicalPlan, enrichPlanWithContainerConfiguration, toClassbookModel } = require('./canonical-course-plan');
const { exportCoursePlanXlsx } = require('./course-plan-xlsx-exporter');
const { normalizePlanReview, validatePlanReview, applyConflictDecision, editUnit, confirmPlanReview, acceptPlanReview } = require('./plan-review-model');

const ORIGIN_STATUSES = new Set(['explicit', 'derived', 'generated', 'conflicting', 'needs_review']);
const TERMINAL_OPERATION_STATUSES = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled', 'timed_out']);
const PLANNING_PROVIDER_TIMEOUT_MS = 300000;
const OPERATION_HEARTBEAT_INTERVAL_MS = 10000;

function createCoursePlanningService({ factoryDir, aiOrchestrator, logger = console }) {
  const rootDir = path.join(factoryDir, 'course-projects');
  const operations = new Map();
  const sourceStorage = createSourceStorageService({ factoryDir, logger });
  const ensureStore = () => ensureDir(rootDir);
  const projectPath = (id) => path.join(rootDir, `${safeId(id)}.json`);

  function getProject(id) {
    ensureStore();
    const project = normalizeProject(readJson(projectPath(id), null), id);
    if (project.analysisOperation?.operationId && !TERMINAL_OPERATION_STATUSES.has(project.analysisOperation.status) && !operations.has(project.analysisOperation.operationId)) {
      project.analysisOperation = { ...project.analysisOperation, status: 'failed', step: 'Unterbrochener Auftrag erkannt', errorCode: 'ANALYSIS_INTERRUPTED', completedAt: new Date().toISOString() };
      writeJson(projectPath(project.id), project);
    }
    if (project.planningOperation?.operationId && !TERMINAL_OPERATION_STATUSES.has(project.planningOperation.status) && !operations.has(project.planningOperation.operationId)) {
      project.planningOperation = { ...project.planningOperation, status: 'timed_out', step: 'Unterbrochene Planung kann erneut gestartet werden', errorCode: 'PLANNING_INTERRUPTED', completedAt: new Date().toISOString() };
      if (project.pipelinePhases?.[project.planningOperation.phase]) setProjectPhase(project, project.planningOperation.phase, 'timed_out', { errorCode: 'PLANNING_INTERRUPTED', errorMessage: 'Die App wurde während der Planung beendet. Die Analyse bleibt erhalten.' });
      writeJson(projectPath(project.id), project);
    }
    return project;
  }
  function listProjects() {
    ensureStore();
    return fs.readdirSync(rootDir).filter((name) => name.endsWith('.json')).map((name) => normalizeProject(readJson(path.join(rootDir, name), {}), path.basename(name, '.json'))).map((project) => ({ id: project.id, title: project.title, updatedAt: project.updatedAt, currentPlanningVersion: project.currentPlanningVersion, approved: project.approvedCoursePlan?.status === 'approved' }));
  }

  function saveProject(project) {
    ensureStore();
    const normalized = normalizeProject(project, project.id);
    normalized.updatedAt = new Date().toISOString();
    writeJson(projectPath(normalized.id), normalized);
    return normalized;
  }

  function persistOperation(operation) {
    const project = normalizeProject(readJson(projectPath(operation.projectId), null), operation.projectId);
    project[operation.kind === 'planning' ? 'planningOperation' : 'analysisOperation'] = cloneSerializable(operation.progress);
    saveProject(project);
  }

  function upsertProject(input = {}) {
    const existing = getProject(input.id);
    return saveProject({ ...existing, ...input, id: safeId(input.id), createdAt: existing.createdAt || new Date().toISOString() });
  }

  function importSourceFile(input = {}) {
    const imported = sourceStorage.importSourceFile(input);
    const preparation = prepareDocument({ ...input, ...imported, id: imported.documentId });
    const project = getProject(imported.projectId);
    const existing = project.uploadedDocuments.find((document) => document.id === imported.documentId);
    const checksumChanged = Boolean(existing?.checksum && existing.checksum !== imported.checksum);
    const document = normalizeDocument({
      ...(existing || {}), ...imported,
      preparation,
      id: imported.documentId,
      declaredCategory: input.sourceCategory || existing?.declaredCategory || '',
      sourcePriority: input.sourcePriority || existing?.sourcePriority || 'high',
      bindingLevel: input.bindingLevel || existing?.bindingLevel || 'binding',
      selectedRanges: input.selectedRanges || existing?.selectedRanges || [{ id: 'entire', rangeType: 'entire_document' }],
      extractionStatus: checksumChanged ? 'queued' : existing?.extractionStatus || 'queued',
      analysisStatus: checksumChanged ? 'queued' : existing?.analysisStatus || 'queued',
      extraction: checksumChanged ? null : existing?.extraction,
      analysisError: null,
      lastError: null,
      analyzedChecksum: checksumChanged ? '' : existing?.analyzedChecksum || ''
    });
    project.uploadedDocuments = [...project.uploadedDocuments.filter((item) => item.id !== document.id), document];
    if (checksumChanged) {
      project.documentAnalyses = project.documentAnalyses.filter((analysis) => analysis.documentId !== document.id);
      project.coursePlanDrafts = project.coursePlanDrafts.map((draft) => ({ ...draft, status: 'stale', staleReason: 'Eine Hauptquelle wurde ersetzt.', staleAt: new Date().toISOString() }));
      project.approvedCoursePlan = null;
    }
    const saved = saveProject(project);
    return { ...document, projectUpdatedAt: saved.updatedAt };
  }

  function startDocumentAnalysis(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw analysisInputError('Die Analyseanfrage ist ungültig.');
    const project = upsertProject(input.project || { id: input.projectId });
    const provider = aiOrchestrator.openai;
    if (!provider?.isConfigured()) throw new Error('KI nicht konfiguriert. Bitte OPENAI_API_KEY und OPENAI_MODEL in den KI-Einstellungen konfigurieren.');
    if (!project.structureFrame?.valid || !project.structureFrame?.confirmed) throw new Error('Dauer und Zielgruppe müssen vor der KI-Analyse vollständig bestätigt werden.');
    const requestedFrame = input.structureFrameSnapshot || input.project?.structureFrame;
    if (requestedFrame && stableSnapshot(requestedFrame) !== stableSnapshot(project.structureFrame)) throw analysisInputError('Der Kursrahmen wurde zwischen Speichern und Analysestart geändert. Bitte speichern und starten Sie die Analyse erneut.');
    if ([...operations.values()].some((item) => item.projectId === project.id && !TERMINAL_OPERATION_STATUSES.has(item.progress.status))) throw analysisInputError('Für dieses Kursprojekt läuft bereits eine Dokumentanalyse.');
    const retryDocumentId = typeof input.retryDocumentId === 'string' ? input.retryDocumentId.trim() : '';
    const requestedDocuments = Array.isArray(input.documents) ? input.documents : [];
    const sourceDocuments = project.uploadedDocuments?.length
      ? project.uploadedDocuments.map((document) => ({ ...document, ...(requestedDocuments.find((item) => item.id === document.id) || {}) }))
      : requestedDocuments;
    const seenIds = new Set();
    sourceDocuments.forEach((document) => {
      if (!document || typeof document.id !== 'string' || !document.id.trim()) throw analysisInputError('Jedes Dokument benötigt eine gültige ID.');
      if (seenIds.has(document.id)) throw analysisInputError(`Die Dokument-ID „${document.id}“ ist doppelt vorhanden.`);
      seenIds.add(document.id);
    });
    const selectedDocuments = sourceDocuments.filter((document) => !document.excluded && (!retryDocumentId || document.id === retryDocumentId));
    if (!selectedDocuments.length) throw analysisInputError(retryDocumentId ? `Das Dokument „${retryDocumentId}“ wurde nicht gefunden oder ist ausgeschlossen.` : 'Es wurden keine analysierbaren Dokumente gefunden.');
    const operationId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const controller = new AbortController();
    const total = selectedDocuments.length;
    const progress = createOperationProgress({ operationId, projectId: project.id, kind: 'analysis', phase: 'source_validation', phaseLabel: 'Quellen prüfen', message: 'Quellen werden geprüft', totalItems: total });
    const operationInput = { ...input, retryDocumentId, structureFrameSnapshot: cloneSerializable(project.structureFrame), selectedDocumentIds: selectedDocuments.map((document) => document.id) };
    const operation = { controller, progress, projectId: project.id };
    operations.set(operationId, operation);
    operation.stopHeartbeat = startOperationHeartbeat(operation, persistOperation);
    project.analysisOperation = progress;
    setProjectPhase(project, 'document_preparation', 'running', { progress: 0 });
    setProjectPhase(project, 'document_analysis', 'queued', { progress: 0 });
    saveProject(project);
    logger.info?.('[DocumentAnalysis]', { event: 'started', operationId, projectId: project.id, documentCount: total });
    operation.promise = runDocumentAnalysis(operationInput, project, provider, controller, progress).catch((error) => {
      progress.status = controller.signal.aborted ? 'cancelled' : 'failed';
      progress.errors.push({ code: error.code || 'ANALYSIS_PIPELINE_FAILED', message: safeError(error), phase: progress.phase });
    }).finally(() => {
      operation.stopHeartbeat?.();
      progress.inProgress = 0;
      progress.currentDocument = '';
      progress.completedAt = new Date().toISOString();
      const latest = getProject(project.id); latest.analysisOperation = cloneSerializable(progress); saveProject(latest);
      logger.info?.('[DocumentAnalysis]', { event: 'finished', operationId, projectId: project.id, status: progress.status, completed: progress.completed, warnings: progress.warningCount, failed: progress.failed });
    });
    return { operationId, status: 'running', progress: cloneSerializable(progress) };
  }

  async function runDocumentAnalysis(input, project, provider, controller, progress) {
    updateProgress(progress, 'running', 'source_validation', 'Quellen werden geprüft', { overallProgress: 0.02 });
    const analyses = [...project.documentAnalyses];
    const existingDocuments = new Map((project.uploadedDocuments || []).map((document) => [document.id, document]));
    const requestedById = new Map((input.documents || []).map((document) => [document.id, document]));
    const documentSource = project.uploadedDocuments?.length ? project.uploadedDocuments : (input.documents || []);
    const uploadedDocuments = documentSource.map((document, index) => normalizeDocument({ ...(existingDocuments.get(document.id) || {}), ...document, ...(requestedById.get(document.id) || {}) }, index));
    project.uploadedDocuments = uploadedDocuments;
    const selectedIds = new Set(input.selectedDocumentIds || []);
    for (const [index, document] of uploadedDocuments.filter((item) => selectedIds.has(item.id)).entries()) {
      if (controller.signal.aborted) break;
      const reusable = !input.retryDocumentId && document.checksum && document.analyzedChecksum === document.checksum && ['analyzed', 'analyzed_with_warnings'].includes(document.analysisStatus) && analyses.some((analysis) => analysis.documentId === document.id && analysis.promptVersion === 'document-analysis-v1');
      if (reusable) {
        document.analysisCache = 'hit'; document.processingStep = 'Vorhandene Analyse wird wiederverwendet'; progress.completed += 1; progress.queued = Math.max(0, progress.total - index - 1); progress.lastActivityAt = new Date().toISOString(); continue;
      }
      document.analysisCache = 'miss';
      document.startedAt = new Date().toISOString();
      document.analysisAttempts = Number(document.analysisAttempts || 0) + 1;
      document.analysisError = null;
      document.extractionStatus = 'queued';
      document.analysisStatus = 'queued';
      document.processingStep = `Dokument ${index + 1} von ${progress.total} wird gelesen`;
      document.analysisStatus = 'extracting';
      logger.info?.('[DocumentAnalysis]', { event: 'document_started', operationId: progress.operationId, projectId: project.id, documentId: document.id, step: document.processingStep });
      progress.queued = Math.max(0, progress.total - index - 1);
      progress.inProgress = 1;
      try {
        progress.currentDocument = document.originalFileName;
        updateProgress(progress, 'running', 'document_preparation', 'Datei wird vorbereitet', { currentItem: index + 1, phaseProgress: 0, overallProgress: analysisOverallProgress('document_preparation', progress, index, 0) });
        setProjectPhase(project, 'document_preparation', 'running', { progress: Math.round((index / progress.total) * 100) });
        document.extractionStatus = 'extracting';
        saveProject(project);
        if (!document.preparation || (document.preparation.providerFiles || []).some((file) => file.temporary && !file.providerFileId && !fs.existsSync(file.localPath))) document.preparation = prepareDocument(document);
        const extraction = extractDocument(document, { validateStoredSource: sourceStorage.validateStoredSource, projectId: project.id });
        document.extraction = extraction;
        document.extractionStatus = 'extracted';
        document.analysisStatus = 'analyzing';
        document.processingStep = 'Dokument wird durch die KI analysiert';
        const segments = segmentExtraction(extraction);
        progress.currentSegment = 0; progress.segmentCompleted = 0; progress.segmentTotal = segments.length;
        updateProgress(progress, 'running', 'document_analysis', 'Inhalte werden fachlich analysiert', { currentItem: index + 1, phaseProgress: 0, overallProgress: analysisOverallProgress('document_analysis', progress, index, 0) });
        setProjectPhase(project, 'document_analysis', 'running', { progress: Math.round((index / progress.total) * 100) });
        const analysisInput = { project: projectContext(project), structureFrame: input.structureFrameSnapshot, document, extraction, preparation: document.preparation };
        const analysisPromise = provider.analyzeDocumentSegments && segments.length > 1
          ? provider.analyzeDocumentSegments(analysisInput, segments, { signal: controller.signal, documentTimeoutMs: 90000, onSegmentComplete: ({ index: segmentIndex, segmentId }) => { progress.currentSegment = segmentIndex; progress.segmentCompleted = segmentIndex; updateProgress(progress, 'running', 'document_analysis', `Segment ${segmentIndex} von ${segments.length} wurde verarbeitet`, { phaseProgress: segmentIndex / segments.length, overallProgress: analysisOverallProgress('document_analysis', progress, index, segmentIndex / segments.length) }); document.segmentStatus = { completed: segmentIndex, total: segments.length, currentSegmentId: segmentId, updatedAt: new Date().toISOString() }; saveProject({ ...project, uploadedDocuments }); } })
          : provider.analyzeDocument(analysisInput, { signal: controller.signal, timeoutMs: 90000 });
        const raw = await withPhaseTimeout(analysisPromise, 180000, 'DOCUMENT_ANALYSIS_TIMEOUT', 'Die Dokumentanalyse hat das Zeitlimit überschritten.');
        const normalized = normalizeDocumentAnalysis(raw, { documentId: document.id, documentType: extraction.documentType });
        const validation = validateDocumentAnalysis(normalized.value);
        if (!validation.valid) {
          const first = validation.errors[0];
          const error = new Error(`Die Analyse von „${document.originalFileName}“ konnte nicht abgeschlossen werden. Das KI-Ergebnis enthielt ein ungültiges Format für „${first.path}“. Die übrigen Dokumente werden weiterverarbeitet.`);
          error.code = first.code; error.field = first.path; error.expected = first.expected; error.received = first.received;
          throw error;
        }
        const version = Math.max(0, ...analyses.filter((item) => item.documentId === document.id).map((item) => item.analysisVersion || 0)) + 1;
        const analysis = {
          ...normalized.value, id: `analysis-${document.id}-${version}`, documentId: document.id, analysisVersion: version,
          provider: provider.name, model: provider.model, promptVersion: 'document-analysis-v1', createdAt: new Date().toISOString()
        };
        analyses.push(analysis);
        document.analysisStatus = analysis.reviewRequired || analysis.warnings.length || analysis.conflicts.length ? 'analyzed_with_warnings' : 'analyzed';
        document.detectedCategory = analysis.detectedCategory;
        document.analysisError = null;
        document.lastError = null;
        document.analyzedChecksum = document.checksum || '';
        document.analysisVersion = version;
        document.endedAt = new Date().toISOString();
        if (document.analysisStatus === 'analyzed_with_warnings') progress.warningCount += 1;
        else progress.completed += 1;
        saveProject({ ...project, documentAnalyses: analyses });
        cleanupPreparedFiles(document.preparation);
        document.preparation = { ...document.preparation, providerFiles: retainProviderFiles(document.preparation.providerFiles), conversionStatus: document.preparation.conversionStatus === 'completed' ? 'cleaned' : document.preparation.conversionStatus };
      } catch (error) {
        cleanupPreparedFiles(document.preparation);
        if (document.preparation) document.preparation = { ...document.preparation, providerFiles: retainProviderFiles(document.preparation.providerFiles), conversionStatus: document.preparation.conversionStatus === 'completed' ? 'cleaned' : document.preparation.conversionStatus };
        if (controller.signal.aborted) {
          document.analysisStatus = 'cancelled';
        } else {
          if (document.extractionStatus !== 'extracted') document.extractionStatus = 'failed';
          document.analysisStatus = 'failed';
          const errorCode = error.code === 'OPENAI_TIMEOUT' ? 'DOCUMENT_ANALYSIS_TIMEOUT' : (error.code || 'DOCUMENT_ANALYSIS_FAILED');
          document.analysisError = { message: safeError(error), code: errorCode, step: document.processingStep, field: error.field || '', expected: error.expected || '', received: error.received || '' };
          document.lastError = document.analysisError;
          progress.failed += 1;
          progress.errors.push({ documentId: document.id, fileName: document.originalFileName, ...document.analysisError });
          logger.error?.('[DocumentAnalysis]', { event: 'document_failed', operationId: progress.operationId, projectId: project.id, documentId: document.id, step: document.processingStep, message: safeError(error) });
        }
        document.endedAt = new Date().toISOString();
        saveProject({ ...project, documentAnalyses: analyses, uploadedDocuments });
      }
      progress.inProgress = 0;
      updateProgress(progress, 'running', 'document_analysis', `Dokument ${index + 1} von ${progress.total} verarbeitet`, { currentItem: index + 1, phaseProgress: 1, overallProgress: analysisOverallProgress('document_analysis', progress, index + 1, 0) });
    }
    project.documentAnalyses = analyses;
    project.uploadedDocuments = uploadedDocuments;
    setProjectPhase(project, 'document_preparation', 'completed', { progress: 100 });
    if (controller.signal.aborted) { progress.status = 'cancelled'; saveProject(project); return; }
    const successful = latestAnalyses(analyses).filter((item) => !item.failed);
    if (!successful.length) { progress.status = 'failed'; progress.step = 'Keine verwertbare Dokumentanalyse'; saveProject(project); return; }
    const blockingFailure = uploadedDocuments.find((document) => document.bindingLevel === 'binding' && document.analysisStatus === 'failed' && !document.failureAcknowledged);
    if (blockingFailure) {
      progress.status = 'failed';
      progress.step = 'Verbindliche Hauptquelle konnte nicht analysiert werden';
      progress.errors.push({ documentId: blockingFailure.id, message: 'Eine verbindliche Hauptquelle muss erneut analysiert oder ausdrücklich als Ausnahme bestätigt werden.' });
      saveProject(project);
      return;
    }
    updateProgress(progress, 'running', 'topic_consolidation', 'Themen werden zusammengeführt', { phaseProgress: 0, overallProgress: 0.82 });
    project.mergedKnowledgeBase = mergeAnalyses(successful);
    project.topicCatalog = consolidateTopicCatalog(successful);
    project.topicReview = createTopicReview(project.topicCatalog, successful, project.topicReview);
    setProjectPhase(project, 'topic_consolidation', 'completed', { progress: 100 });
    saveProject(project);
    progress.status = progress.failed || progress.warningCount ? 'completed_with_warnings' : 'completed';
    setProjectPhase(project, 'document_analysis', progress.status, { progress: 100 });
    updateProgress(progress, progress.status, 'completed', 'Dokumentanalyse abgeschlossen', { phaseProgress: 1, overallProgress: 1 });
    saveProject(project);
  }

  function getAnalysisProgress(operationId) {
    return operations.get(operationId)?.progress || getOperationStatus(operationId);
  }

  function cancelAiOperation(operationId) {
    const operation = operations.get(operationId);
    if (!operation) return { cancelled: false };
    operation.controller.abort();
    operation.stopHeartbeat?.();
    updateProgress(operation.progress, 'cancelled', operation.progress.phase, 'Vorgang abgebrochen');
    operation.progress.completedAt = new Date().toISOString();
    persistOperation(operation);
    return { cancelled: true, operationId };
  }

  function startCoursePlanning(input = {}) {
    const project = getProject(input.projectId);
    if (!['completed', 'completed_with_warnings'].includes(project.pipelinePhases?.document_analysis?.status) || !project.topicCatalog?.topics?.length) throw sourceError('PLANNING_REQUIRES_ANALYSIS', 'Der Unterrichtsplan kann erst nach abgeschlossener Dokumentanalyse und Themenkonsolidierung erstellt werden.');
    if (project.topicReview?.status !== 'confirmed') throw sourceError('PLANNING_REQUIRES_TOPIC_REVIEW', 'Prüfe und bestätige zuerst die erkannten Themen und Analyseergebnisse.');
    if ([...operations.values()].some((item) => item.projectId === project.id && item.kind === 'planning' && !TERMINAL_OPERATION_STATUSES.has(item.progress.status))) throw analysisInputError('Für dieses Kursprojekt läuft bereits eine Unterrichtsplanung.');
    const operationId = `planning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const controller = new AbortController();
    const progress = createOperationProgress({ operationId, projectId: project.id, kind: 'planning', phase: 'planning_input', phaseLabel: 'Eingabedaten vorbereiten', message: 'Bestätigte Themenbasis wird vorbereitet', totalItems: 10 });
    const operation = { controller, progress, projectId: project.id, kind: 'planning' };
    operations.set(operationId, operation);
    operation.stopHeartbeat = startOperationHeartbeat(operation, persistOperation);
    project.planningOperation = cloneSerializable(progress);
    setProjectPhase(project, 'ue_scaffold', 'running', { progress: 0 });
    saveProject(project);
    operation.promise = runCoursePlanning(input, project, controller, progress).catch((error) => {
      progress.status = error.code === 'COURSE_PLANNING_TIMEOUT' ? 'timed_out' : controller.signal.aborted ? 'cancelled' : 'failed';
      progress.errors.push({ code: error.code || 'COURSE_PLANNING_FAILED', message: safeError(error), phase: progress.phase });
      const latest = getProject(project.id); setProjectPhase(latest, progress.phase, progress.status, { errorCode: error.code, errorMessage: safeError(error) }); saveProject(latest);
    }).finally(() => {
      operation.stopHeartbeat?.();
      progress.completedAt = new Date().toISOString(); progress.updatedAt = progress.completedAt;
      const latest = getProject(project.id); latest.planningOperation = cloneSerializable(progress); saveProject(latest);
    });
    return { operationId, status: progress.status, progress: cloneSerializable(progress) };
  }

  async function runCoursePlanning(input, project, controller, progress) {
    const providerTimeoutMs = Number(input.timeoutMs || PLANNING_PROVIDER_TIMEOUT_MS);
    updateProgress(progress, 'running', 'planning_input', 'Bestätigte Themenbasis wird vorbereitet', { overallProgress: 0.05, currentItem: 1 });
    const scaffold = buildUeScaffold(project.structureFrame);
    project.ueScaffold = scaffold;
    setProjectPhase(project, 'ue_scaffold', 'completed', { progress: 100 });
    progress.completed = 1; progress.queued = 8; updateProgress(progress, 'running', 'provider_request', 'Planungsanfrage wird an den KI-Provider übermittelt', { overallProgress: 0.12, currentItem: 2 });
    setProjectPhase(project, 'topic_distribution', 'running', { progress: 0 }); saveProject(project);
    updateProgress(progress, 'running', 'provider_wait', 'Die KI erstellt den Unterrichtsplan', { overallProgress: 0.2, currentItem: 3 });
    await withPhaseTimeout(generateCoursePlan({ projectId: project.id, signal: controller.signal, scaffold, providerTimeoutMs, onPhase: (phase, message, overallProgress) => updateProgress(progress, 'running', phase, message, { overallProgress }) }), providerTimeoutMs, 'COURSE_PLANNING_TIMEOUT', 'Die Unterrichtsplanung hat das Zeitlimit überschritten.', controller);
    progress.completed = 9; progress.queued = 0; updateProgress(progress, 'running', 'review_preparation', 'Struktur-Review wird vorbereitet', { overallProgress: 0.98, currentItem: 9 });
    const latest = getProject(project.id); setProjectPhase(latest, 'topic_distribution', 'completed', { progress: 100 }); setProjectPhase(latest, 'plan_validation', 'completed', { progress: 100 }); saveProject(latest);
    progress.completed = 10; updateProgress(progress, 'completed', 'completed', 'Unterrichtsplan erstellt', { overallProgress: 1, phaseProgress: 1, currentItem: 10 });
  }

  function getOperationStatus(operationId) {
    const live = operations.get(operationId)?.progress;
    if (live) return compactOperation(live);
    const projects = listProjectFiles(rootDir).map((file) => normalizeProject(readJson(file, {}), path.basename(file, '.json')));
    const project = projects.find((item) => item.analysisOperation?.operationId === operationId || item.planningOperation?.operationId === operationId);
    return project ? compactOperation(project.planningOperation?.operationId === operationId ? project.planningOperation : project.analysisOperation) : { operationId, status: 'not_found' };
  }

  function getPlanningResult(operationId) {
    const status = getOperationStatus(operationId);
    if (!status.projectId) return status;
    const project = getProject(status.projectId);
    const plan = project.coursePlanDrafts.find((item) => item.planningVersion === project.currentPlanningVersion) || null;
    return { ...status, planVersion: project.currentPlanningVersion, plan, documentStatus: project.uploadedDocuments.map(({ id, originalFileName, analysisStatus, analyzedChecksum }) => ({ id, originalFileName, analysisStatus, analyzedChecksum })), navigationTarget: plan ? { step: 'structureReview', dayNumber: 1, unitNumber: 1 } : null };
  }

  function savePlanningFrame(projectId, frame = {}) {
    const project = getProject(projectId);
    const calculation = calculatePlanningFrame(frame);
    if (!calculation.valid) throw new Error(calculation.errors.join(' | '));
    if (calculation.warnings.length && frame.confirmWarnings !== true) throw new Error(`Abweichung im Planungsrahmen: ${calculation.warnings.join(' ')} Bitte Abweichung ausdrücklich bestätigen.`);
    project.planningFrame = { ...frame, ...calculation, confirmed: true };
    project.targetGroup = frame.targetGroup || project.targetGroup;
    project.priorKnowledge = frame.priorKnowledge || project.priorKnowledge;
    return saveProject(project);
  }

  function saveCourseScope(projectId, input = {}) {
    const project = getProject(projectId);
    const structureFrame = calculateCourseScope({ ...(project.structureFrame || {}), ...input });
    if (!structureFrame.valid) {
      const error = new Error(structureFrame.errors.join(' | '));
      error.code = 'COURSE_SCOPE_VALIDATION';
      throw error;
    }
    const previousSnapshot = courseScopeSignature(project.structureFrame || {});
    project.structureFrame = { ...(project.structureFrame || {}), ...input, ...structureFrame, confirmed: true, savedAt: new Date().toISOString() };
    project.targetGroup = selectionText(structureFrame.targetAudience);
    project.priorKnowledge = selectionText(structureFrame.priorKnowledge);
    if (previousSnapshot && previousSnapshot !== courseScopeSignature(project.structureFrame)) {
      project.coursePlanDrafts = project.coursePlanDrafts.map((draft) => ({ ...draft, status: 'stale', staleReason: 'Der Kursrahmen wurde geändert.', staleAt: new Date().toISOString() }));
      project.approvedCoursePlan = null;
    }
    return saveProject(project);
  }

  async function generateCoursePlan(input = {}) {
    const project = getProject(input.projectId);
    const provider = aiOrchestrator.openai;
    if (!provider?.isConfigured()) throw new Error('KI nicht konfiguriert. Für die Kursstruktur ist eine echte OpenAI-Verbindung erforderlich.');
    const structureFrame = project.structureFrame;
    if (!structureFrame?.valid) throw new Error('Dauer und Zielgruppe sind unvollständig oder ungültig.');
    const analyses = latestAnalyses(project.documentAnalyses).filter((item) => !item.failed);
    if (!analyses.length) throw new Error('Mindestens eine erfolgreiche Dokumentanalyse ist erforderlich.');
    const planningVersion = Number(project.currentPlanningVersion || 0) + 1;
    const planningInput = {
      course: projectContext(project), structureFrame: cloneSerializable(structureFrame),
      topicCatalog: { ...cloneSerializable(project.topicCatalog || {}), topics: cloneSerializable(project.topicReview?.topics || project.topicCatalog?.topics || []) },
      topicReviewVersion: Number(project.topicReview?.version || 0),
      ueScaffold: cloneSerializable(input.scaffold || project.ueScaffold || buildUeScaffold(structureFrame)),
      bindingTopics: input.bindingTopics || [], excludedTopics: input.excludedTopics || [],
      planningConfiguration: cloneSerializable(project.containerProfile?.didacticCourse || project.structuredRequirements || {})
    };
    const knownDocumentIds = new Set([...project.uploadedDocuments.map((document) => document.id), ...analyses.map((analysis) => analysis.documentId)]);
    input.onPhase?.('provider_wait', 'Auf KI-Ergebnis warten', 0.25);
    const providerOptions = { signal: input.signal, timeoutMs: Number(input.providerTimeoutMs || PLANNING_PROVIDER_TIMEOUT_MS) };
    const providerResult = await provider.generateStructuredCoursePlan(planningInput, providerOptions);
    if (input.signal?.aborted) throw sourceError('OPERATION_CANCELLED', 'Die Unterrichtsplanung wurde abgebrochen.');
    input.onPhase?.('provider_response', 'KI-Antwort wurde empfangen', 0.65);
    input.onPhase?.('result_parsing', 'KI-Antwort wird verarbeitet', 0.72);
    let raw = normalizeCanonicalPlan(deduplicatePlanSources(providerResult), { ...structureFrame, courseId: project.id, title: project.title });
    input.onPhase?.('plan_validation', 'Unterrichtsplan wird validiert', 0.8);
    let validation = validateCanonicalPlan(raw, structureFrame, knownDocumentIds);
    if (validation.status === 'failed') {
      const repaired = await provider.generateStructuredCoursePlan({ ...planningInput, repairAttempt: 1, validationErrors: validation.errors }, providerOptions);
      if (input.signal?.aborted) throw sourceError('OPERATION_CANCELLED', 'Die Unterrichtsplanung wurde abgebrochen.');
      raw = normalizeCanonicalPlan(deduplicatePlanSources(repaired), { ...structureFrame, courseId: project.id, title: project.title });
      validation = validateCanonicalPlan(raw, structureFrame, knownDocumentIds);
    }
    if (validation.status === 'failed') {
      const error = new Error(`Die KI-Kursstruktur passt auch nach einem Reparaturversuch nicht zum bestätigten Kursrahmen: ${validation.errors.join(' | ')}`);
      error.code = 'COURSE_PLAN_VALIDATION';
      throw error;
    }
    const now = new Date().toISOString();
    const draft = normalizePlanReview({
      ...raw, id: `course-plan-${project.id}-${planningVersion}`, planningVersion,
      status: 'draft', validation,
      sourceAnalysisVersions: analyses.map((item) => ({ documentId: item.documentId, analysisVersion: item.analysisVersion })),
      structureFrameSnapshot: structureFrame, provider: provider.name, model: provider.model,
      promptVersion: 'course-plan-v2', planningStage: 'ai_groundwork', classbookModel: toClassbookModel(raw), createdAt: now, updatedAt: now
    });
    draft.topicReviewVersion = Number(project.topicReview?.version || 0); draft.topicReviewSourceAnalysisVersions = cloneSerializable(project.topicReview?.sourceAnalysisVersions || []);
    if (input.signal?.aborted) throw sourceError('OPERATION_CANCELLED', 'Die Unterrichtsplanung wurde abgebrochen.');
    input.onPhase?.('draft_persistence', 'Planungsversion und Draft werden gespeichert', 0.9);
    project.coursePlanDrafts.push(draft);
    project.currentPlanningVersion = planningVersion;
    const saved = saveProject(project);
    input.onPhase?.('project_reload', 'Kursprojekt wird erneut geladen', 0.95);
    return saved;
  }

  function saveCoursePlanDraft(projectId, draft = {}) {
    const project = getProject(projectId);
    if (project.approvedCoursePlan?.planningVersion === draft.planningVersion) throw new Error('Eine freigegebene Kursstruktur darf nicht überschrieben werden.');
    const canonical = normalizeCanonicalPlan(draft, { ...(draft.structureFrameSnapshot || project.structureFrame), courseId: project.id, title: project.title });
    const validation = validateCanonicalPlan(canonical, draft.structureFrameSnapshot || project.structureFrame);
    const updated = { ...canonical, validation, classbookModel: toClassbookModel(canonical), status: validation.status === 'failed' ? 'needs_review' : 'draft', updatedAt: new Date().toISOString() };
    project.coursePlanDrafts = [...project.coursePlanDrafts.filter((item) => item.id !== updated.id), updated];
    return saveProject(project);
  }

  function acknowledgeDocumentFailure(projectId, documentId) {
    const project = getProject(projectId);
    project.uploadedDocuments = project.uploadedDocuments.map((document) => document.id === documentId ? { ...document, failureAcknowledged: true, updatedAt: new Date().toISOString() } : document);
    return saveProject(project);
  }

  function approveCoursePlan(projectId, version) {
    const project = getProject(projectId);
    const draft = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(version));
    if (!draft) throw new Error('Kursstruktur wurde nicht gefunden.');
    const validation = validateCanonicalPlan(draft, draft.structureFrameSnapshot || project.structureFrame);
    if (validation.status === 'failed') throw new Error('Die Kursstruktur enthält blockierende Validierungsfehler.');
    if (project.uploadedDocuments.some((document) => document.bindingLevel === 'binding' && document.analysisStatus === 'failed' && !document.failureAcknowledged)) throw new Error('Verbindliche fehlgeschlagene Dokumente müssen erneut analysiert oder ausdrücklich als Ausnahme bestätigt werden.');
    const reviewed = acceptPlanReview(confirmPlanReview(normalizePlanReview(draft)));
    const approved = { ...reviewed, status: 'approved', validation, approvedAt: new Date().toISOString() };
    project.coursePlanDrafts = project.coursePlanDrafts.map((item) => item.id === approved.id ? approved : item);
    project.approvedCoursePlan = approved;
    return saveProject(project);
  }

  function getAiUnderstanding(projectId) { return buildAiUnderstanding(getProject(projectId)); }

  function updateTopicReview(projectId, input = {}) {
    const project = getProject(projectId); const current = project.topicReview || createTopicReview(project.topicCatalog, latestAnalyses(project.documentAnalyses));
    const topics = Array.isArray(input.topics) ? input.topics.map((topic, index) => ({ ...(current.topics[index] || {}), ...topic, id: topic.id || current.topics[index]?.id || `topic-${index + 1}`, reviewStatus: topic.reviewStatus || 'edited' })) : current.topics;
    project.topicReview = { ...current, topics, status: 'edited', version: Number(current.version || 0) + 1, confirmedAt: null, confirmedBy: null, updatedAt: new Date().toISOString() };
    if (project.coursePlanDrafts.length) { project.coursePlanDrafts = project.coursePlanDrafts.map((draft) => draft.status === 'approved' ? draft : { ...draft, status: 'stale', staleReason: 'Die bestätigte Themenbasis wurde verändert.', staleAt: new Date().toISOString() }); project.approvedCoursePlan = null; }
    return saveProject(project);
  }

  function confirmTopicReview(projectId, confirmedBy = null) { const project = getProject(projectId); if (!project.topicReview?.topics?.length) throw new Error('Die Themenbasis ist leer.'); project.topicReview = { ...project.topicReview, status: 'confirmed', confirmedAt: new Date().toISOString(), confirmedBy: confirmedBy || null }; return saveProject(project); }

  function decidePlanConflict(projectId, version, input = {}) { return reviseReviewedPlan(projectId, version, (draft) => applyConflictDecision(draft, input), 'conflict_resolution'); }
  function editPlanUnit(projectId, version, input = {}) { return reviseReviewedPlan(projectId, version, (draft) => editUnit(draft, input), 'manual_edit'); }

  function confirmReviewedPlan(projectId, version) {
    const project = getProject(projectId); const draft = findDraft(project, version); const validation = validateCanonicalPlan(draft, draft.structureFrameSnapshot || project.structureFrame);
    if (validation.status === 'failed') throw new Error(validation.errors.join(' | '));
    const confirmed = confirmPlanReview(normalizePlanReview(draft)); confirmed.validation = validation; confirmed.updatedAt = new Date().toISOString();
    project.coursePlanDrafts = project.coursePlanDrafts.map((item) => item.id === draft.id ? confirmed : item); return saveProject(project);
  }

  function acceptReviewedPlan(projectId, version) {
    const project = getProject(projectId); const draft = findDraft(project, version); const accepted = { ...acceptPlanReview(normalizePlanReview(draft)), status: 'approved', approvedAt: new Date().toISOString() };
    project.coursePlanDrafts = project.coursePlanDrafts.map((item) => item.id === draft.id ? accepted : item); project.approvedCoursePlan = cloneSerializable(accepted); return saveProject(project);
  }

  function reviseReviewedPlan(projectId, version, transform, origin) {
    const project = getProject(projectId); const source = findDraft(project, version); const planningVersion = Number(project.currentPlanningVersion) + 1; const now = new Date().toISOString();
    const edited = transform(normalizePlanReview(cloneSerializable(source))); edited.id = `course-plan-${project.id}-${planningVersion}`; edited.parentPlanningVersion = source.planningVersion; edited.planningVersion = planningVersion; edited.status = 'draft'; edited.updatedAt = now; edited.createdAt = now;
    edited.validation = validateCanonicalPlan(edited, source.structureFrameSnapshot || project.structureFrame); edited.classbookModel = toClassbookModel(edited); edited.diff = diffPlans(source, edited); project.coursePlanDrafts.push(edited); project.currentPlanningVersion = planningVersion; project.approvedCoursePlan = null;
    project.planVersions.push({ planningVersion, parentPlanningVersion: source.planningVersion, targetType: origin, diff: edited.diff, createdAt: now }); return saveProject(project);
  }
  function findDraft(project, version) { const draft = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(version || project.currentPlanningVersion)); if (!draft) throw new Error('Unterrichtsplan wurde nicht gefunden.'); return draft; }

  function applyContainerConfiguration(projectId, containerProfile = {}) {
    const project = getProject(projectId);
    const current = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(project.currentPlanningVersion));
    if (!current) throw new Error('Unterrichtsplan wurde nicht gefunden.');
    const enriched = enrichPlanWithContainerConfiguration(current, containerProfile);
    const validation = validateCanonicalPlan(enriched, current.structureFrameSnapshot || project.structureFrame);
    if (validation.status === 'failed') throw new Error(`Die Konfiguration erzeugt keinen gÃ¼ltigen Unterrichtsplan: ${validation.errors.join(' | ')}`);
    const planningVersion = Number(project.currentPlanningVersion) + 1; const now = new Date().toISOString();
    const version = { ...enriched, id: `course-plan-${project.id}-${planningVersion}`, planningVersion, parentPlanningVersion: current.planningVersion, status: 'draft', planningStage: 'container_enriched', validation, containerProfileSnapshot: cloneSerializable(containerProfile), classbookModel: toClassbookModel(enriched), diff: diffPlans(current, enriched), createdAt: now, updatedAt: now };
    project.containerProfile = cloneSerializable(containerProfile); project.coursePlanDrafts.push(version); project.currentPlanningVersion = planningVersion;
    project.planVersions.push({ planningVersion, parentPlanningVersion: current.planningVersion, targetType: 'container_configuration', diff: version.diff, createdAt: now });
    return saveProject(project);
  }

  function getClassbookModel(projectId, version) {
    const project = getProject(projectId); const plan = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(version || project.currentPlanningVersion));
    if (!plan) throw new Error('Unterrichtsplan wurde nicht gefunden.');
    return toClassbookModel(plan);
  }

  function exportStoredCoursePlan(projectId, version, outputPath, options = {}) {
    const project = getProject(projectId); const plan = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(version || project.currentPlanningVersion));
    if (!plan) throw new Error('Unterrichtsplan wurde nicht gefunden.');
    const validation = validateCanonicalPlan(plan, plan.structureFrameSnapshot || project.structureFrame);
    if (validation.status === 'failed') throw new Error('Nur ein vollstÃ¤ndiger, gÃ¼ltiger Unterrichtsplan kann exportiert werden.');
    const result = exportCoursePlanXlsx(plan, outputPath, { ...options, configuration: plan.containerProfileSnapshot || project.containerProfile || {} });
    project.exports = [...(project.exports || []), { type: 'course-plan-xlsx', planningVersion: plan.planningVersion, fileName: path.basename(outputPath), rowCount: result.rowCount, exportedAt: result.exportedAt }]; saveProject(project);
    return result;
  }

  function updatePlanCollaboration(projectId, input = {}) {
    const project = getProject(projectId);
    if (input.interactionMode) project.interactionMode = input.interactionMode;
    if (input.structuredRequirements) project.structuredRequirements = { ...project.structuredRequirements, ...input.structuredRequirements };
    if (input.correction) project.userCorrections = [...project.userCorrections, { ...input.correction, createdAt: new Date().toISOString() }];
    if (input.feedback) project.feedback = [...project.feedback, { ...input.feedback, id: input.feedback.id || `feedback-${Date.now()}`, createdAt: new Date().toISOString() }];
    if (input.lock) project.planLocks = [...project.planLocks.filter((item) => !(item.targetType === input.lock.targetType && item.targetId === input.lock.targetId)), { ...input.lock, createdAt: new Date().toISOString() }];
    if (input.unlock) project.planLocks = project.planLocks.filter((item) => !(item.targetType === input.unlock.targetType && item.targetId === input.unlock.targetId));
    if (input.documentId && input.document) {
      const rangeResult = validateRanges(input.document.selectedRanges || [], input.document.maximumRange);
      if (!rangeResult.valid) throw analysisInputError(rangeResult.errors[0].message);
      let found = false; project.uploadedDocuments = project.uploadedDocuments.map((document) => document.id === input.documentId ? (found = true, normalizeDocument({ ...document, ...input.document, selectedRanges: rangeResult.ranges })) : document);
      if (!found) throw analysisInputError('Die Dokument-ID wurde nicht gefunden.');
    }
    return saveProject(project);
  }

  function reviseTarget(projectId, input = {}) {
    const project = getProject(projectId); const current = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(project.currentPlanningVersion));
    if (!current) throw new Error('Kursstruktur wurde nicht gefunden.');
    const nextPlan = revisePlanTarget(current, input, project.planLocks);
    const planningVersion = Number(project.currentPlanningVersion) + 1; const now = new Date().toISOString();
    const version = { ...nextPlan, id: `course-plan-${project.id}-${planningVersion}`, planningVersion, status: 'draft', parentPlanningVersion: current.planningVersion, revisionTarget: { targetType: input.targetType, targetId: input.targetId }, diff: diffPlans(current, nextPlan), createdAt: now, updatedAt: now };
    project.coursePlanDrafts.push(version); project.planVersions.push({ planningVersion, parentPlanningVersion: current.planningVersion, targetType: input.targetType, targetId: input.targetId, diff: version.diff, createdAt: now }); project.currentPlanningVersion = planningVersion;
    return saveProject(project);
  }

  function restorePlanVersion(projectId, version) {
    const project = getProject(projectId); const source = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(version));
    if (!source) throw new Error('Planversion wurde nicht gefunden.');
    const current = project.coursePlanDrafts.find((item) => Number(item.planningVersion) === Number(project.currentPlanningVersion));
    const planningVersion = Number(project.currentPlanningVersion) + 1; const now = new Date().toISOString();
    const restored = { ...cloneSerializable(source), id: `course-plan-${project.id}-${planningVersion}`, planningVersion, parentPlanningVersion: current?.planningVersion || null, restoredFromPlanningVersion: Number(version), status: 'draft', createdAt: now, updatedAt: now };
    restored.diff = diffPlans(current || {}, restored); project.coursePlanDrafts.push(restored); project.currentPlanningVersion = planningVersion;
    project.planVersions.push({ planningVersion, parentPlanningVersion: current?.planningVersion || null, restoredFromPlanningVersion: Number(version), diff: restored.diff, createdAt: now });
    return saveProject(project);
  }

  return { getProject, listProjects, upsertProject, importSourceFile, startDocumentAnalysis, startCoursePlanning, getAnalysisProgress, getOperationStatus, getPlanningResult, cancelAiOperation, savePlanningFrame, saveCourseScope, generateCoursePlan, saveCoursePlanDraft, acknowledgeDocumentFailure, approveCoursePlan, updateTopicReview, confirmTopicReview, decidePlanConflict, editPlanUnit, confirmReviewedPlan, acceptReviewedPlan, applyContainerConfiguration, getClassbookModel, exportStoredCoursePlan, getAiUnderstanding, updatePlanCollaboration, reviseTarget, restorePlanVersion };
}

function analysisInputError(message) { const error = new Error(message); error.code = 'DOCUMENT_ANALYSIS_INPUT'; return error; }

function extractDocument(document, options = {}) {
  if (!document.storedFilePath) throw sourceError('SOURCE_PATH_MISSING', 'Die Quelldatei wurde in einer älteren Version nur als Metadaten gespeichert. Bitte laden Sie die Datei erneut hoch.');
  if (options.validateStoredSource) options.validateStoredSource(document, options.projectId);
  else if (!fs.existsSync(document.storedFilePath)) throw sourceError('SOURCE_FILE_NOT_FOUND', 'Die Quelldatei wurde nicht gefunden. Bitte laden Sie die Datei erneut hoch.');
  const extension = path.extname(document.originalFileName || document.storedFilePath || '').toLowerCase();
  if (extension === '.csv') {
    const text = fs.readFileSync(document.storedFilePath, 'utf8').replace(/^\uFEFF/, '');
    const rows = text.split(/\r?\n/).filter((line) => line.trim());
    if (!rows.length) throw sourceError('EXTRACTION_EMPTY', `Aus „${document.originalFileName}“ konnten keine Tabelleninhalte extrahiert werden.`);
    const sections = [];
    for (let offset = 0; offset < Math.min(rows.length, 5000); offset += 200) {
      const chunk = rows.slice(offset, offset + 200);
      sections.push({ type: 'rows', name: `Zeilen ${offset + 1}–${offset + chunk.length}`, content: chunk.map((row, index) => `${offset + index + 1}: ${row}`).join('\n'), sourceRef: `CSV Zeilen ${offset + 1}-${offset + chunk.length}` });
    }
    return { documentId: document.id, fileName: document.originalFileName, documentType: 'spreadsheet', searchable: true, extractedCharacters: text.length, pageOrSlideCount: sections.length, sections, warnings: [], selectedRanges: document.selectedRanges || [] };
  }
  if (['.xlsx', '.xlsm'].includes(extension)) {
    const workbook = readWorkbookXml(document.storedFilePath);
    const sections = workbook.sheets.map((sheet) => ({
      type: 'sheet', name: sheet.name, hidden: Boolean(sheet.hidden),
      content: sheet.rows.slice(0, 500).map((row, index) => `${index + 1}: ${row.filter(Boolean).join(' | ')}`).filter((line) => !/:\s*$/.test(line)).join('\n').slice(0, 30000),
      locations: sheet.rows.slice(0, 500).map((row, index) => ({ row: index + 1, usedColumns: row.filter(Boolean).length }))
    })).filter((section) => section.content);
    const extractedCharacters = sections.reduce((sum, section) => sum + section.content.length, 0);
    if (!extractedCharacters) throw sourceError('EXTRACTION_EMPTY', `Aus „${document.originalFileName}“ konnten keine Tabelleninhalte extrahiert werden.`);
    return { documentId: document.id, fileName: document.originalFileName, documentType: 'spreadsheet', searchable: true, extractedCharacters, pageOrSlideCount: sections.length, sections, warnings: ['Makros wurden nicht ausgeführt.'], selectedRanges: document.selectedRanges || [] };
  }
  const ranges = (document.selectedRanges || []).filter((range) => range.rangeType === 'slides' || range.type === 'slides').map((range) => ({ from: range.from, to: range.to }));
  const outline = extractSourceOutline({ name: document.originalFileName, path: document.storedFilePath }, { ranges });
  const extractedCharacters = Number(outline.quality?.extractedCharacters || 0);
  if (outline.quality?.usedFallback && (outline.warnings || []).some((warning) => /konnte nicht gelesen|ZIP|beschädigt/i.test(warning))) throw sourceError('EXTRACTION_FAILED', `„${document.originalFileName}“ konnte nicht extrahiert werden.`);
  if ((!outline.searchable || extractedCharacters < 1) && !(document.preparation?.providerFiles || []).some((file) => file.localPath && fs.existsSync(file.localPath))) throw sourceError('EXTRACTION_EMPTY', `Aus „${document.originalFileName}“ konnte kein sicherer Text extrahiert werden. Bildbasierte Dateien benötigen gegebenenfalls OCR.`);
  return { documentId: document.id, fileName: document.originalFileName, documentType: outline.format, searchable: outline.searchable, extractedCharacters, pageOrSlideCount: Number(outline.pageOrSlideCount ?? (outline.sections || []).length), sections: outline.sections || [], warnings: outline.warnings || [], selectedRanges: document.selectedRanges || [] };
}

function calculatePlanningFrame(frame = {}) {
  const errors = [];
  const warnings = [];
  if (!String(frame.targetGroup || '').trim()) errors.push('Zielgruppe ist erforderlich.');
  if (!String(frame.priorKnowledge || '').trim()) errors.push('Vorkenntnisse sind erforderlich.');
  const totalDays = positive(frame.totalDays, 'Anzahl Kurstage', errors);
  const unitsPerDay = positive(frame.unitsPerDay, 'UE pro Tag', errors);
  const unitDurationMinutes = positive(frame.unitDurationMinutes || 45, 'Dauer einer UE', errors);
  const totalUnits = Number(frame.totalUnits || totalDays * unitsPerDay);
  const start = minutes(frame.dailyStartTime);
  const end = minutes(frame.dailyEndTime);
  if (start === null || end === null || start >= end) errors.push('Die tägliche Startzeit muss vor der Endzeit liegen.');
  const breaks = (frame.breaks || []).map((item) => ({ ...item, startMinutes: minutes(item.start), endMinutes: minutes(item.end) }));
  breaks.forEach((item, index) => {
    if (item.startMinutes === null || item.endMinutes === null || item.startMinutes >= item.endMinutes || item.startMinutes < start || item.endMinutes > end) errors.push(`Pause ${index + 1} liegt nicht gültig im Unterrichtszeitraum.`);
  });
  const sorted = [...breaks].sort((a, b) => a.startMinutes - b.startMinutes);
  if (sorted.some((item, index) => index && item.startMinutes < sorted[index - 1].endMinutes)) errors.push('Pausen dürfen sich nicht überschneiden.');
  const grossMinutesPerDay = start !== null && end !== null ? end - start : 0;
  const breakMinutesPerDay = breaks.reduce((sum, item) => sum + Math.max(0, (item.endMinutes || 0) - (item.startMinutes || 0)), 0);
  const netMinutesPerDay = Math.max(0, grossMinutesPerDay - breakMinutesPerDay);
  const possibleUnitsPerDay = unitDurationMinutes ? Math.floor(netMinutesPerDay / unitDurationMinutes) : 0;
  if (possibleUnitsPerDay !== unitsPerDay) warnings.push(`Zeitfenster und Pausen ermöglichen rechnerisch ${possibleUnitsPerDay} statt ${unitsPerDay} UE pro Tag.`);
  const possibleTotalUnits = possibleUnitsPerDay * totalDays;
  if (possibleTotalUnits !== totalUnits) warnings.push(`Aus den Zeitfenstern ergeben sich ${possibleTotalUnits} mögliche UE statt der gewünschten ${totalUnits} UE.`);
  const reservedUnits = ['reservedUnits', 'repetitionUnits', 'projectUnits', 'assessmentUnits', 'bufferUnits'].reduce((sum, key) => sum + Number(frame[key] || 0), 0);
  if (reservedUnits >= totalUnits) errors.push('Reservierte UE müssen kleiner als die Gesamt-UE sein.');
  const actuallyPlannableUnits = totalUnits - reservedUnits;
  if (actuallyPlannableUnits < 1) errors.push('Mindestens eine planbare UE ist erforderlich.');
  return { valid: !errors.length, errors, warnings, totalDays, unitsPerDay, totalUnits, unitDurationMinutes, grossMinutesPerDay, breakMinutesPerDay, netMinutesPerDay, possibleUnitsPerDay, possibleTotalUnits, reservedUnits, actuallyPlannableUnits };
}

function calculateCourseScope(input = {}) {
  const errors = [];
  const targetAudience = normalizeSelection(input.targetAudience ?? input.targetGroup, TARGET_AUDIENCES, 'other_audience');
  const priorKnowledge = normalizeSelection(input.priorKnowledge, PRIOR_KNOWLEDGE, 'other_knowledge');
  validateSelection(targetAudience, TARGET_AUDIENCES, 'Bitte wählen Sie eine Zielgruppe aus.', 'Bitte beschreiben Sie die sonstige Zielgruppe.', errors);
  validateSelection(priorKnowledge, PRIOR_KNOWLEDGE, 'Bitte wählen Sie die vorhandenen Vorkenntnisse aus.', 'Bitte beschreiben Sie die sonstigen Vorkenntnisse.', errors);
  const totalDays = positiveInteger(input.totalDays ?? input.courseDurationDays, 'Kursdauer in Tagen', errors);
  const unitDurationMinutes = positiveInteger(input.unitDurationMinutes || 45, 'Dauer einer UE', errors);
  const unitsPerDay = positiveInteger(input.unitsPerDay, 'Unterrichtseinheiten je Tag', errors);
  const suppliedUnitsByDay = Array.isArray(input.unitsByDay) ? input.unitsByDay.map(Number) : [];
  const unitsByDay = suppliedUnitsByDay.length === totalDays && suppliedUnitsByDay.every((value) => Number.isInteger(value) && value > 0)
    ? suppliedUnitsByDay
    : Array.from({ length: totalDays }, () => unitsPerDay);
  const totalUnits = unitsByDay.reduce((sum, value) => sum + value, 0);
  return { schemaVersion: 1, valid: errors.length === 0, errors, totalDays, unitsPerDay, unitsByDay, totalUnits, unitDurationMinutes, targetAudience, priorKnowledge, actuallyPlannableUnits: totalUnits };
}

const TARGET_AUDIENCES = [
  ['trainees', 'Auszubildende'], ['retrainees', 'Umschülerinnen und Umschüler'], ['career_starters', 'Berufseinsteigerinnen und Berufseinsteiger'],
  ['experienced_professionals', 'Berufserfahrene'], ['career_changers', 'Quereinsteigerinnen und Quereinsteiger'], ['students', 'Studierende'],
  ['school_students', 'Schülerinnen und Schüler'], ['managers', 'Führungskräfte'], ['company_employees', 'Mitarbeitende eines Unternehmens'],
  ['mixed_group', 'Gemischte Lerngruppe'], ['other_audience', 'Sonstige Zielgruppe']
].map(([value, label]) => ({ value, label }));
const PRIOR_KNOWLEDGE = [
  ['none', 'Keine Vorkenntnisse'], ['little', 'Geringe Vorkenntnisse'], ['basic', 'Grundkenntnisse'], ['extended_basic', 'Erweiterte Grundkenntnisse'],
  ['advanced', 'Fortgeschrittene Kenntnisse'], ['mixed', 'Sehr unterschiedliche Vorkenntnisse'], ['unknown', 'Nicht bekannt'], ['other_knowledge', 'Sonstige Vorkenntnisse']
].map(([value, label]) => ({ value, label }));

function normalizeSelection(input, options, otherValue) {
  const rawValue = typeof input === 'object' && input ? String(input.value || '').trim() : String(input || '').trim();
  const customText = typeof input === 'object' && input ? String(input.customText || '').trim() : '';
  const exact = options.find((option) => option.value === rawValue || option.label.toLocaleLowerCase('de') === rawValue.toLocaleLowerCase('de'));
  if (exact) return { ...exact, customText: exact.value === otherValue ? customText : '' };
  return rawValue ? { ...options.find((option) => option.value === otherValue), customText: rawValue } : { value: '', label: '', customText: '' };
}
function validateSelection(selection, options, missingMessage, customMessage, errors) {
  if (!options.some((option) => option.value === selection.value)) errors.push(missingMessage);
  else if (selection.value.startsWith('other_') && !selection.customText) errors.push(customMessage);
}
function selectionText(selection) { return selection?.customText || selection?.label || ''; }

function validateCoursePlan(value = {}, frame = {}, knownDocumentIds = null) {
  const errors = [];
  const warnings = [];
  const days = Array.isArray(value.days) ? value.days : [];
  if (days.length !== Number(frame.totalDays)) errors.push(`Erwartet werden ${frame.totalDays} Kurstage.`);
  days.forEach((day, index) => { if (Number(day.dayNumber) !== index + 1) errors.push(`Kurstage müssen lückenlos nummeriert sein; erwartet ${index + 1}.`); });
  const units = days.flatMap((day) => (day.units || []).map((unit) => ({ ...unit, dayNumber: unit.dayNumber || day.dayNumber })));
  const expectedTotalUnits = Number(frame.totalUnits ?? frame.actuallyPlannableUnits);
  if (units.length !== expectedTotalUnits) errors.push(`Erwartet werden genau ${expectedTotalUnits} UE, erhalten: ${units.length}.`);
  const expectedUnitsByDay = Array.isArray(frame.unitsByDay) && frame.unitsByDay.length === Number(frame.totalDays)
    ? frame.unitsByDay.map(Number)
    : frame.unitsPerDay ? Array.from({ length: Number(frame.totalDays) }, () => Number(frame.unitsPerDay)) : [];
  if (expectedUnitsByDay.length) days.forEach((day, index) => {
    if ((day.units || []).length !== expectedUnitsByDay[index]) errors.push(`Tag ${index + 1}: erwartet ${expectedUnitsByDay[index]} UE, erhalten ${(day.units || []).length}.`);
    (day.units || []).forEach((unit, unitIndex) => { if (Number(unit.unitNumber) !== unitIndex + 1) errors.push(`Tag ${index + 1}: UE-Nummern müssen lückenlos sein; erwartet ${unitIndex + 1}.`); });
  });
  const keys = new Set();
  units.forEach((unit, index) => {
    const key = `${unit.dayNumber}:${unit.unitNumber}`;
    if (keys.has(key)) errors.push(`UE ${key} ist doppelt.`); else keys.add(key);
    if (!String(unit.topic || '').trim()) errors.push(`UE ${index + 1}: Thema fehlt.`);
    if (!String(unit.preliminaryLearningObjective || unit.learningObjective || unit.purpose || '').trim()) errors.push(`UE ${index + 1}: Lernziel oder Zweck fehlt.`);
    if (unit.globalUnitNumber !== undefined && Number(unit.globalUnitNumber) !== index + 1) errors.push(`UE ${index + 1}: globale UE-Nummer muss ${index + 1} sein.`);
    if (unit.difficulty !== undefined && !['introductory', 'basic', 'intermediate', 'advanced'].includes(unit.difficulty)) errors.push(`UE ${index + 1}: ungültige Schwierigkeit.`);
    if (!ORIGIN_STATUSES.has(unit.originStatus)) errors.push(`UE ${index + 1}: ungültige Herkunft.`);
    if (!Array.isArray(unit.sourceReferences)) errors.push(`UE ${index + 1}: Quellenreferenzen fehlen.`);
    if (knownDocumentIds) (unit.sourceReferences || []).forEach((reference) => { if (!knownDocumentIds.has(reference.documentId)) errors.push(`UE ${index + 1}: unbekannte Dokument-ID ${reference.documentId}.`); });
    if (['explicit', 'derived'].includes(unit.originStatus) && !unit.sourceReferences?.length) errors.push(`UE ${index + 1}: belegte Herkunft ohne Quelle.`);
    if (unit.materialRequirements === undefined) unit.materialRequirements = [];
    if (!Array.isArray(unit.materialRequirements)) errors.push(`UE ${index + 1}: materialRequirements muss ein Array sein.`);
  });
  return { status: errors.length ? 'failed' : warnings.length ? 'passed_with_warnings' : 'passed', errors, warnings };
}

function deduplicatePlanSources(plan = {}) {
  return { ...plan, days: (plan.days || []).map((day) => ({ ...day, units: (day.units || []).map((unit) => ({ ...unit, sourceReferences: [...new Map((unit.sourceReferences || []).map((reference) => [`${reference.documentId || ''}|${reference.location || reference.sourceRef || ''}`, reference])).values()] })) })) };
}

function normalizeProject(project, id) {
  const now = new Date().toISOString();
  const normalized = { id: safeId(project?.id || id), title: '', description: '', subjectArea: '', targetGroup: '', priorKnowledge: '', planningFrame: null, structureFrame: null, uploadedDocuments: [], documentAnalyses: [], mergedKnowledgeBase: null, coursePlanDrafts: [], approvedCoursePlan: null, currentPlanningVersion: 0, didacticProfile: null, createdAt: now, updatedAt: now, ...(project || {}) };
  if (!normalized.structureFrame && normalized.planningFrame?.valid) normalized.structureFrame = { ...calculateCourseScope({ targetGroup: normalized.targetGroup || normalized.planningFrame.targetGroup, priorKnowledge: normalized.priorKnowledge || normalized.planningFrame.priorKnowledge, totalDays: normalized.planningFrame.totalDays, unitsPerDay: normalized.planningFrame.unitsPerDay, unitDurationMinutes: normalized.planningFrame.unitDurationMinutes }), confirmed: true };
  else if (normalized.structureFrame) {
    const legacyUnitsByDay = normalized.structureFrame.unitsByDay;
    const calculated = calculateCourseScope({ ...normalized.structureFrame, targetAudience: normalized.structureFrame.targetAudience ?? normalized.structureFrame.targetGroup ?? normalized.targetGroup, priorKnowledge: normalized.structureFrame.priorKnowledge ?? normalized.priorKnowledge });
    normalized.structureFrame = { ...normalized.structureFrame, ...calculated };
    if (!calculated.valid && Array.isArray(legacyUnitsByDay)) normalized.structureFrame.unitsByDay = legacyUnitsByDay;
  }
  normalized.uploadedDocuments = (normalized.uploadedDocuments || []).map(normalizeDocument);
  normalized.documentAnalyses = (normalized.documentAnalyses || []).map((analysis) => ({ ...analysis, ...normalizeDocumentAnalysis(analysis, { documentId: analysis.documentId, documentType: analysis.documentType }).value }));
  if (!normalized.topicReview && normalized.topicCatalog?.topics?.length) normalized.topicReview = createTopicReview(normalized.topicCatalog, latestAnalyses(normalized.documentAnalyses));
  normalized.coursePlanDrafts = (normalized.coursePlanDrafts || []).map((draft) => { const plan = normalizePlanReview(normalizeCanonicalPlan(draft, { ...(draft.structureFrameSnapshot || normalized.structureFrame || {}), courseId: normalized.id, title: normalized.title })); return { ...plan, classbookModel: toClassbookModel(plan) }; });
  if (normalized.approvedCoursePlan) normalized.approvedCoursePlan = normalizeCanonicalPlan(normalized.approvedCoursePlan, { ...(normalized.approvedCoursePlan.structureFrameSnapshot || normalized.structureFrame || {}), courseId: normalized.id, title: normalized.title });
  normalized.pipelinePhases = { ...defaultPipelinePhases(), ...(normalized.pipelinePhases || {}) };
  return normalizeCollaboration(normalized);
}
function normalizeDocument(file = {}, index = 0) { const now = new Date().toISOString(); return { id: file.id || file.documentId || `document-${Date.now()}-${index}`, documentId: file.documentId || file.id || '', projectId: file.projectId || '', originalFileName: file.originalFileName || file.name || '', storedFilePath: file.storedFilePath || '', mimeType: file.mimeType || file.type || '', extension: file.extension || path.extname(file.originalFileName || file.name || '').toLowerCase(), fileSize: Number(file.fileSize || file.size || 0), checksum: file.checksum || '', importedAt: file.importedAt || '', storageVersion: Number(file.storageVersion || 0), declaredCategory: file.declaredCategory || file.sourceCategory || file.sourceType || '', detectedCategory: file.detectedCategory || '', sourcePriority: file.sourcePriority || 'normal', bindingLevel: file.bindingLevel || 'binding', selectedRanges: file.selectedRanges || [{ id: 'entire', rangeType: 'entire_document' }], extractionStatus: file.extractionStatus || 'queued', analysisStatus: file.analysisStatus || (file.excluded ? 'excluded' : 'queued'), analysisVersion: Number(file.analysisVersion || 0), analyzedChecksum: file.analyzedChecksum || '', processingStep: file.processingStep || '', analysisAttempts: Number(file.analysisAttempts || 0), analysisError: file.analysisError || null, lastError: file.lastError || file.analysisError || null, createdAt: file.createdAt || now, updatedAt: now, ...file }; }
function latestAnalyses(items = []) { const map = new Map(); items.forEach((item) => { if (!map.has(item.documentId) || map.get(item.documentId).analysisVersion < item.analysisVersion) map.set(item.documentId, item); }); return [...map.values()]; }
function mergeAnalyses(items = []) { return { analysisVersions: items.map((item) => ({ documentId: item.documentId, analysisVersion: item.analysisVersion })), topics: items.flatMap((item) => item.topics || []), learningObjectives: items.flatMap((item) => item.learningObjectives || []), conflicts: items.flatMap((item) => item.conflicts || []), missingInformation: items.flatMap((item) => item.missingInformation || []), createdAt: new Date().toISOString() }; }
function consolidateTopicCatalog(items = []) {
  const topics = new Map();
  items.forEach((analysis) => (analysis.topics || []).forEach((raw) => {
    const topic = typeof raw === 'string' ? { title: raw } : raw;
    const title = String(topic.title || topic.name || topic.value || '').trim(); if (!title) return;
    const key = title.toLocaleLowerCase('de').replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    const existing = topics.get(key) || { id: `topic-${topics.size + 1}`, title, subtopics: [], prerequisites: [], learningObjectives: [], competencies: [], sourceReferences: [], difficulty: 'basic' };
    existing.subtopics = uniqueValues([...existing.subtopics, ...(topic.subtopics || [])]);
    existing.prerequisites = uniqueValues([...existing.prerequisites, ...(topic.prerequisites || analysis.prerequisites || [])]);
    existing.learningObjectives = uniqueValues([...existing.learningObjectives, ...(analysis.learningObjectives || [])]);
    existing.competencies = uniqueValues([...existing.competencies, ...(analysis.competencies || [])]);
    existing.sourceReferences = deduplicateSourceReferences([...existing.sourceReferences, ...(topic.sourceReferences || analysis.sourceReferences || []).map((reference) => ({ ...reference, documentId: reference.documentId || analysis.documentId }))]);
    existing.difficulty = normalizeDifficulty(topic.difficulty || existing.difficulty);
    topics.set(key, existing);
  }));
  return { schemaVersion: 1, topics: [...topics.values()], conflicts: items.flatMap((item) => item.conflicts || []), unassigned: items.flatMap((item) => item.missingInformation || []), sourceAnalysisVersions: items.map((item) => ({ documentId: item.documentId, analysisVersion: item.analysisVersion })), createdAt: new Date().toISOString() };
}
function createTopicReview(catalog = {}, analyses = [], existing = null) { if (existing?.topics?.length) return existing; return { schemaVersion: 1, status: 'pending', confirmedAt: null, confirmedBy: null, version: 1, sourceAnalysisVersions: analyses.map((item) => ({ documentId: item.documentId, analysisVersion: item.analysisVersion })), topics: cloneSerializable(catalog.topics || []).map((topic) => ({ ...topic, reviewStatus: 'ai_proposal' })), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; }
function buildUeScaffold(frame = {}) {
  if (!frame.valid || !Number.isInteger(Number(frame.totalDays)) || !Number.isInteger(Number(frame.totalUnits))) throw sourceError('UE_SCAFFOLD_INVALID', 'Der bestätigte Kursrahmen ist für ein UE-Gerüst ungültig.');
  const totalDays = Number(frame.totalDays); const totalUnits = Number(frame.totalUnits);
  const unitsByDay = Array.isArray(frame.unitsByDay) && frame.unitsByDay.length === totalDays ? frame.unitsByDay.map(Number) : Array.from({ length: totalDays }, (_, index) => Math.floor(totalUnits / totalDays) + (index < totalUnits % totalDays ? 1 : 0));
  if (unitsByDay.some((value) => !Number.isInteger(value) || value < 0) || unitsByDay.reduce((sum, value) => sum + value, 0) !== totalUnits) throw sourceError('UE_SCAFFOLD_INVALID', 'Die UE-Verteilung stimmt nicht mit der Gesamtzahl überein.');
  let globalUnitNumber = 0;
  return { schemaVersion: 1, totalDays, totalUnits, unitDurationMinutes: Number(frame.unitDurationMinutes), days: unitsByDay.map((count, dayIndex) => ({ dayNumber: dayIndex + 1, units: Array.from({ length: count }, (_, unitIndex) => ({ id: `day-${dayIndex + 1}-unit-${unitIndex + 1}`, dayNumber: dayIndex + 1, unitNumber: unitIndex + 1, globalUnitNumber: ++globalUnitNumber, durationMinutes: Number(frame.unitDurationMinutes), reservedPhase: phaseForUnit(globalUnitNumber, totalUnits, frame) })) })) };
}
function phaseForUnit(number, total, frame) { if (number <= Number(frame.introductionUnits || 0)) return 'introduction'; if (number > total - Number(frame.bufferUnits || 0)) return 'buffer'; return 'development'; }
function normalizeDifficulty(value) { const normalized = String(value || '').toLowerCase(); return ['introductory', 'basic', 'intermediate', 'advanced'].includes(normalized) ? normalized : 'basic'; }
function uniqueValues(values) { return [...new Map(values.filter(Boolean).map((value) => [JSON.stringify(value), value])).values()]; }
function deduplicateSourceReferences(values) { return [...new Map(values.filter((item) => item?.documentId).map((item) => [`${item.documentId}|${item.location || item.sourceRef || item.page || item.section || ''}`, item])).values()]; }
function retainProviderFiles(files = []) { return files.filter((file) => !file.temporary || file.providerFileId).map((file) => file.temporary ? { ...file, localPath: '', temporary: false, cachedRemote: true } : file); }
function setProjectPhase(project, phase, status, details = {}) { const now = new Date().toISOString(); project.pipelinePhases ||= defaultPipelinePhases(); const previous = project.pipelinePhases[phase] || {}; const startedAt = previous.startedAt || (status === 'running' ? now : ''); const terminal = ['completed', 'completed_with_warnings', 'failed', 'timed_out', 'cancelled'].includes(status); project.pipelinePhases[phase] = { ...previous, status, startedAt, endedAt: terminal ? now : '', lastActivityAt: now, progress: Number(details.progress ?? previous.progress ?? 0), retryCount: Number(previous.retryCount || 0) + (details.retry ? 1 : 0), runtimeMs: terminal && startedAt ? Math.max(0, Date.parse(now) - Date.parse(startedAt)) : Number(previous.runtimeMs || 0), errorCode: details.errorCode || '', errorMessage: details.errorMessage || '' }; }
function defaultPipelinePhases() { return Object.fromEntries(['document_preparation', 'document_analysis', 'topic_consolidation', 'ue_scaffold', 'topic_distribution', 'plan_validation'].map((phase) => [phase, { status: 'idle', startedAt: '', endedAt: '', lastActivityAt: '', progress: 0, retryCount: 0, runtimeMs: 0, errorCode: '', errorMessage: '' }])); }
function compactOperation(progress = {}) { return { operationId: progress.operationId, projectId: progress.projectId, kind: progress.kind || 'analysis', status: progress.status, phase: progress.phase, phaseLabel: progress.phaseLabel, step: progress.step, message: progress.message || progress.step, total: progress.total, completed: progress.completed, queued: progress.queued, currentItem: progress.currentItem, totalItems: progress.totalItems || progress.total, currentDocument: progress.currentDocument, currentSegment: progress.currentSegment, totalSegments: progress.totalSegments || progress.segmentTotal, segmentTotal: progress.segmentTotal, segmentCompleted: progress.segmentCompleted, phaseProgress: progress.phaseProgress, overallProgress: progress.overallProgress, warningCount: progress.warningCount, errorCount: progress.errorCount ?? progress.failed, failed: progress.failed, warnings: progress.warnings || [], errors: progress.errors || [], history: progress.history || [], startedAt: progress.startedAt, updatedAt: progress.updatedAt, lastActivityAt: progress.lastActivityAt || progress.updatedAt, elapsedMs: Math.max(0, Date.now() - Date.parse(progress.startedAt || new Date().toISOString())), completedAt: progress.completedAt }; }
function listProjectFiles(rootDir) { try { return fs.readdirSync(rootDir).filter((name) => name.endsWith('.json')).map((name) => path.join(rootDir, name)); } catch { return []; } }
function projectContext(project) {
  return {
    id: project.id,
    courseId: project.id,
    title: project.title,
    courseName: project.title,
    description: project.description,
    subjectArea: project.subjectArea,
    department: project.subjectArea,
    courseGoal: project.courseGoal || '',
    expectedOutcome: project.expectedOutcome || '',
    targetGroup: project.targetGroup,
    priorKnowledge: project.priorKnowledge,
    audienceProfile: cloneSerializable(project.audienceProfile || {}),
    targetAudience: cloneSerializable(project.structureFrame?.targetAudience || {}),
    priorKnowledgeSelection: cloneSerializable(project.structureFrame?.priorKnowledge || {})
  };
}
function cloneSerializable(value) { return JSON.parse(JSON.stringify(value ?? null)); }
function createOperationProgress({ operationId, projectId, kind, phase, phaseLabel, message, totalItems }) {
  const now = new Date().toISOString();
  return { operationId, projectId, kind, status: 'running', phase, phaseLabel, step: message, message, currentItem: 0, totalItems, currentSegment: 0, totalSegments: 0, segmentTotal: 0, segmentCompleted: 0, phaseProgress: 0, overallProgress: 0, total: totalItems, completed: 0, queued: totalItems, inProgress: 0, warningCount: 0, errorCount: 0, failed: 0, warnings: [], errors: [], history: [{ phase, phaseLabel, step: message, at: now }], startedAt: now, updatedAt: now, lastActivityAt: now, elapsedMs: 0, completedAt: null };
}
function updateProgress(progress, status, phase, step, patch = {}) {
  const now = new Date().toISOString(); const nextOverall = Number(patch.overallProgress ?? progress.overallProgress ?? 0);
  Object.assign(progress, patch, { status, phase, phaseLabel: patch.phaseLabel || phaseLabelFor(phase), step, message: step, updatedAt: now, lastActivityAt: now, overallProgress: Math.max(Number(progress.overallProgress || 0), Math.min(status === 'completed' || status === 'completed_with_warnings' ? 1 : 0.999, nextOverall)) });
  progress.totalSegments = progress.segmentTotal; progress.errorCount = progress.failed || progress.errors?.length || 0; progress.elapsedMs = Math.max(0, Date.now() - Date.parse(progress.startedAt));
  const last = progress.history?.[progress.history.length - 1];
  if (!last || last.phase !== phase || last.step !== step) progress.history = [...(progress.history || []), { phase, phaseLabel: progress.phaseLabel, step, at: progress.updatedAt }].slice(-30);
  return progress;
}
function startOperationHeartbeat(operation, persist, intervalMs = OPERATION_HEARTBEAT_INTERVAL_MS) {
  let stopped = false;
  const beat = () => { if (stopped || TERMINAL_OPERATION_STATUSES.has(operation.progress.status)) return; const now = new Date().toISOString(); operation.progress.lastActivityAt = now; operation.progress.elapsedMs = Math.max(0, Date.now() - Date.parse(operation.progress.startedAt)); persist?.(operation); };
  const timer = setInterval(beat, intervalMs); timer.unref?.();
  return () => { if (stopped) return; stopped = true; clearInterval(timer); };
}
function analysisOverallProgress(phase, progress, completedDocuments = 0, currentDocumentProgress = 0) {
  const total = Math.max(1, Number(progress.totalItems || progress.total || 1));
  if (phase === 'source_validation') return 0.05;
  if (phase === 'document_preparation') return Math.min(0.2, 0.1 + ((completedDocuments + currentDocumentProgress) / total) * 0.1);
  if (phase === 'document_analysis') return Math.min(0.8, 0.2 + ((completedDocuments + currentDocumentProgress) / total) * 0.6);
  if (phase === 'topic_consolidation') return 0.82;
  return 0;
}
function phaseLabelFor(phase) { return ({ source_validation: 'Quellen prüfen', document_preparation: 'Dokumente vorbereiten', document_analysis: 'Dokumentinhalte analysieren', topic_consolidation: 'Themen zusammenführen', planning_input: 'Eingabedaten vorbereiten', provider_request: 'Planungsanfrage übermitteln', provider_wait: 'Auf KI-Ergebnis warten', provider_response: 'KI-Antwort empfangen', result_parsing: 'Ergebnis parsen', plan_validation: 'Unterrichtsplan validieren', draft_persistence: 'Planungsversion speichern', project_reload: 'Kursprojekt erneut laden', review_preparation: 'Struktur-Review vorbereiten', completed: 'Abgeschlossen' })[phase] || phase; }
function segmentExtraction(extraction = {}, maxCharacters = 6000, maxSections = 8) {
  const sections = (extraction.sections || []).filter((section) => String(section.content || section.text || '').trim());
  if (!sections.length) return [{ id: 'segment-1', sections: [], sourceReferences: [] }];
  const segments = []; let current = []; let characters = 0;
  const flush = () => { if (!current.length) return; const number = segments.length + 1; segments.push({ id: `segment-${number}`, sections: current, sourceReferences: current.map((section) => section.sourceRef || section.name || section.title || section.type).filter(Boolean) }); current = []; characters = 0; };
  sections.forEach((section) => { const length = String(section.content || section.text || '').length; if (current.length && (characters + length > maxCharacters || current.length >= maxSections)) flush(); current.push(section); characters += length; });
  flush(); return segments;
}
function withPhaseTimeout(promise, timeoutMs, code, message, controller) {
  return new Promise((resolve, reject) => { const timer = setTimeout(() => { controller?.abort(); const error = new Error(message); error.code = code; reject(error); }, timeoutMs); Promise.resolve(promise).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); }); });
}
function stableSnapshot(value) { return JSON.stringify(sortSnapshot(cloneSerializable(value))); }
function sortSnapshot(value) {
  if (Array.isArray(value)) return value.map(sortSnapshot);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortSnapshot(value[key])]));
}
function courseScopeSignature(frame = {}) {
  if (!frame || !Object.keys(frame).length) return '';
  return stableSnapshot({
    totalDays: frame.totalDays,
    unitsPerDay: frame.unitsPerDay,
    unitsByDay: frame.unitsByDay,
    totalUnits: frame.totalUnits,
    unitDurationMinutes: frame.unitDurationMinutes,
    targetAudience: frame.targetAudience,
    priorKnowledge: frame.priorKnowledge,
    audienceProfile: frame.audienceProfile,
    deliveryMode: frame.deliveryMode,
    repetitionUnits: frame.repetitionUnits,
    projectUnits: frame.projectUnits,
    assessmentUnits: frame.assessmentUnits,
    bufferUnits: frame.bufferUnits
  });
}
function safeId(value) { const id = String(value || 'course-project').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''); if (!id) throw new Error('Ungültige Projekt-ID.'); return id; }
function positive(value, label, errors) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) { errors.push(`${label} muss größer als 0 sein.`); return 0; } return number; }
function positiveInteger(value, label, errors) { const number = Number(value); if (!Number.isInteger(number) || number <= 0) { errors.push(`${label} muss eine positive ganze Zahl sein.`); return 0; } return number; }
function minutes(value) { const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '')); if (!match) return null; const result = Number(match[1]) * 60 + Number(match[2]); return result >= 0 && result < 1440 ? result : null; }
function safeError(error) { return String(error?.message || 'Unbekannter Analysefehler').replace(/sk-[A-Za-z0-9_-]+/g, '[geschützt]').replace(/Bearer\s+[^\s]+/gi, 'Bearer [geschützt]').slice(0, 1000); }
function sourceError(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { createCoursePlanningService, extractDocument, segmentExtraction, withPhaseTimeout, consolidateTopicCatalog, buildUeScaffold, deduplicateSourceReferences, calculatePlanningFrame, calculateCourseScope, validateDocumentAnalysis, validateCoursePlan, normalizeProject, createOperationProgress, updateProgress, startOperationHeartbeat, analysisOverallProgress, PLANNING_PROVIDER_TIMEOUT_MS, OPERATION_HEARTBEAT_INTERVAL_MS, TARGET_AUDIENCES, PRIOR_KNOWLEDGE };
