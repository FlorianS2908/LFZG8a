const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { createAppData, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } = require('../app/lib/app-data');
const { createContentFactoryService } = require('../app/lib/content-factory/content-factory-service');
const { detectTargetArea, extractDayNumber, detectFileKind } = require('../app/lib/content-factory/file-type-rules');
const { createMappingSuggestion, applyMapping } = require('../app/lib/content-factory/mapping-service');

function createTempFactory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-factory-'));
  const appData = createAppData(dir);
  const session = appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
  return {
    dir,
    appData,
    session,
    service: createContentFactoryService({ appData }),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

test('content factory duplicates containers as drafts without changing the original', () => {
  const { service, session, cleanup } = createTempFactory();

  try {
    const before = service.storage.loadContainer('lfzq8a');
    const duplicate = service.duplicateContainer({
      sourceContainerId: 'lfzq8a',
      newName: 'HTML CSS Kopie',
      newDescription: 'Demo-Duplikat',
      copyMode: 'reference',
      includeAssets: true,
      includeMaterials: true,
      includeTasks: true,
      includeSolutions: true,
      includeQuizzes: true,
      includeRoutes: true,
      visibleInLauncher: true
    }, session);
    const after = service.storage.loadContainer('lfzq8a');

    assert.equal(duplicate.manifest.status, 'draft');
    assert.equal(duplicate.manifest.sourceContainerId, 'lfzq8a');
    assert.equal(duplicate.manifest.version, '0.1.0');
    assert.notEqual(duplicate.manifest.id, 'lfzq8a');
    assert.equal(duplicate.manifest.route, `/modules/${duplicate.manifest.id}`);
    assert.deepEqual(after.manifest, before.manifest);
    assert.equal(service.storage.listGeneratedContainers().length, 1);
  } finally {
    cleanup();
  }
});

test('content factory keeps draft containers off normal launcher until published', () => {
  const { service, session, cleanup } = createTempFactory();

  try {
    const duplicate = service.duplicateContainer({
      sourceContainerId: 'lfzq8a',
      newName: 'HTML CSS Landing Demo',
      newDescription: 'Demo',
      visibleInLauncher: true
    }, session);

    assert.equal(service.storage.listGeneratedContainers().filter((container) => container.manifest.status === 'active').length, 0);
    const publishResult = service.publishContainer(duplicate.manifest.id, session, { confirmWarnings: true });
    assert.equal(publishResult.manifest.status, 'active');
    assert.equal(service.storage.listGeneratedContainers().some((container) => (
      container.manifest.id === duplicate.manifest.id
      && container.manifest.status === 'active'
      && container.manifest.visibleInLauncher === true
    )), true);
  } finally {
    cleanup();
  }
});

test('content factory detects file types target areas and day numbers', () => {
  assert.equal(detectTargetArea('loesungen_tag_03.html'), 'solution');
  assert.equal(detectTargetArea('aufgaben_tag_03.html'), 'task');
  assert.equal(detectTargetArea('LFZQ8a_tag_01_Webvariante.html'), 'webvariant');
  assert.equal(detectTargetArea('arbeitsdatei.css'), 'style');
  assert.equal(detectTargetArea('fragenpool.json'), 'quiz');
  assert.equal(detectFileKind('grafik.png'), 'image');
  assert.equal(detectFileKind('material.pdf'), 'document');
  assert.equal(extractDayNumber('LFZQ8a_tag_10_Webvariante.html'), 10);
  assert.equal(extractDayNumber('day01_task.html'), 1);
});

test('content factory mappings can be manually locked over suggestions', () => {
  const suggested = createMappingSuggestion({ originalFilename: 'aufgabe_tag_03.html' });
  const mapped = applyMapping(suggested, {
    selectedTarget: 'solution',
    dayNumber: 4,
    title: 'Manuelle Loesung',
    mappingLocked: true
  });

  assert.equal(suggested.selectedTarget, 'task');
  assert.equal(mapped.selectedTarget, 'solution');
  assert.equal(mapped.dayNumber, 4);
  assert.equal(mapped.title, 'Manuelle Loesung');
  assert.equal(mapped.mappingLocked, true);
});

test('content factory imports raw files validates mappings and creates a draft container', () => {
  const { dir, service, session, cleanup } = createTempFactory();

  try {
    const sourceFile = path.join(dir, 'aufgaben_tag_03.html');
    fs.writeFileSync(sourceFile, '<h1>Aufgabe Tag 3</h1>', 'utf8');
    const batch = service.createImportBatch({
      name: 'Import Tag 3',
      files: [{ name: 'aufgaben_tag_03.html', path: sourceFile, size: fs.statSync(sourceFile).size, type: 'text/html' }]
    }, session);
    const validated = service.validateImportBatch(batch.id, session);
    const draft = service.createContainerFromImportBatch(batch.id, {
      name: 'Importierter Tag 3',
      description: 'Aus Rohdaten erzeugt',
      tags: ['Tag 3'],
      visibleInLauncher: false
    }, session);

    assert.equal(validated.validation.isValid, true);
    assert.equal(draft.manifest.status, 'draft');
    assert.equal(draft.tasks.length, 1);
    assert.equal(draft.tasks[0].dayNumber, 3);
    assert.equal(fs.existsSync(path.join(draft.storagePath, 'tasks', 'aufgaben_tag_03.html')), true);
  } finally {
    cleanup();
  }
});

test('content factory requires an admin session', () => {
  const { service, cleanup } = createTempFactory();

  try {
    assert.throws(() => service.getState({ authenticated: false, user: null }), /nur fuer Admins|Kein Zugriff/);
    assert.throws(() => service.getState({ authenticated: true, user: { roles: ['Teilnehmer'] } }), /nur fuer Admins|Kein Zugriff/);
  } finally {
    cleanup();
  }
});
