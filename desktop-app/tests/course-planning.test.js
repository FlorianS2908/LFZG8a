const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCoursePlanningService, calculatePlanningFrame, validateDocumentAnalysis, validateCoursePlan, normalizeProject } = require('../app/lib/content-factory/course-planning/course-planning-service');
const { normalizeDocumentAnalysis } = require('../app/lib/content-factory/course-planning/document-analysis-schema');

const validFrame = {
  targetGroup: 'Fachlich definierte Zielgruppe', priorKnowledge: 'Vom Benutzer bestätigte Vorkenntnisse',
  totalDays: 5, unitsPerDay: 9, totalUnits: 45, unitDurationMinutes: 45,
  dailyStartTime: '08:30', dailyEndTime: '16:30',
  breaks: [{ start: '10:00', end: '10:15' }, { start: '11:45', end: '12:15' }, { start: '13:45', end: '14:00' }, { start: '15:30', end: '15:45' }],
  repetitionUnits: 2, projectUnits: 3, assessmentUnits: 1, bufferUnits: 0
};

test('Planungsrahmen berechnet Nettozeit und reservierte UE deterministisch', () => {
  const result = calculatePlanningFrame(validFrame);
  assert.equal(result.valid, true);
  assert.equal(result.netMinutesPerDay, 405);
  assert.equal(result.possibleUnitsPerDay, 9);
  assert.equal(result.reservedUnits, 6);
  assert.equal(result.actuallyPlannableUnits, 39);
});

test('Planungsrahmen erkennt Pausenüberschneidung und unplausible Reserve', () => {
  const result = calculatePlanningFrame({ ...validFrame, breaks: [{ start: '10:00', end: '10:30' }, { start: '10:15', end: '10:45' }], reservedUnits: 45 });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /überschneiden/);
  assert.match(result.errors.join(' '), /Reservierte UE/);
});

test('Dokumentanalyse und Herkunft werden strikt validiert', () => {
  const canonical = normalizeDocumentAnalysis({ documentId: 'd1', documentType: 'text', detectedCategory: { value: 'Plan', confidence: 0.8, reason: 'Struktur' }, summary: { short: 'Quelle', detailed: 'Details' }, topics: [], learningObjectives: [], confidence: 0.8 }).value;
  assert.equal(validateDocumentAnalysis(canonical).valid, true);
  assert.equal(validateDocumentAnalysis({ ...canonical, topics: 'falsch' }).valid, false);
  const frame = { totalDays: 1, actuallyPlannableUnits: 1 };
  const valid = validateCoursePlan({ days: [{ dayNumber: 1, units: [{ id: 'u1', unitNumber: 1, originStatus: 'explicit', sourceReferences: [{ documentId: 'd1' }] }] }] }, frame);
  const invalid = validateCoursePlan({ days: [{ dayNumber: 1, units: [{ id: 'u1', unitNumber: 1, originStatus: 'explicit', sourceReferences: [] }] }] }, frame);
  assert.equal(valid.status, 'passed');
  assert.equal(invalid.status, 'failed');
});

test('Analyse-Normalisierung korrigiert nur eindeutig interpretierbare Formen', () => {
  const result = normalizeDocumentAnalysis({ documentId: 'd1', documentType: 'spreadsheet', detectedCategory: 'Unterrichtsplan', summary: 'Kurz', learningObjectives: { title: 'Ziel' }, topics: null, confidence: 2 });
  assert.equal(result.value.detectedCategory.value, 'Unterrichtsplan');
  assert.equal(result.value.summary.short, 'Kurz');
  assert.deepEqual(result.value.learningObjectives, [{ title: 'Ziel' }]);
  assert.deepEqual(result.value.topics, []);
  assert.deepEqual(result.value.exercises, []);
  assert.equal(result.value.confidence, 1);
  assert.equal(validateDocumentAnalysis(result.value).valid, true);
  const invalid = normalizeDocumentAnalysis({ documentId: 'd1', summary: 'Kurz', topics: 'nicht eindeutig' }).value;
  assert.equal(validateDocumentAnalysis(invalid).valid, false);
});

test('Altprojekt erhält sichere versionierte Defaultwerte', () => {
  const migrated = normalizeProject({ id: 'alt', title: 'Altprojekt' }, 'alt');
  assert.deepEqual(migrated.documentAnalyses, []);
  assert.deepEqual(migrated.coursePlanDrafts, []);
  assert.equal(migrated.currentPlanningVersion, 0);
});

test('Neuplanung erzeugt Versionen und freigegebener Snapshot ist geschützt', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-version-'));
  const provider = {
    name: 'mock-openai', model: 'test-model', isConfigured: () => true,
    async generateStructuredCoursePlan(input) {
      const count = input.planningFrame.actuallyPlannableUnits;
      return { summary: 'Plan', days: [{ dayNumber: 1, title: 'Tag 1', units: Array.from({ length: count }, (_, index) => ({ id: `u${index + 1}`, dayNumber: 1, unitNumber: index + 1, topic: `Thema ${index + 1}`, content: 'Inhalt', preliminaryLearningObjective: 'Ziel', sourceReferences: [{ documentId: 'd1', fileName: 'quelle.md' }], originStatus: 'explicit', confidence: 1, reviewStatus: 'open' })) }], conflicts: [], warnings: [], reviewItems: [] };
    }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider } });
  service.upsertProject({ id: 'versioniert', title: 'Versioniert', documentAnalyses: [{ id: 'a1', documentId: 'd1', analysisVersion: 1, summary: 'Quelle', topics: ['Thema'], learningObjectives: [], conflicts: [], missingInformation: [] }], mergedKnowledgeBase: { topics: ['Thema'] } });
  service.savePlanningFrame('versioniert', { ...validFrame, totalDays: 1, unitsPerDay: 3, totalUnits: 3, repetitionUnits: 0, projectUnits: 0, assessmentUnits: 0, breaks: [], confirmWarnings: true });
  let project = await service.generateCoursePlan({ projectId: 'versioniert' });
  assert.equal(project.currentPlanningVersion, 1);
  project = await service.generateCoursePlan({ projectId: 'versioniert' });
  assert.equal(project.currentPlanningVersion, 2);
  project = service.approveCoursePlan('versioniert', 2);
  assert.equal(project.approvedCoursePlan.status, 'approved');
  assert.throws(() => service.saveCoursePlanDraft('versioniert', project.approvedCoursePlan), /nicht überschrieben/);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Mehrdokumentlauf normalisiert Einzelfund, bewahrt Erfolge und plant trotz optionalem Einzelfehler', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-multi-'));
  const firstPath = path.join(factoryDir, 'quelle-a.md');
  const secondPath = path.join(factoryDir, 'quelle-b.md');
  fs.writeFileSync(firstPath, '# Fachthema\nQuelle A', 'utf8');
  fs.writeFileSync(secondPath, '# Ergänzung\nQuelle B', 'utf8');
  let calls = 0;
  const provider = {
    name: 'mock-openai', model: 'test-model', isConfigured: () => true,
    async analyzeDocument(input) {
      calls += 1;
      if (calls === 2) return { documentId: input.document.id, documentType: 'text', detectedCategory: 'Ergänzung', summary: 'Fehlerhaft', topics: 'nicht eindeutig', learningObjectives: [] };
      return { documentId: input.document.id, documentType: 'text', detectedCategory: 'Fachquelle', summary: 'Quellenanalyse', topics: [{ title: 'Fachthema' }], learningObjectives: { title: 'Fachziel' }, confidence: 0.9 };
    },
    async generateStructuredCoursePlan() {
      return { summary: 'Plan', days: [{ dayNumber: 1, title: 'Tag 1', units: [{ id: 'u1', dayNumber: 1, unitNumber: 1, topic: 'Fachthema', content: 'Fachneutraler Inhalt', preliminaryLearningObjective: 'Fachziel', sourceReferences: [{ documentId: 'd1', fileName: 'quelle-a.md' }], originStatus: 'explicit', confidence: 0.9, reviewStatus: 'open', materialRequirements: [{ type: 'handout', action: 'generate', targetFormat: 'pdf', reviewRequired: true }] }] }], conflicts: [], warnings: [], reviewItems: [] };
    }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider } });
  service.upsertProject({ id: 'multi', title: 'Fachneutral', uploadedDocuments: [
    { id: 'd1', originalFileName: 'quelle-a.md', storedFilePath: firstPath, bindingLevel: 'binding' },
    { id: 'd2', originalFileName: 'quelle-b.md', storedFilePath: secondPath, bindingLevel: 'optional' }
  ] });
  service.savePlanningFrame('multi', { ...validFrame, totalDays: 1, unitsPerDay: 1, totalUnits: 1, repetitionUnits: 0, projectUnits: 0, assessmentUnits: 0, breaks: [], confirmWarnings: true });
  const started = service.startDocumentAnalysis({ projectId: 'multi' });
  let progress;
  do { await new Promise((resolve) => setTimeout(resolve, 10)); progress = service.getAnalysisProgress(started.operationId); } while (progress.status === 'running');
  const project = service.getProject('multi');
  assert.equal(progress.status, 'completed');
  assert.equal(project.documentAnalyses.length, 1);
  assert.deepEqual(project.documentAnalyses[0].learningObjectives, [{ title: 'Fachziel' }]);
  assert.equal(project.uploadedDocuments.find((item) => item.id === 'd2').analysisStatus, 'failed');
  assert.equal(project.coursePlanDrafts.length, 1);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Renderer erhält keine API-Schlüssel über die Preload-Oberfläche', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'app', 'preload.js'), 'utf8');
  assert.doesNotMatch(preload, /OPENAI_API_KEY|getOpenAiKeyForServerUse/);
  assert.match(preload, /start-document-analysis/);
  assert.match(preload, /approve-structured-course-plan/);
});

test('Planungsprompt und Review bleiben fachneutral und Materialgeneratoren sind erweiterbar', () => {
  const provider = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'content-factory', 'ai', 'openai-provider.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');
  const generators = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'content-factory', 'artifact-generators', 'artifact-generator-service.js'), 'utf8');
  assert.match(provider, /Das System ist fachneutral/);
  assert.match(provider, /materialRequirements/);
  assert.match(renderer, /Vorgeschlagene Materialarten/);
  assert.match(generators, /registerArtifactGenerator/);
});

test('Electron-Cache wird vor dem Browserfenster unter LOCALAPPDATA konfiguriert', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'app', 'main.js'), 'utf8');
  assert.match(main, /process\.env\.LOCALAPPDATA/);
  assert.ok(main.indexOf("app.setPath('cache'") < main.indexOf('function createWindow'));
  assert.doesNotMatch(main, /disk-cache-dir[^\n]*OneDrive/);
});
