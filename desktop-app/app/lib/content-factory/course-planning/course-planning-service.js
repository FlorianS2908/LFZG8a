const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('../../json-store');
const { readWorkbookXml } = require('../course-plan-parser');
const { extractSourceOutline } = require('../source-extraction/source-extractor-service');
const { normalizeDocumentAnalysis, validateDocumentAnalysis } = require('./document-analysis-schema');

const ORIGIN_STATUSES = new Set(['explicit', 'derived', 'generated', 'conflicting', 'needs_review']);
const TERMINAL_OPERATION_STATUSES = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled']);

function createCoursePlanningService({ factoryDir, aiOrchestrator, logger = console }) {
  const rootDir = path.join(factoryDir, 'course-projects');
  const operations = new Map();
  const ensureStore = () => ensureDir(rootDir);
  const projectPath = (id) => path.join(rootDir, `${safeId(id)}.json`);

  function getProject(id) {
    ensureStore();
    return normalizeProject(readJson(projectPath(id), null), id);
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

  function upsertProject(input = {}) {
    const existing = getProject(input.id);
    return saveProject({ ...existing, ...input, id: safeId(input.id), createdAt: existing.createdAt || new Date().toISOString() });
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
    const sourceDocuments = Array.isArray(input.documents) ? input.documents : project.uploadedDocuments;
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
    const progress = { operationId, projectId: project.id, status: 'preparing', step: 'Dokumente werden vorbereitet', currentDocument: '', total, queued: total, inProgress: 0, completed: 0, warningCount: 0, failed: 0, warnings: [], errors: [], planningVersion: Number(project.currentPlanningVersion || 0) + 1, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null };
    const operationInput = { ...input, retryDocumentId, structureFrameSnapshot: cloneSerializable(project.structureFrame), selectedDocumentIds: selectedDocuments.map((document) => document.id) };
    const operation = { controller, progress, projectId: project.id };
    operations.set(operationId, operation);
    logger.info?.('[DocumentAnalysis]', { event: 'started', operationId, projectId: project.id, documentCount: total });
    operation.promise = runDocumentAnalysis(operationInput, project, provider, controller, progress).catch((error) => {
      progress.status = controller.signal.aborted ? 'cancelled' : 'failed';
      progress.errors.push(safeError(error));
    }).finally(() => {
      progress.inProgress = 0;
      progress.currentDocument = '';
      progress.completedAt = new Date().toISOString();
      logger.info?.('[DocumentAnalysis]', { event: 'finished', operationId, projectId: project.id, status: progress.status, completed: progress.completed, warnings: progress.warningCount, failed: progress.failed });
    });
    return { operationId, status: 'preparing', progress };
  }

  async function runDocumentAnalysis(input, project, provider, controller, progress) {
    progress.status = 'extracting';
    const analyses = [...project.documentAnalyses];
    const existingDocuments = new Map((project.uploadedDocuments || []).map((document) => [document.id, document]));
    const uploadedDocuments = (input.documents || project.uploadedDocuments || []).map((document, index) => normalizeDocument({ ...(existingDocuments.get(document.id) || {}), ...document }, index));
    project.uploadedDocuments = uploadedDocuments;
    const selectedIds = new Set(input.selectedDocumentIds || []);
    for (const [index, document] of uploadedDocuments.filter((item) => selectedIds.has(item.id)).entries()) {
      if (controller.signal.aborted) break;
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
        progress.step = document.processingStep;
        progress.status = 'extracting';
        document.extractionStatus = 'extracting';
        saveProject(project);
        const extraction = extractDocument(document);
        document.extraction = extraction;
        document.extractionStatus = 'extracted';
        document.analysisStatus = 'analyzing';
        document.processingStep = 'Dokument wird durch die KI analysiert';
        progress.step = document.processingStep;
        progress.status = 'analyzing';
        progress.updatedAt = new Date().toISOString();
        const raw = await provider.analyzeDocument({ project: projectContext(project), structureFrame: input.structureFrameSnapshot, document, extraction }, { signal: controller.signal });
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
        document.endedAt = new Date().toISOString();
        if (document.analysisStatus === 'analyzed_with_warnings') progress.warningCount += 1;
        else progress.completed += 1;
        saveProject({ ...project, documentAnalyses: analyses });
      } catch (error) {
        if (controller.signal.aborted) {
          document.analysisStatus = 'cancelled';
        } else {
          if (document.extractionStatus !== 'extracted') document.extractionStatus = 'failed';
          document.analysisStatus = 'failed';
          document.analysisError = { message: safeError(error), code: error.code || 'DOCUMENT_ANALYSIS_FAILED', step: document.processingStep, field: error.field || '', expected: error.expected || '', received: error.received || '' };
          progress.failed += 1;
          progress.errors.push({ documentId: document.id, fileName: document.originalFileName, ...document.analysisError });
          logger.error?.('[DocumentAnalysis]', { event: 'document_failed', operationId: progress.operationId, projectId: project.id, documentId: document.id, step: document.processingStep, message: safeError(error) });
        }
        document.endedAt = new Date().toISOString();
        saveProject({ ...project, documentAnalyses: analyses, uploadedDocuments });
      }
      progress.inProgress = 0;
    }
    project.documentAnalyses = analyses;
    project.uploadedDocuments = uploadedDocuments;
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
    progress.step = 'Ergebnisse werden zusammengeführt';
    project.mergedKnowledgeBase = mergeAnalyses(successful);
    saveProject(project);
    progress.step = 'Tage und Unterrichtseinheiten werden geplant';
    progress.status = 'planning';
    await generateCoursePlan({ projectId: project.id, signal: controller.signal });
    progress.step = 'Kursstruktur wird validiert';
    progress.status = 'validating';
    progress.status = progress.failed || progress.warningCount ? 'completed_with_warnings' : 'completed';
    progress.step = 'Review wird vorbereitet';
  }

  function getAnalysisProgress(operationId) {
    return operations.get(operationId)?.progress || { operationId, status: 'not_found' };
  }

  function cancelAiOperation(operationId) {
    const operation = operations.get(operationId);
    if (!operation) return { cancelled: false };
    operation.controller.abort();
    operation.progress.status = 'cancelled';
    operation.progress.completedAt = new Date().toISOString();
    return { cancelled: true, operationId };
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
    const structureFrame = calculateCourseScope(input);
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
      documentAnalyses: analyses, mergedKnowledgeBase: project.mergedKnowledgeBase,
      bindingTopics: input.bindingTopics || [], excludedTopics: input.excludedTopics || []
    };
    let raw = await provider.generateStructuredCoursePlan(planningInput, { signal: input.signal });
    let validation = validateCoursePlan(raw, structureFrame);
    if (validation.status === 'failed') {
      raw = await provider.generateStructuredCoursePlan({ ...planningInput, repairAttempt: 1, validationErrors: validation.errors }, { signal: input.signal });
      validation = validateCoursePlan(raw, structureFrame);
    }
    if (validation.status === 'failed') {
      const error = new Error(`Die KI-Kursstruktur passt auch nach einem Reparaturversuch nicht zum bestätigten Kursrahmen: ${validation.errors.join(' | ')}`);
      error.code = 'COURSE_PLAN_VALIDATION';
      throw error;
    }
    const now = new Date().toISOString();
    const draft = {
      ...raw, id: `course-plan-${project.id}-${planningVersion}`, planningVersion,
      status: 'draft', validation,
      sourceAnalysisVersions: analyses.map((item) => ({ documentId: item.documentId, analysisVersion: item.analysisVersion })),
      structureFrameSnapshot: structureFrame, provider: provider.name, model: provider.model,
      promptVersion: 'course-plan-v1', createdAt: now, updatedAt: now
    };
    project.coursePlanDrafts.push(draft);
    project.currentPlanningVersion = planningVersion;
    return saveProject(project);
  }

  function saveCoursePlanDraft(projectId, draft = {}) {
    const project = getProject(projectId);
    if (project.approvedCoursePlan?.planningVersion === draft.planningVersion) throw new Error('Eine freigegebene Kursstruktur darf nicht überschrieben werden.');
    const validation = validateCoursePlan(draft, draft.structureFrameSnapshot || project.structureFrame);
    const updated = { ...draft, validation, status: validation.status === 'failed' ? 'needs_review' : 'draft', updatedAt: new Date().toISOString() };
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
    const validation = validateCoursePlan(draft, draft.structureFrameSnapshot || project.structureFrame);
    if (validation.status === 'failed') throw new Error('Die Kursstruktur enthält blockierende Validierungsfehler.');
    if (project.uploadedDocuments.some((document) => document.bindingLevel === 'binding' && document.analysisStatus === 'failed' && !document.failureAcknowledged)) throw new Error('Verbindliche fehlgeschlagene Dokumente müssen erneut analysiert oder ausdrücklich als Ausnahme bestätigt werden.');
    if ((draft.conflicts || []).some((item) => item.blocking && !item.confirmed)) throw new Error('Blockierende Konflikte müssen bearbeitet oder bestätigt werden.');
    const approved = { ...draft, status: 'approved', validation, approvedAt: new Date().toISOString() };
    project.coursePlanDrafts = project.coursePlanDrafts.map((item) => item.id === approved.id ? approved : item);
    project.approvedCoursePlan = approved;
    return saveProject(project);
  }

  return { getProject, listProjects, upsertProject, startDocumentAnalysis, getAnalysisProgress, cancelAiOperation, savePlanningFrame, saveCourseScope, generateCoursePlan, saveCoursePlanDraft, acknowledgeDocumentFailure, approveCoursePlan };
}

function analysisInputError(message) { const error = new Error(message); error.code = 'DOCUMENT_ANALYSIS_INPUT'; return error; }

function extractDocument(document) {
  const extension = path.extname(document.originalFileName || document.storedFilePath || '').toLowerCase();
  if (['.xlsx', '.xlsm'].includes(extension)) {
    if (!document.storedFilePath || !fs.existsSync(document.storedFilePath)) throw new Error(`Datei kann nicht gelesen werden: ${document.originalFileName}`);
    const workbook = readWorkbookXml(document.storedFilePath);
    const sections = workbook.sheets.map((sheet) => ({
      type: 'sheet', name: sheet.name, hidden: Boolean(sheet.hidden),
      content: sheet.rows.slice(0, 500).map((row, index) => `${index + 1}: ${row.filter(Boolean).join(' | ')}`).filter((line) => !/:\s*$/.test(line)).join('\n').slice(0, 30000),
      locations: sheet.rows.slice(0, 500).map((row, index) => ({ row: index + 1, usedColumns: row.filter(Boolean).length }))
    })).filter((section) => section.content);
    return { documentId: document.id, fileName: document.originalFileName, documentType: 'spreadsheet', sections, warnings: ['Makros wurden nicht ausgeführt.'] };
  }
  const outline = extractSourceOutline({ name: document.originalFileName, path: document.storedFilePath });
  const extractedCharacters = Number(outline.quality?.extractedCharacters || 0);
  if (!outline.searchable || extractedCharacters < 1) throw new Error(`Datei kann nicht vollständig analysiert werden, weil kein sicher extrahierter Text verfügbar ist: ${document.originalFileName}`);
  return { documentId: document.id, fileName: document.originalFileName, documentType: outline.format, sections: outline.sections || [], warnings: outline.warnings || [] };
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
  const totalUnits = totalDays * unitsPerDay;
  return { schemaVersion: 1, valid: errors.length === 0, errors, totalDays, unitsPerDay, totalUnits, unitDurationMinutes, targetAudience, priorKnowledge, actuallyPlannableUnits: totalUnits };
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

function validateCoursePlan(value = {}, frame = {}) {
  const errors = [];
  const warnings = [];
  const days = Array.isArray(value.days) ? value.days : [];
  if (days.length !== Number(frame.totalDays)) errors.push(`Erwartet werden ${frame.totalDays} Kurstage.`);
  const units = days.flatMap((day) => (day.units || []).map((unit) => ({ ...unit, dayNumber: unit.dayNumber || day.dayNumber })));
  const expectedTotalUnits = Number(frame.totalUnits ?? frame.actuallyPlannableUnits);
  if (units.length !== expectedTotalUnits) errors.push(`Erwartet werden genau ${expectedTotalUnits} UE, erhalten: ${units.length}.`);
  const expectedUnitsByDay = Array.isArray(frame.unitsByDay) && frame.unitsByDay.length === Number(frame.totalDays)
    ? frame.unitsByDay.map(Number)
    : frame.unitsPerDay ? Array.from({ length: Number(frame.totalDays) }, () => Number(frame.unitsPerDay)) : [];
  if (expectedUnitsByDay.length) days.forEach((day, index) => {
    if ((day.units || []).length !== expectedUnitsByDay[index]) errors.push(`Tag ${index + 1}: erwartet ${expectedUnitsByDay[index]} UE, erhalten ${(day.units || []).length}.`);
  });
  const keys = new Set();
  units.forEach((unit, index) => {
    const key = `${unit.dayNumber}:${unit.unitNumber}`;
    if (keys.has(key)) errors.push(`UE ${key} ist doppelt.`); else keys.add(key);
    if (!ORIGIN_STATUSES.has(unit.originStatus)) errors.push(`UE ${index + 1}: ungültige Herkunft.`);
    if (!Array.isArray(unit.sourceReferences)) errors.push(`UE ${index + 1}: Quellenreferenzen fehlen.`);
    if (['explicit', 'derived'].includes(unit.originStatus) && !unit.sourceReferences?.length) errors.push(`UE ${index + 1}: belegte Herkunft ohne Quelle.`);
    if (unit.materialRequirements === undefined) unit.materialRequirements = [];
    if (!Array.isArray(unit.materialRequirements)) errors.push(`UE ${index + 1}: materialRequirements muss ein Array sein.`);
  });
  return { status: errors.length ? 'failed' : warnings.length ? 'passed_with_warnings' : 'passed', errors, warnings };
}

function normalizeProject(project, id) {
  const now = new Date().toISOString();
  const normalized = { id: safeId(project?.id || id), title: '', description: '', subjectArea: '', targetGroup: '', priorKnowledge: '', planningFrame: null, structureFrame: null, uploadedDocuments: [], documentAnalyses: [], mergedKnowledgeBase: null, coursePlanDrafts: [], approvedCoursePlan: null, currentPlanningVersion: 0, didacticProfile: null, createdAt: now, updatedAt: now, ...(project || {}) };
  if (!normalized.structureFrame && normalized.planningFrame?.valid) normalized.structureFrame = { ...calculateCourseScope({ targetGroup: normalized.targetGroup || normalized.planningFrame.targetGroup, priorKnowledge: normalized.priorKnowledge || normalized.planningFrame.priorKnowledge, totalDays: normalized.planningFrame.totalDays, unitsPerDay: normalized.planningFrame.unitsPerDay, unitDurationMinutes: normalized.planningFrame.unitDurationMinutes }), confirmed: true };
  else if (normalized.structureFrame) normalized.structureFrame = { ...normalized.structureFrame, ...calculateCourseScope({ ...normalized.structureFrame, targetAudience: normalized.structureFrame.targetAudience ?? normalized.structureFrame.targetGroup ?? normalized.targetGroup, priorKnowledge: normalized.structureFrame.priorKnowledge ?? normalized.priorKnowledge }) };
  normalized.uploadedDocuments = (normalized.uploadedDocuments || []).map(normalizeDocument);
  normalized.documentAnalyses = (normalized.documentAnalyses || []).map((analysis) => ({ ...analysis, ...normalizeDocumentAnalysis(analysis, { documentId: analysis.documentId, documentType: analysis.documentType }).value }));
  return normalized;
}
function normalizeDocument(file = {}, index = 0) { const now = new Date().toISOString(); return { id: file.id || `document-${Date.now()}-${index}`, originalFileName: file.originalFileName || file.name || '', storedFilePath: file.storedFilePath || file.path || '', mimeType: file.mimeType || file.type || '', fileSize: Number(file.fileSize || file.size || 0), declaredCategory: file.declaredCategory || file.sourceType || '', detectedCategory: file.detectedCategory || '', sourcePriority: file.sourcePriority || 'normal', bindingLevel: file.bindingLevel || 'binding', selectedRanges: file.selectedRanges || [{ id: 'entire', rangeType: 'entire_document' }], extractionStatus: file.extractionStatus || 'queued', analysisStatus: file.analysisStatus || (file.excluded ? 'excluded' : 'queued'), processingStep: file.processingStep || '', analysisAttempts: Number(file.analysisAttempts || 0), analysisError: file.analysisError || null, createdAt: file.createdAt || now, updatedAt: now, ...file }; }
function latestAnalyses(items = []) { const map = new Map(); items.forEach((item) => { if (!map.has(item.documentId) || map.get(item.documentId).analysisVersion < item.analysisVersion) map.set(item.documentId, item); }); return [...map.values()]; }
function mergeAnalyses(items = []) { return { analysisVersions: items.map((item) => ({ documentId: item.documentId, analysisVersion: item.analysisVersion })), topics: items.flatMap((item) => item.topics || []), learningObjectives: items.flatMap((item) => item.learningObjectives || []), conflicts: items.flatMap((item) => item.conflicts || []), missingInformation: items.flatMap((item) => item.missingInformation || []), createdAt: new Date().toISOString() }; }
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

module.exports = { createCoursePlanningService, extractDocument, calculatePlanningFrame, calculateCourseScope, validateDocumentAnalysis, validateCoursePlan, normalizeProject, TARGET_AUDIENCES, PRIOR_KNOWLEDGE };
