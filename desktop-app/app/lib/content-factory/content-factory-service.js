const path = require('path');
const { readJson, writeJson, ensureDir } = require('../json-store');
const { importFiles } = require('./import-adapters');
const { applyMapping, validateMappings } = require('./mapping-service');
const { createManifest, cloneManifestForDuplicate } = require('./manifest-service');
const { createContainerStorageService } = require('./container-storage-service');
const { targetAreas, targetAreaLabels } = require('./target-areas');
const { createReferenceLibraryService } = require('./reference-library/reference-library-service');
const { validateNoReferenceExport } = require('./reference-library/reference-safety-service');
const { stageUploadFiles } = require('./upload-staging-service');
const { parseCoursePlan } = require('./course-plan-parser');
const { AiOrchestrator } = require('./ai/ai-orchestrator');
const { createAiKeyStoreService } = require('./ai/ai-key-store-service');
const { createPlanContainerDraft } = require('./plan-container-draft-service');
const { validateGeneratedContainer } = require('./generated-container-validator');
const { createCurriculumPlannerService } = require('./curriculum-planner/curriculum-planner-service');
const { runPreflight } = require('./preflight/preflight-service');
const { listPresets, applyPreset } = require('./presets/preset-service');
const { createCleanupService } = require('./cleanup/cleanup-service');
const { buildPrompt, runPromptQualityGate } = require('./ai-quality-gate/ai-quality-gate-service');
const { estimateContentFactoryCost } = require('./ai/cost-estimator');
const { summarizeGoldenPromptTests } = require('./ai/prompts/golden-tests/golden-test-runner');
const { listDidacticProfiles, applyDidacticProfile, suggestDidacticProfile, recommendDidacticProfiles } = require('./didactics/didactic-profile-service');
const { evaluateDidacticFit, evaluateAllDidacticFits } = require('./didactics/didactic-fit-service');
const { createDidacticPreview } = require('./didactics/didactic-preview-service');
const { createCoursePlanningService } = require('./course-planning/course-planning-service');
const { createSafeLogger } = require('../safe-logger');

function cloneItems(items, include, transform = (item) => item) {
  return include ? (items || []).map((item) => transform({ ...item })) : [];
}

function createContentFactoryService({ appData, projectRoot = process.cwd(), safeStorage, migrationPath, coursePlanningAiOrchestrator = null }) {
  const factoryDir = path.join(appData.dataDir, 'content-factory');
  const batchesPath = path.join(factoryDir, 'import-batches.json');
  const storage = createContainerStorageService({
    dataDir: appData.dataDir,
    staticContainers: []
  });
  const referenceLibrary = createReferenceLibraryService({ appData });
  const aiKeyStore = createAiKeyStoreService({ appData, safeStorage, migrationPath });
  const aiOrchestrator = new AiOrchestrator({ projectRoot, aiKeyStore });
  const curriculumPlanner = createCurriculumPlannerService({ factoryDir, aiOrchestrator });
  const coursePlanning = createCoursePlanningService({ factoryDir, aiOrchestrator: coursePlanningAiOrchestrator || aiOrchestrator, logger: createSafeLogger({ logPath: path.join(factoryDir, 'logs', 'course-planning.jsonl') }) });
  const cleanup = createCleanupService({ factoryDir, storage });

  function ensureFactory() {
    appData.ensureDataFiles();
    ensureDir(factoryDir);
    storage.ensureStorage();
    referenceLibrary.ensureLibrary();
    curriculumPlanner.ensurePlanner();
    if (!readJson(batchesPath, null)) {
      writeJson(batchesPath, []);
    }
  }

  function listImportBatches() {
    ensureFactory();
    return readJson(batchesPath, []);
  }

  function saveImportBatch(batch) {
    ensureFactory();
    writeJson(batchesPath, [
      batch,
      ...listImportBatches().filter((entry) => entry.id !== batch.id)
    ]);
    return batch;
  }

  function getImportBatch(batchId) {
    return listImportBatches().find((batch) => batch.id === batchId) || null;
  }

  function assertAdmin() {
    // Die Standalone-ContentFactory besitzt bewusst keine Konten oder Rollen.
    return true;
  }

  function getState(session) {
    assertAdmin(session);
    ensureFactory();
    return {
      containers: storage.listContainers(),
      generatedContainers: storage.listGeneratedContainers(),
      importBatches: listImportBatches(),
      referenceLibraryRoot: referenceLibrary.rootDir,
      referenceSources: referenceLibrary.listReferenceSources(),
      curriculumDrafts: curriculumPlanner.listCurriculumDrafts(),
      courseProjects: coursePlanning.listProjects(),
      presets: listPresets(),
      didacticProfiles: listDidacticProfiles(),
      storageUsage: cleanup.listStorageUsage(),
      targetAreas,
      targetAreaLabels
    };
  }

  function parseCoursePlanUpload(input, session) {
    assertAdmin(session);
    ensureFactory();
    const file = (input.files || [])[0] || input;
    return parseCoursePlan(file.path || file.sourcePath, {
      fileName: file.name || file.originalFilename,
      selectedSheet: input.selectedSheet,
      courseTitle: input.courseTitle
    });
  }

  function getAiProviderStatus(session) {
    assertAdmin(session);
    const status = aiOrchestrator.getStatus();
    const adminStatus = aiKeyStore.getAiProviderSafeStatus();
    return {
      ...status,
      adminKeyStore: adminStatus,
      providers: {
        ...status.providers,
        openai: {
          ...status.providers.openai,
          connectionTestStatus: adminStatus.connectionTestStatus
        }
      }
    };
  }

  async function testOpenAiConnection(session) {
    assertAdmin(session);
    const current = aiOrchestrator.getStatus();
    const result = current.providers.openai.keySource === 'admin-key-store'
      ? await aiKeyStore.testOpenAiConnection(session, { timeoutMs: current.timeoutMs })
      : await aiOrchestrator.testOpenAiConnection();
    return {
      status: result.status,
      provider: result.provider || 'openai',
      model: result.model || aiOrchestrator.getStatus().providers.openai.model,
      keySource: result.keySource || aiOrchestrator.getStatus().providers.openai.keySource,
      errorCategory: result.errorCategory || '',
      message: result.message || (result.status === 'success' ? 'OpenAI-Verbindung erfolgreich.' : 'OpenAI-Verbindung konnte nicht bestaetigt werden.')
    };
  }

  function importOpenAiKeyFromTxt(filePath, session, options) {
    assertAdmin(session);
    const result = aiKeyStore.importOpenAiKeyFromTxt(filePath, session, options);
    aiOrchestrator.refreshOpenAiProvider();
    return result;
  }

  function importOpenAiKeyFromDefaultPath(session) { return aiKeyStore.importMigrationKeyOnce(session); }

  function replaceOpenAiKey(value, session) {
    assertAdmin(session);
    const result = aiKeyStore.replaceOpenAiKey(value, session);
    aiOrchestrator.refreshOpenAiProvider();
    return result;
  }

  function clearOpenAiKey(session) {
    assertAdmin(session);
    const result = aiKeyStore.clearOpenAiKey(session);
    aiOrchestrator.refreshOpenAiProvider();
    return result;
  }

  function updateAiModel(model, session) {
    assertAdmin(session);
    const result = aiKeyStore.updateAiModel(model, session);
    aiOrchestrator.refreshOpenAiProvider();
    return result;
  }

  async function generateDayDraft(input, session) {
    assertAdmin(session);
    ensureFactory();
    const curriculumPlan = input.approvedCurriculumPlan || input.curriculumPlan;
    if (!curriculumPlan || curriculumPlan.status !== 'approved') {
      throw new Error('Tagesentwurf ist erst nach Freigabe des Curriculum-Plans moeglich.');
    }
    const dayTopic = input.day?.mainTopic || input.title || '';
    const referenceSearch = input.useReferences
      ? referenceLibrary.searchReferences({ dayTopic, query: dayTopic, maxResults: 5 })
      : { results: [] };
    const referenceContext = (referenceSearch.results || []).map((result) => ({
      referenceId: result.referenceId,
      title: result.title,
      author: result.author,
      sectionTitle: result.sectionTitle,
      pageNumber: result.pageNumber,
      summary: result.generatedSummary,
      sourceRef: result.sourceRef
    }));
    return aiOrchestrator.generateDayDraft({
      ...input,
      curriculumPlan,
      targetAudience: curriculumPlan.targetAudience || input.targetAudience,
      difficultyMode: curriculumPlan.targetAudience?.difficultyMode,
      didacticStyle: curriculumPlan.didacticStyle,
      didacticProfile: input.didacticProfile || curriculumPlan.didacticProfile,
      expectedOutcome: curriculumPlan.expectedOutcome,
      referenceContext
    }, input.aiMode || 'local');
  }

  async function generateAllDayDrafts(input, session) {
    assertAdmin(session);
    ensureFactory();
    const curriculumPlan = input.approvedCurriculumPlan || input.curriculumPlan;
    if (!curriculumPlan || curriculumPlan.status !== 'approved') {
      throw new Error('Alle-Tage-Generierung ist erst nach Freigabe des Curriculum-Plans moeglich.');
    }
    const results = [];
    for (const day of curriculumPlan.days || []) {
      const dayTopic = day.mainTopic || day.title || '';
      const referenceSearch = input.useReferences
        ? referenceLibrary.searchReferences({ dayTopic, query: dayTopic, maxResults: 5 })
        : { results: [] };
      const referenceContext = (referenceSearch.results || []).map((result) => ({
        referenceId: result.referenceId,
        title: result.title,
        author: result.author,
        sectionTitle: result.sectionTitle,
        pageNumber: result.pageNumber,
        summary: result.generatedSummary,
        sourceRef: result.sourceRef
      }));
      const courseDay = input.coursePlan?.days?.find((item) => item.dayNumber === day.dayNumber) || day;
      try {
        const result = await aiOrchestrator.generateDayDraft({
          ...input,
          day: courseDay,
          dayNumber: day.dayNumber,
          title: day.title,
          curriculumPlan,
          didacticProfile: input.didacticProfile || curriculumPlan.didacticProfile,
          referenceContext
        }, input.aiMode || 'local');
        result.progress = `Tag ${day.dayNumber}/${curriculumPlan.days.length} erzeugt`;
        results.push(result);
      } catch (error) {
        const fallback = await aiOrchestrator.generateDayDraft({
          ...input,
          aiMode: 'local',
          day: courseDay,
          dayNumber: day.dayNumber,
          title: day.title,
          curriculumPlan,
          didacticProfile: input.didacticProfile || curriculumPlan.didacticProfile,
          referenceContext: []
        }, 'local');
        fallback.warnings.push(`Fallback fuer Tag ${day.dayNumber}: ${error.message}`);
        results.push(fallback);
      }
    }
    return results;
  }

  async function reviseDayDraft(input, session) {
    assertAdmin(session);
    ensureFactory();
    const curriculumPlan = input.approvedCurriculumPlan || input.curriculumPlan;
    if (!curriculumPlan || curriculumPlan.status !== 'approved') {
      throw new Error('Revision ist erst nach Freigabe des Curriculum-Plans moeglich.');
    }
    return aiOrchestrator.reviseDayDraft({
      ...input,
      curriculumPlan,
      didacticProfile: input.didacticProfile || curriculumPlan.didacticProfile
    }, input.aiMode || 'local');
  }

  function createPlanDraft(input, session) {
    assertAdmin(session);
    ensureFactory();
    const curriculumPlan = input.approvedCurriculumPlan || input.curriculumPlan;
    if (!curriculumPlan || curriculumPlan.status !== 'approved') {
      throw new Error('Container-Draft ist erst nach Freigabe des Curriculum-Plans moeglich.');
    }
    const aiStatus = aiOrchestrator.getStatus();
    const costEstimate = input.costEstimate || estimateContentFactoryCost(input, {
      model: aiStatus.providers.openai.model,
      warningLimitUsd: aiStatus.costWarningUsd
    });
    const draft = createPlanContainerDraft({
      ...input,
      costEstimate,
      aiConfig: {
        aiProvider: aiStatus.defaultProvider,
        openAiConfigured: aiStatus.providers.openai.configured,
        openAiModel: aiStatus.providers.openai.model,
        keySource: aiStatus.providers.openai.keySource,
        timeoutMs: aiStatus.timeoutMs,
        costWarningUsd: aiStatus.costWarningUsd
      }
    }, { factoryDir });
    const generated = storage.listGeneratedContainers();
    writeJson(storage.indexPath, [
      {
        id: draft.containerId,
        generated: true,
        status: 'draft',
        storagePath: draft.storagePath,
        manifest: readJson(path.join(draft.storagePath, 'manifest.json'), {}),
        analysisReport: draft.analysisReport
      },
      ...generated.filter((entry) => entry.manifest?.id !== draft.containerId)
    ]);
    return draft;
  }

  function validatePlanDraft(containerId, session) {
    assertAdmin(session);
    const draft = storage.listGeneratedContainers().find((entry) => entry.id === containerId || entry.manifest?.id === containerId);
    if (!draft?.storagePath) throw new Error('Draft-Container wurde nicht gefunden.');
    return validateGeneratedContainer(draft.storagePath, draft.manifest || {});
  }

  function runContentFactoryPreflight(input, session) {
    assertAdmin(session);
    ensureFactory();
    const aiStatus = aiOrchestrator.getStatus();
    const costEstimate = estimateContentFactoryCost(input, {
      model: aiStatus.providers.openai.model,
      warningLimitUsd: aiStatus.costWarningUsd
    });
    return runPreflight({ ...input, costEstimate }, { aiStatus });
  }

  function previewPromptQuality(input, session) {
    assertAdmin(session);
    ensureFactory();
    const promptInput = buildPrompt(input.purpose || 'generateDayDraft', input);
    const quality = runPromptQualityGate(promptInput);
    return {
      purpose: promptInput.purpose,
      promptId: quality.promptId,
      promptVersion: quality.promptVersion,
      expectedSchema: promptInput.expectedSchema,
      contract: promptInput.contract,
      provider: String(input.aiMode || 'local').startsWith('openai') ? 'openai' : 'local',
      model: String(input.aiMode || 'local').startsWith('openai') ? aiOrchestrator.getStatus().providers.openai.model || '' : 'LocalHeuristicProvider',
      status: quality.status,
      score: quality.score,
      evaluation: quality.evaluation,
      completenessScore: quality.completenessScore,
      didacticScore: quality.didacticScore,
      safetyScore: quality.safetyScore,
      schemaScore: quality.schemaScore,
      artifactScore: quality.artifactScore,
      totalScore: quality.totalScore,
      level: quality.level,
      warnings: quality.warnings,
      errors: quality.errors,
      maySendToProvider: quality.maySendToProvider,
      checks: quality.checks.map((check) => ({ id: check.id, label: check.label, status: check.status, message: check.message })),
      rules: promptInput.prompt.rules
    };
  }

  function runPromptGoldenTests(session) {
    assertAdmin(session);
    return summarizeGoldenPromptTests();
  }

  async function runContentFactoryTestDraft(input, session) {
    assertAdmin(session);
    ensureFactory();
    const preflight = runContentFactoryPreflight(input, session);
    if (preflight.status === 'red') {
      return {
        status: 'failed',
        preflight,
        validation: { isValid: false, errors: preflight.errors, warnings: preflight.warnings, suggestions: preflight.recommendations },
        warnings: preflight.warnings,
        errors: preflight.errors
      };
    }
    if (preflight.status === 'yellow' && input.confirmWarnings !== true) {
      return {
        status: 'warning',
        requiresConfirmation: true,
        preflight,
        validation: { isValid: false, errors: [], warnings: preflight.warnings, suggestions: preflight.recommendations },
        warnings: preflight.warnings
      };
    }
    const curriculumPlan = input.approvedCurriculumPlan || input.curriculumPlan;
    const dayResults = input.dayResults?.length
      ? input.dayResults
      : await generateAllDayDrafts({ ...input, approvedCurriculumPlan: curriculumPlan }, session);
    const draft = createPlanDraft({
      ...input,
      approvedCurriculumPlan: curriculumPlan,
      dayResults,
      preflight,
      testRun: true
    }, session);
    const warnings = Array.from(new Set([...(preflight.warnings || []), ...(draft.validation?.warnings || [])]));
    return {
      status: draft.validation?.isValid ? (preflight.status === 'yellow' ? 'warning' : 'success') : 'failed',
      preflight,
      containerId: draft.containerId,
      storagePath: draft.storagePath,
      standalonePath: draft.standalonePath,
      reportPath: draft.reportPath,
      testProtocolPath: draft.testProtocolPath,
      testProtocol: draft.testProtocol,
      analysisReport: draft.analysisReport,
      validation: draft.validation,
      warnings,
      errors: draft.validation?.errors || []
    };
  }

  function validateContainerDraft(container) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    const manifest = container?.manifest || {};

    if (!manifest.name) errors.push('Containername fehlt.');
    if (!manifest.id) errors.push('Container-ID fehlt.');
    if (manifest.id && storage.listContainers().some((entry) => entry.manifest?.id === manifest.id && entry.manifest?.id !== container.id)) {
      errors.push(`Container-ID existiert bereits: ${manifest.id}`);
    }
    if (!manifest.route) errors.push('Route fehlt.');
    if (manifest.route && storage.routeExists?.(manifest.route, manifest.id)) errors.push(`Route existiert bereits: ${manifest.route}`);
    if (!manifest.containerType) errors.push('Container-Typ fehlt.');

    const contentCount = ['routes', 'materials', 'assets', 'tasks', 'solutions', 'quizzes']
      .reduce((sum, key) => sum + (container[key] || []).length, 0);
    if (contentCount === 0) errors.push('Mindestens ein Inhalt muss vorhanden sein.');
    if (!(container.routes || []).length) warnings.push('Keine Haupt-Webvariante oder Route vorhanden.');
    errors.push(...validateNoReferenceExport({
      files: [
        ...(container.materials || []).map((item) => ({ path: item.sourcePath || item.targetPath || '', content: JSON.stringify(item) })),
        ...(container.assets || []).map((item) => ({ path: item.sourcePath || item.targetPath || '', content: JSON.stringify(item) })),
        ...(container.tasks || []).map((item) => ({ path: item.sourcePath || '', content: JSON.stringify(item) })),
        ...(container.solutions || []).map((item) => ({ path: item.sourcePath || '', content: JSON.stringify(item) })),
        ...(container.quizzes || []).map((item) => ({ path: item.sourcePath || '', content: JSON.stringify(item) }))
      ]
    }));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  function duplicateContainer(options, session, now = new Date()) {
    assertAdmin(session);
    ensureFactory();
    const source = storage.loadContainer(options.sourceContainerId);
    if (!source) {
      throw new Error('Quellcontainer wurde nicht gefunden.');
    }
    const newId = storage.ensureUniqueContainerId(options.newId || options.newName || `${source.manifest.id}-kopie`);
    const manifest = cloneManifestForDuplicate(source.manifest, {
      ...options,
      newId,
      createdBy: session.user.email || session.user.id
    }, now);

    storage.ensureUniqueRoute(manifest.route);
    const container = {
      id: newId,
      manifest,
      status: 'draft',
      sourceContainerId: source.manifest.id,
      copyMode: options.copyMode || 'reference',
      protected: false,
      routes: cloneItems(source.routes, options.includeRoutes !== false, (route) => ({
        ...route,
        id: `${newId}-${route.id}`,
        path: route.path === source.manifest.route ? manifest.route : route.path,
        order: route.order
      })),
      materials: cloneItems(source.materials, options.includeMaterials !== false),
      assets: cloneItems(source.assets, options.includeAssets !== false),
      tasks: cloneItems(source.tasks, options.includeTasks !== false),
      solutions: cloneItems(source.solutions, options.includeSolutions !== false),
      quizzes: cloneItems(source.quizzes, options.includeQuizzes !== false),
      validation: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    container.validation = validateContainerDraft(container);
    return storage.saveContainer(container);
  }

  function createImportBatch(input, session, now = new Date()) {
    assertAdmin(session);
    ensureFactory();
    const batchId = `batch-${now.getTime()}`;
    const staged = stageUploadFiles(input.files || [], {
      factoryDir,
      batchId,
      now
    });
    const files = importFiles(staged.files || [], now);
    const duplicateHashes = files.reduce((map, file) => {
      if (file.sha256) map[file.sha256] = (map[file.sha256] || 0) + 1;
      return map;
    }, {});
    const enrichedFiles = files.map((file) => ({
      ...file,
      duplicate: Boolean(file.sha256 && duplicateHashes[file.sha256] > 1),
      warnings: [
        ...(file.warnings || []),
        ...(file.sha256 && duplicateHashes[file.sha256] > 1 ? ['Duplikat per SHA-256 erkannt.'] : [])
      ]
    }));
    const batch = {
      id: batchId,
      name: input.name || `Import ${now.toLocaleString('de-DE')}`,
      createdAt: now.toISOString(),
      createdBy: session.user.email || session.user.id,
      files: enrichedFiles,
      status: enrichedFiles.some((file) => file.errors.length) ? 'failed' : 'imported',
      staging: staged.storageSummary,
      warnings: staged.warnings,
      validation: null
    };
    return saveImportBatch(batch);
  }

  function updateMapping(batchId, fileId, mapping, session) {
    assertAdmin(session);
    const batch = getImportBatch(batchId);
    if (!batch) throw new Error('Import-Batch wurde nicht gefunden.');
    const updated = {
      ...batch,
      files: batch.files.map((file) => file.id === fileId ? applyMapping(file, mapping) : file),
      status: 'mapped'
    };
    return saveImportBatch(updated);
  }

  function validateImportBatch(batchId, session) {
    assertAdmin(session);
    const batch = getImportBatch(batchId);
    if (!batch) throw new Error('Import-Batch wurde nicht gefunden.');
    const fileNameCounts = batch.files.reduce((counts, file) => {
      const name = file.originalFilename || file.filename;
      counts[name] = (counts[name] || 0) + 1;
      return counts;
    }, {});
    const mappingResult = validateMappings(batch.files);
    const errors = [
      ...mappingResult.errors,
      ...batch.files.flatMap((file) => file.errors || []),
      ...Object.entries(fileNameCounts).filter(([, count]) => count > 1).map(([name]) => `Doppelter Dateiname: ${name}`)
    ];
    const warnings = [
      ...mappingResult.warnings,
      ...batch.files.flatMap((file) => file.warnings || [])
    ];
    const validation = {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: mappingResult.suggestions
    };
    return saveImportBatch({
      ...batch,
      status: validation.isValid ? 'validated' : 'failed',
      validation
    });
  }

  function createContainerFromImportBatch(batchId, options, session, now = new Date()) {
    assertAdmin(session);
    const validatedBatch = validateImportBatch(batchId, session);
    if (!validatedBatch.validation.isValid) {
      throw new Error(validatedBatch.validation.errors.join(' | '));
    }
    const id = storage.ensureUniqueContainerId(options.id || options.name);
    const manifest = createManifest({
      ...options,
      id,
      status: 'draft',
      version: '0.1.0',
      visibleInLauncher: options.visibleInLauncher === true,
      createdBy: session.user.email || session.user.id
    }, now);
    storage.ensureUniqueRoute(manifest.route);

    const container = {
      id,
      manifest,
      status: 'draft',
      sourceContainerId: '',
      protected: false,
      routes: [],
      materials: [],
      assets: [],
      tasks: [],
      solutions: [],
      quizzes: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    validatedBatch.files.forEach((file, index) => {
      if (file.selectedTarget === 'referenceLiterature' || file.blocked || file.ignored) {
        return;
      }
      if (file.extension === '.zip' && file.deliverArchive !== true) {
        return;
      }
      const copiedPath = storage.copyImportedFile(file, id);
      const item = {
        id: `${file.selectedTarget}-${index + 1}`,
        title: file.title || file.originalFilename,
        sourcePath: copiedPath || file.sourcePath,
        dayNumber: file.dayNumber ?? null,
        visibleForRoles: file.visibility || ['Admin', 'Trainer'],
        order: Number(file.order || index + 1),
        category: file.category || file.selectedTarget
      };
      if (file.selectedTarget === 'webvariant') {
        container.routes.push({
          id: item.id,
          label: item.title,
          path: `${manifest.route}/${item.id}`,
          componentRef: 'static-preview',
          sourcePath: item.sourcePath,
          order: item.order
        });
      } else if (file.selectedTarget === 'task' || file.selectedTarget === 'projectTask') {
        container.tasks.push({ ...item, difficulty: file.difficulty || 'medium', taskType: file.selectedTarget });
      } else if (file.selectedTarget === 'solution') {
        container.solutions.push({ ...item, taskId: file.relatedTaskId || '' });
      } else if (file.selectedTarget === 'quiz') {
        container.quizzes.push({ ...item, questionCount: 0, timeLimitMinutes: 0 });
      } else if (file.selectedTarget === 'asset' || file.selectedTarget === 'style' || file.selectedTarget === 'script') {
        container.assets.push({ ...item, filename: file.originalFilename, mimeType: file.mimeType || '', usage: file.selectedTarget });
      } else {
        container.materials.push({ ...item, type: file.selectedTarget, targetPath: item.sourcePath });
      }
    });

    container.validation = validateContainerDraft(container);
    const saved = storage.saveContainer(container);
    saveImportBatch({
      ...validatedBatch,
      status: 'converted',
      containerId: id
    });
    return saved;
  }

  function publishContainer(containerId, session, options = {}) {
    assertAdmin(session);
    const container = storage.loadContainer(containerId);
    if (!container || container.protected || !container.generated) {
      throw new Error('Geschuetzte oder statische Container koennen nicht veroeffentlicht werden.');
    }
    const validation = validateContainerDraft(container);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' | '));
    }
    if (validation.warnings.length && options.confirmWarnings !== true) {
      return {
        requiresConfirmation: true,
        validation
      };
    }
    return storage.updateContainerStatus(containerId, 'active');
  }

  function disableContainer(containerId, session) {
    assertAdmin(session);
    return storage.updateContainerStatus(containerId, 'disabled');
  }

  function archiveContainer(containerId, session) {
    assertAdmin(session);
    return storage.updateContainerStatus(containerId, 'archived');
  }

  return {
    storage,
    referenceLibrary,
    aiKeyStore,
    getState,
    duplicateContainer,
    createImportBatch,
    curriculumPlanner,
    coursePlanning,
    getCourseProject: (projectId, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.getProject(projectId); },
    upsertCourseProject: (input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.upsertProject(input); },
    importSourceFile: (input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.importSourceFile(input); },
    startDocumentAnalysis: (input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.startDocumentAnalysis(input); },
    getAnalysisProgress: (operationId, session) => { assertAdmin(session); return coursePlanning.getAnalysisProgress(operationId); },
    getOperationStatus: (operationId, session) => { assertAdmin(session); return coursePlanning.getOperationStatus(operationId); },
    getPlanningResult: (operationId, session) => { assertAdmin(session); return coursePlanning.getPlanningResult(operationId); },
    startCoursePlanning: (input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.startCoursePlanning(input); },
    cancelAiOperation: (operationId, session) => { assertAdmin(session); return coursePlanning.cancelAiOperation(operationId); },
    savePlanningFrame: (projectId, frame, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.savePlanningFrame(projectId, frame); },
    saveCourseScope: (projectId, scope, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.saveCourseScope(projectId, scope); },
    generateStructuredCoursePlan: (input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.generateCoursePlan(input); },
    saveStructuredCoursePlan: (projectId, draft, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.saveCoursePlanDraft(projectId, draft); },
    acknowledgeDocumentFailure: (projectId, documentId, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.acknowledgeDocumentFailure(projectId, documentId); },
    approveStructuredCoursePlan: (projectId, version, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.approveCoursePlan(projectId, version); },
    getAiUnderstanding: (projectId, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.getAiUnderstanding(projectId); },
    updatePlanCollaboration: (projectId, input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.updatePlanCollaboration(projectId, input); },
    revisePlanTarget: (projectId, input, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.reviseTarget(projectId, input); },
    restorePlanVersion: (projectId, version, session) => { assertAdmin(session); ensureFactory(); return coursePlanning.restorePlanVersion(projectId, version); },
    createCurriculumAnchor: (input, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.createCurriculumAnchor(input);
    },
    analyzeCurriculumAnchor: (input, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.analyzeCurriculumAnchor(input);
    },
    getCurriculumDraft: (draftId, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.getCurriculumDraft(draftId);
    },
    updateCurriculumDraft: (draftId, patch, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.updateCurriculumDraft(draftId, patch);
    },
    moveCurriculumTopic: (draftId, topicId, targetDayNumber, targetOrder, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.moveCurriculumTopic(draftId, topicId, targetDayNumber, targetOrder);
    },
    approveCurriculumDraft: (draftId, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.approveCurriculumDraft(draftId);
    },
    listCurriculumDrafts: (session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.listCurriculumDrafts();
    },
    removeCurriculumDraft: (draftId, session) => {
      assertAdmin(session);
      ensureFactory();
      return curriculumPlanner.removeCurriculumDraft(draftId);
    },
    parseCoursePlan: parseCoursePlanUpload,
    getAiProviderStatus,
    testOpenAiConnection,
    importOpenAiKeyFromTxt,
    importOpenAiKeyFromDefaultPath,
    replaceOpenAiKey,
    clearOpenAiKey,
    updateAiModel,
    estimateAiCost: (input, session) => {
      assertAdmin(session);
      const aiStatus = aiOrchestrator.getStatus();
      return estimateContentFactoryCost(input, { model: aiStatus.providers.openai.model, warningLimitUsd: aiStatus.costWarningUsd });
    },
    runPreflight: runContentFactoryPreflight,
    previewPromptQuality,
    runPromptGoldenTests,
    runContentFactoryTestDraft,
    listPresets: (session) => {
      assertAdmin(session);
      return listPresets();
    },
    listDidacticProfiles: (session) => {
      assertAdmin(session);
      return listDidacticProfiles();
    },
    applyDidacticProfile: (id, input, session) => {
      assertAdmin(session);
      return applyDidacticProfile(id, input);
    },
    suggestDidacticProfile: (input, session) => {
      assertAdmin(session);
      return suggestDidacticProfile(input);
    },
    recommendDidacticProfiles: (input, session) => {
      assertAdmin(session);
      return recommendDidacticProfiles(input);
    },
    evaluateDidacticFit: (profile, input, session) => {
      assertAdmin(session);
      return evaluateDidacticFit(profile, input);
    },
    evaluateAllDidacticFits: (input, session) => {
      assertAdmin(session);
      return evaluateAllDidacticFits(input);
    },
    createDidacticPreview: (input, session) => {
      assertAdmin(session);
      return createDidacticPreview(input);
    },
    applyPreset: (id, input, session) => {
      assertAdmin(session);
      return applyPreset(id, input);
    },
    deleteGeneratedDraft: (containerId, session) => {
      assertAdmin(session);
      ensureFactory();
      return cleanup.deleteGeneratedDraft(containerId);
    },
    deleteLastTestDraft: (session) => {
      assertAdmin(session);
      ensureFactory();
      return cleanup.deleteLastTestDraft();
    },
    clearStaging: (session) => {
      assertAdmin(session);
      ensureFactory();
      return cleanup.clearStaging();
    },
    listStorageUsage: (session) => {
      assertAdmin(session);
      ensureFactory();
      return cleanup.listStorageUsage();
    },
    generateDayDraft,
    generateAllDayDrafts,
    reviseDayDraft,
    createPlanContainerDraft: createPlanDraft,
    validateGeneratedContainer: validatePlanDraft,
    getImportBatch,
    listImportBatches,
    updateMapping,
    validateImportBatch,
    createContainerFromImportBatch,
    publishContainer,
    disableContainer,
    archiveContainer,
    validateContainerDraft
  };
}

module.exports = {
  createContentFactoryService
};
