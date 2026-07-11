const path = require('path');
const { readJson, writeJson, ensureDir } = require('../json-store');
const { moduleRegistry } = require('../modules/module-registry');
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
const { createPlanContainerDraft } = require('./plan-container-draft-service');
const { validateGeneratedContainer } = require('./generated-container-validator');

function cloneItems(items, include, transform = (item) => item) {
  return include ? (items || []).map((item) => transform({ ...item })) : [];
}

function createContentFactoryService({ appData }) {
  const factoryDir = path.join(appData.dataDir, 'content-factory');
  const batchesPath = path.join(factoryDir, 'import-batches.json');
  const storage = createContainerStorageService({
    dataDir: appData.dataDir,
    staticContainers: moduleRegistry.getAllModules()
  });
  const referenceLibrary = createReferenceLibraryService({ appData });
  const aiOrchestrator = new AiOrchestrator();

  function ensureFactory() {
    appData.ensureDataFiles();
    ensureDir(factoryDir);
    storage.ensureStorage();
    referenceLibrary.ensureLibrary();
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

  function assertAdmin(session) {
    const roles = session?.user?.roles || [];
    if (!session?.authenticated || (!roles.includes('Admin') && !roles.includes('SuperAdmin'))) {
      throw new Error('Kein Zugriff: Content Factory ist nur fuer Admins verfuegbar.');
    }
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
    return aiOrchestrator.getStatus();
  }

  async function generateDayDraft(input, session) {
    assertAdmin(session);
    ensureFactory();
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
      referenceContext
    }, input.aiMode || 'local');
  }

  function createPlanDraft(input, session) {
    assertAdmin(session);
    ensureFactory();
    const draft = createPlanContainerDraft(input, { factoryDir });
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
        container.tasks.push({ ...item, difficulty: file.difficulty || 'normal', taskType: file.selectedTarget });
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
    getState,
    duplicateContainer,
    createImportBatch,
    parseCoursePlan: parseCoursePlanUpload,
    getAiProviderStatus,
    generateDayDraft,
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
