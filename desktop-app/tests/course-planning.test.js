const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCoursePlanningService, extractDocument, calculatePlanningFrame, calculateCourseScope, validateDocumentAnalysis, validateCoursePlan, normalizeProject, PLANNING_PROVIDER_TIMEOUT_MS } = require('../app/lib/content-factory/course-planning/course-planning-service');
const { parseCoursePlan, readWorkbookXml, selectCoursePlanSheet } = require('../app/lib/content-factory/course-plan-parser');
const { normalizeDocumentAnalysis } = require('../app/lib/content-factory/course-planning/document-analysis-schema');

const validFrame = {
  targetGroup: 'Fachlich definierte Zielgruppe', priorKnowledge: 'Vom Benutzer bestätigte Vorkenntnisse',
  totalDays: 5, unitsPerDay: 9, totalUnits: 45, unitDurationMinutes: 45,
  dailyStartTime: '08:30', dailyEndTime: '16:30',
  breaks: [{ start: '10:00', end: '10:15' }, { start: '11:45', end: '12:15' }, { start: '13:45', end: '14:00' }, { start: '15:30', end: '15:45' }],
  repetitionUnits: 2, projectUnits: 3, assessmentUnits: 1, bufferUnits: 0
};

test('Blattauswahl bevorzugt fachlichen Wochenplan statt Änderungshistorie', () => { const sheets = [{ name: 'Änderungshistorie', hidden: false, rows: [['Version', 'Änderung']] }, { name: 'Template Wochenplanung', hidden: false, rows: [['Tag', 'UE', 'Thema', 'Lernziel', 'Dauer', 'Arbeitsform']] }]; const selection = selectCoursePlanSheet(sheets); assert.equal(selection.sheet.name, 'Template Wochenplanung'); assert.ok(selection.scores[1].score > selection.scores[0].score); });
test('fehlendes geeignetes Blatt verlangt manuelle Prüfung', () => { const selection = selectCoursePlanSheet([{ name: 'Hinweise', hidden: false, rows: [['Allgemeine Hinweise']] }]); assert.equal(selection.sheet, null); assert.match(selection.message, /manuell auswählen/); });

test('reale LF-ZQ8A-XLSM ergibt exakt fünf Tage und 45 UE ohne Phantomwerte', (t) => {
  const fixture = process.env.COURSEFORGE_REGRESSION_XLSM || path.resolve(__dirname, '../../../project_sources/01-Wochenplan_FIAE_LF-ZQ8A.xlsm');
  if (!fs.existsSync(fixture)) return t.skip('Reale, nicht im Repository gespeicherte XLSM über COURSEFORGE_REGRESSION_XLSM bereitstellen.');
  const result = parseCoursePlan(fixture);
  assert.equal(result.selectedSheet, 'Template Wochenplanung');
  assert.equal(result.totalDays, 5);
  assert.equal(result.totalUE, 45);
  assert.equal(result.days.length, 5);
  assert.deepEqual(result.days.map((day) => day.ueBlocks.length), [9, 9, 9, 9, 9]);
  assert.doesNotMatch(JSON.stringify(result), /\bUE 135\b|SAP/i);
});

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
  const valid = validateCoursePlan({ days: [{ dayNumber: 1, units: [{ id: 'u1', unitNumber: 1, topic: 'Thema', preliminaryLearningObjective: 'Ziel', originStatus: 'explicit', sourceReferences: [{ documentId: 'd1' }] }] }] }, frame);
  const invalid = validateCoursePlan({ days: [{ dayNumber: 1, units: [{ id: 'u1', unitNumber: 1, topic: 'Thema', preliminaryLearningObjective: 'Ziel', originStatus: 'explicit', sourceReferences: [] }] }] }, frame);
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

test('Vereinfachter Kursrahmen validiert Auswahlwerte und berechnet Gesamt-UE', () => {
  const valid = calculateCourseScope({ totalDays: 5, unitsPerDay: 9, unitDurationMinutes: 45, targetAudience: { value: 'trainees', label: 'beliebig' }, priorKnowledge: { value: 'none', label: 'beliebig' } });
  assert.equal(valid.valid, true);
  assert.equal(valid.totalUnits, 45);
  assert.deepEqual(valid.targetAudience, { value: 'trainees', label: 'Auszubildende', customText: '' });
  assert.deepEqual(valid.priorKnowledge, { value: 'none', label: 'Keine Vorkenntnisse', customText: '' });
  assert.equal(calculateCourseScope({ totalDays: 5, unitsPerDay: 9, unitDurationMinutes: 45 }).valid, false);
  assert.match(calculateCourseScope({ totalDays: 5, unitsPerDay: 9, unitDurationMinutes: 45, targetAudience: { value: 'other_audience' }, priorKnowledge: { value: 'other_knowledge' } }).errors.join(' '), /sonstige Zielgruppe.*sonstigen Vorkenntnisse/);
});

test('Kursdauer bleibt dynamisch und unterstützt zwei Tage mit 18 UE', () => {
  const short = calculateCourseScope({ totalDays: 2, unitsPerDay: 9, unitDurationMinutes: 45, targetAudience: { value: 'trainees' }, priorKnowledge: { value: 'basic' } });
  assert.equal(short.valid, true);
  assert.equal(short.totalDays, 2);
  assert.equal(short.totalUnits, 18);
  assert.deepEqual(short.unitsByDay, [9, 9]);
  assert.notEqual(short.totalDays, validFrame.totalDays);
});

test('Alte Freitexte werden normalisiert und verborgene Daten bleiben beim Speichern erhalten', () => {
  const known = calculateCourseScope({ totalDays: 2, unitsPerDay: 4, unitDurationMinutes: 45, targetGroup: 'Studierende', priorKnowledge: 'Grundkenntnisse' });
  assert.equal(known.targetAudience.value, 'students');
  assert.equal(known.priorKnowledge.value, 'basic');
  const unknown = calculateCourseScope({ totalDays: 2, unitsPerDay: 4, unitDurationMinutes: 45, targetGroup: 'Eigene Zielgruppe', priorKnowledge: 'Fachspezifischer Stand' });
  assert.deepEqual(unknown.targetAudience, { value: 'other_audience', label: 'Sonstige Zielgruppe', customText: 'Eigene Zielgruppe' });
  assert.deepEqual(unknown.priorKnowledge, { value: 'other_knowledge', label: 'Sonstige Vorkenntnisse', customText: 'Fachspezifischer Stand' });

  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-save-'));
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: {} });
  service.upsertProject({ id: 'alt-scope', title: 'Alt', structureFrame: { bindingTopics: 'Erhalten', unitsByDay: [3, 5] } });
  const saved = service.saveCourseScope('alt-scope', { totalDays: 2, unitsPerDay: 4, unitDurationMinutes: 45, targetAudience: { value: 'students' }, priorKnowledge: { value: 'basic' } });
  assert.equal(saved.structureFrame.bindingTopics, 'Erhalten');
  assert.deepEqual(saved.structureFrame.unitsByDay, [3, 5]);
  assert.doesNotThrow(() => JSON.stringify(saved.structureFrame));
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Neuplanung erzeugt Versionen und freigegebener Snapshot ist geschützt', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-version-'));
  const provider = {
    name: 'mock-openai', model: 'test-model', isConfigured: () => true,
    async generateStructuredCoursePlan(input) {
      const count = input.structureFrame.actuallyPlannableUnits;
      return { summary: 'Plan', days: [{ dayNumber: 1, title: 'Tag 1', units: Array.from({ length: count }, (_, index) => ({ id: `u${index + 1}`, dayNumber: 1, unitNumber: index + 1, globalUnitNumber: index + 1, durationMinutes: 45, topic: `Thema ${index + 1}`, content: 'Inhalt', competencyGoal: 'Ziel', workFormat: { key: 'guided_practice', label: 'Geführte Übung' }, sourceReferences: [{ documentId: 'd1', fileName: 'quelle.md' }], warnings: [], assumptions: [], originStatus: 'explicit', confidence: 1, reviewStatus: 'open' })) }], conflicts: [], warnings: [], reviewItems: [] };
    }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider } });
  service.upsertProject({ id: 'versioniert', title: 'Versioniert', documentAnalyses: [{ id: 'a1', documentId: 'd1', analysisVersion: 1, summary: 'Quelle', topics: ['Thema'], learningObjectives: [], conflicts: [], missingInformation: [] }], mergedKnowledgeBase: { topics: ['Thema'] } });
  service.saveCourseScope('versioniert', { targetGroup: 'Erwachsene', priorKnowledge: 'Grundkenntnisse', totalDays: 1, unitsPerDay: 3, totalUnits: 3, unitDurationMinutes: 45 });
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
      return { summary: 'Plan', days: [{ dayNumber: 1, title: 'Tag 1', units: [{ id: 'u1', dayNumber: 1, unitNumber: 1, globalUnitNumber: 1, durationMinutes: 45, topic: 'Fachthema', content: 'Fachneutraler Inhalt', competencyGoal: 'Fachziel', workFormat: { key: 'guided_practice', label: 'Geführte Übung' }, sourceReferences: [{ documentId: 'd1', fileName: 'quelle-a.md' }], warnings: [], assumptions: [], originStatus: 'explicit', confidence: 0.9, reviewStatus: 'open', materialRequirements: [{ type: 'handout', action: 'generate', targetFormat: 'pdf', reviewRequired: true }] }] }], conflicts: [], warnings: [], reviewItems: [] };
    }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider } });
  service.upsertProject({ id: 'multi', title: 'Fachneutral' });
  service.importSourceFile({ projectId: 'multi', documentId: 'd1', sourcePath: firstPath, originalFileName: 'quelle-a.md', bindingLevel: 'binding' });
  service.importSourceFile({ projectId: 'multi', documentId: 'd2', sourcePath: secondPath, originalFileName: 'quelle-b.md', bindingLevel: 'optional' });
  service.savePlanningFrame('multi', { ...validFrame, totalDays: 1, unitsPerDay: 1, totalUnits: 1, repetitionUnits: 0, projectUnits: 0, assessmentUnits: 0, breaks: [], confirmWarnings: true });
  const started = service.startDocumentAnalysis({ projectId: 'multi' });
  let progress;
  do { await new Promise((resolve) => setTimeout(resolve, 10)); progress = service.getAnalysisProgress(started.operationId); } while (!['completed', 'completed_with_warnings', 'failed', 'cancelled'].includes(progress.status));
  let project = service.getProject('multi');
  assert.equal(progress.status, 'completed_with_warnings');
  assert.equal(project.documentAnalyses.length, 1);
  assert.deepEqual(project.documentAnalyses[0].learningObjectives, [{ title: 'Fachziel' }]);
  assert.equal(project.uploadedDocuments.find((item) => item.id === 'd2').analysisStatus, 'failed');
  assert.equal(project.coursePlanDrafts.length, 0);
  service.confirmTopicReview('multi');
  const planning = service.startCoursePlanning({ projectId: 'multi' });
  do { await new Promise((resolve) => setTimeout(resolve, 10)); progress = service.getOperationStatus(planning.operationId); } while (!['completed', 'failed', 'timed_out', 'cancelled'].includes(progress.status));
  project = service.getProject('multi');
  assert.equal(project.coursePlanDrafts.length, 1);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Analyse-Service lehnt leere, doppelte, unbekannte und ausgeschlossene Auswahlen ab', () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-input-'));
  const provider = { isConfigured: () => true };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'input', title: 'Input' });
  service.saveCourseScope('input', { totalDays: 1, unitsPerDay: 1, unitDurationMinutes: 45, targetAudience: { value: 'students' }, priorKnowledge: { value: 'none' } });
  assert.throws(() => service.startDocumentAnalysis({ projectId: 'input', documents: [] }), /keine analysierbaren Dokumente/);
  assert.throws(() => service.startDocumentAnalysis({ projectId: 'input', documents: [{ id: 'd1' }, { id: 'd1' }] }), /doppelt/);
  assert.throws(() => service.startDocumentAnalysis({ projectId: 'input', documents: [{ id: 'd1', excluded: true }], retryDocumentId: 'd1' }), /nicht gefunden oder ist ausgeschlossen/);
  assert.throws(() => service.startDocumentAnalysis({ projectId: 'input', documents: [{ id: 'd1' }], retryDocumentId: 'unbekannt' }), /nicht gefunden oder ist ausgeschlossen/);
  assert.throws(() => service.startDocumentAnalysis([]), /ungültig/);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Gemischter Analyselauf beendet terminal und bewahrt Einzelergebnisse', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-mixed-'));
  const docs = ['ok', 'warn', 'fail'].map((id) => { const file = path.join(factoryDir, `${id}.md`); fs.writeFileSync(file, `# ${id}`, 'utf8'); return { id, originalFileName: `${id}.md`, storedFilePath: file, bindingLevel: 'optional' }; });
  let failShouldThrow = true;
  const provider = {
    name: 'fake', model: 'fake-model', isConfigured: () => true,
    async analyzeDocument({ document }) {
      if (document.id === 'fail' && failShouldThrow) throw new Error('Providerfehler sk-test-secret');
      return { documentId: document.id, documentType: 'markdown', detectedCategory: 'Quelle', summary: 'Zusammenfassung', topics: [{ title: document.id }], learningObjectives: [{ title: 'Ziel' }], warnings: document.id === 'warn' ? [{ message: 'Prüfen' }] : [], confidence: 0.9 };
    },
    async generateStructuredCoursePlan() { return { summary: 'Plan', days: [{ dayNumber: 1, title: 'Tag', units: [{ id: 'u1', dayNumber: 1, unitNumber: 1, globalUnitNumber: 1, durationMinutes: 45, topic: 'Thema', content: 'Inhalt', competencyGoal: 'Ziel', workFormat: { key: 'individual', label: 'Einzelarbeit' }, sourceReferences: [{ documentId: 'ok' }], warnings: [], assumptions: [], originStatus: 'explicit' }] }] }; }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'mixed', title: 'Gemischt' });
  docs.forEach((document) => service.importSourceFile({ projectId: 'mixed', documentId: document.id, sourcePath: document.storedFilePath, originalFileName: document.originalFileName, bindingLevel: document.bindingLevel }));
  service.saveCourseScope('mixed', { totalDays: 1, unitsPerDay: 1, unitDurationMinutes: 45, targetAudience: { value: 'students' }, priorKnowledge: { value: 'none' } });
  const started = service.startDocumentAnalysis({ projectId: 'mixed', retryDocumentId: { type: 'click' } });
  let progress;
  do { await new Promise((resolve) => setTimeout(resolve, 10)); progress = service.getAnalysisProgress(started.operationId); } while (!['completed', 'completed_with_warnings', 'failed', 'cancelled'].includes(progress.status));
  const project = service.getProject('mixed');
  assert.equal(progress.status, 'completed_with_warnings');
  assert.deepEqual({ completed: progress.completed, warnings: progress.warningCount, failed: progress.failed }, { completed: 1, warnings: 1, failed: 1 });
  assert.deepEqual(project.uploadedDocuments.map((document) => document.analysisStatus), ['analyzed', 'analyzed_with_warnings', 'failed']);
  assert.equal(project.documentAnalyses.length, 2);
  assert.doesNotMatch(JSON.stringify(progress.errors), /sk-test-secret/);
  assert.ok(progress.completedAt);
  failShouldThrow = false;
  const retry = service.startDocumentAnalysis({ projectId: 'mixed', retryDocumentId: 'fail' });
  let retryProgress;
  do { await new Promise((resolve) => setTimeout(resolve, 10)); retryProgress = service.getAnalysisProgress(retry.operationId); } while (!['completed', 'completed_with_warnings', 'failed', 'cancelled'].includes(retryProgress.status));
  const retried = service.getProject('mixed');
  assert.equal(retryProgress.total, 1);
  assert.equal(retryProgress.status, 'completed');
  assert.equal(retried.uploadedDocuments.find((document) => document.id === 'fail').analysisAttempts, 2);
  assert.equal(retried.uploadedDocuments.find((document) => document.id === 'ok').analysisAttempts, 1);
  assert.equal(retried.documentAnalyses.filter((analysis) => analysis.documentId === 'ok').length, 1);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Analyse verwendet gespeicherten Vollkontext und repariert eine formal falsche Planung genau einmal', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-context-'));
  const source = path.join(factoryDir, 'quelle.md');
  fs.writeFileSync(source, '# Netzwerke\nSichere Segmentierung', 'utf8');
  let analysisInput;
  const planningInputs = [];
  const unit = (number) => ({ id: `u${number}`, dayNumber: 1, unitNumber: number, globalUnitNumber: number, durationMinutes: 45, topic: `Thema ${number}`, content: 'Inhalt', competencyGoal: 'Ziel', workFormat: { key: 'individual', label: 'Einzelarbeit' }, sourceReferences: [{ documentId: 'doc' }], warnings: [], assumptions: [], originStatus: 'explicit' });
  const provider = {
    name: 'fake', model: 'fake-model', isConfigured: () => true,
    async analyzeDocument(input) {
      analysisInput = input;
      return { documentId: input.document.id, documentType: 'markdown', detectedCategory: 'Quelle', summary: 'Netzwerke', topics: [{ title: 'Segmentierung' }], learningObjectives: [{ title: 'Planen' }], confidence: 1 };
    },
    async generateStructuredCoursePlan(input) {
      planningInputs.push(input);
      const count = planningInputs.length === 1 ? 1 : 2;
      return { summary: 'Plan', days: [{ dayNumber: 1, title: 'Tag 1', units: Array.from({ length: count }, (_, index) => unit(index + 1)) }] };
    }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'context', title: 'Netzwerke', description: 'Praxis', subjectArea: 'FISI', courseGoal: 'Sicher planen', expectedOutcome: 'Projekt', audienceProfile: { needsStepByStep: true } });
  service.importSourceFile({ projectId: 'context', documentId: 'doc', sourcePath: source, originalFileName: 'quelle.md', bindingLevel: 'binding' });
  const saved = service.saveCourseScope('context', { totalDays: 1, unitsPerDay: 2, unitDurationMinutes: 45, targetAudience: { value: 'trainees' }, priorKnowledge: { value: 'basic' }, deliveryMode: 'presence' });
  const started = service.startDocumentAnalysis({ projectId: 'context', structureFrameSnapshot: saved.structureFrame });
  assert.throws(() => service.startDocumentAnalysis({ projectId: 'context', structureFrameSnapshot: saved.structureFrame }), /läuft bereits/);
  let progress;
  do { await new Promise((resolve) => setTimeout(resolve, 10)); progress = service.getAnalysisProgress(started.operationId); } while (!['completed', 'completed_with_warnings', 'failed', 'cancelled'].includes(progress.status));
  assert.equal(progress.status, 'completed');
  assert.match(analysisInput.extraction.sections.map((section) => `${section.title || ''} ${section.textPreview || section.content || ''}`).join(' '), /Segmentierung/);
  assert.equal(analysisInput.structureFrame.totalUnits, 2);
  assert.equal(analysisInput.project.courseGoal, 'Sicher planen');
  service.confirmTopicReview('context');
  const planning = service.startCoursePlanning({ projectId: 'context' });
  do { await new Promise((resolve) => setTimeout(resolve, 10)); progress = service.getOperationStatus(planning.operationId); } while (!['completed', 'failed', 'timed_out', 'cancelled'].includes(progress.status));
  assert.equal(planningInputs.length, 2);
  assert.equal(planningInputs[1].repairAttempt, 1);
  const project = service.getProject('context');
  assert.equal(project.coursePlanDrafts[0].days[0].units.length, 2);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('XLSM-Extraktion liest sichtbare und ausgeblendete Blätter ohne Makroausführung', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsm-fixture-'));
  const xlsm = path.join(root, 'kurs.xlsm');
  fs.writeFileSync(xlsm, createStoredZip({
    'xl/workbook.xml': '<workbook><sheets><sheet name="Plan" sheetId="1"/><sheet name="Intern" state="hidden" sheetId="2"/></sheets></workbook>',
    'xl/sharedStrings.xml': '<sst><si><t>Thema</t></si><si><t>Verborgener Hinweis</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>',
    'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c></row></sheetData></worksheet>'
  }));
  const workbook = readWorkbookXml(xlsm);
  assert.deepEqual(workbook.sheets.map(({ name, hidden }) => ({ name, hidden })), [{ name: 'Plan', hidden: false }, { name: 'Intern', hidden: true }]);
  const extracted = extractDocument({ id: 'xlsm', originalFileName: 'kurs.xlsm', storedFilePath: xlsm });
  assert.match(extracted.sections[0].content, /Thema/);
  assert.equal(extracted.sections[1].hidden, true);
  assert.match(extracted.sections[1].content, /Verborgener Hinweis/);
  assert.match(extracted.warnings.join(' '), /Makros wurden nicht ausgeführt/);
  fs.rmSync(root, { recursive: true, force: true });
});

function createStoredZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  Object.entries(entries).forEach(([name, value]) => {
    const fileName = Buffer.from(name);
    const data = Buffer.from(value);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(fileName.length, 26);
    locals.push(local, fileName, data);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(20, 6); header.writeUInt32LE(checksum, 16); header.writeUInt32LE(data.length, 20); header.writeUInt32LE(data.length, 24); header.writeUInt16LE(fileName.length, 28); header.writeUInt32LE(offset, 42);
    central.push(header, fileName);
    offset += local.length + fileName.length + data.length;
  });
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  const count = Object.keys(entries).length;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}

test('Analysecache bleibt bei Planungstimeout erhalten und Planung sendet nur Katalog plus Gerüst', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-pipeline-')); const source = path.join(factoryDir, 'quelle.md'); fs.writeFileSync(source, '# Routing\nSubnetting');
  let analysisCalls = 0; let planningInput;
  const provider = { name: 'fake', model: 'fake', isConfigured: () => true,
    async analyzeDocument(input) { analysisCalls += 1; return { documentId: input.document.id, documentType: 'markdown', detectedCategory: 'Quelle', summary: 'Routing', topics: [{ title: 'Routing', difficulty: 'basic' }], learningObjectives: [{ title: 'Subnetze planen' }], sourceReferences: [{ documentId: input.document.id, location: 'Abschnitt 1' }], confidence: 1 }; },
    async generateStructuredCoursePlan(input) { planningInput = input; return new Promise(() => {}); }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'split', title: 'Split' }); service.importSourceFile({ projectId: 'split', documentId: 'doc', sourcePath: source, originalFileName: 'quelle.md' });
  service.saveCourseScope('split', { totalDays: 2, unitsPerDay: 2, unitDurationMinutes: 45, targetAudience: { value: 'students' }, priorKnowledge: { value: 'none' } });
  let operation = service.startDocumentAnalysis({ projectId: 'split' }); let progress;
  do { await new Promise((resolve) => setTimeout(resolve, 5)); progress = service.getOperationStatus(operation.operationId); } while (!['completed', 'failed'].includes(progress.status));
  operation = service.startDocumentAnalysis({ projectId: 'split' });
  do { await new Promise((resolve) => setTimeout(resolve, 5)); progress = service.getOperationStatus(operation.operationId); } while (!['completed', 'failed'].includes(progress.status));
  assert.equal(analysisCalls, 1);
  service.confirmTopicReview('split');
  operation = service.startCoursePlanning({ projectId: 'split', timeoutMs: 5 });
  do { await new Promise((resolve) => setTimeout(resolve, 5)); progress = service.getOperationStatus(operation.operationId); } while (!['completed', 'failed', 'timed_out'].includes(progress.status));
  const project = service.getProject('split');
  assert.equal(progress.status, 'timed_out'); assert.equal(project.pipelinePhases.document_analysis.status, 'completed'); assert.equal(project.documentAnalyses.length, 1);
  assert.ok(planningInput.topicCatalog.topics.length); assert.equal('documentAnalyses' in planningInput, false); assert.equal(planningInput.ueScaffold.days.length, 2);
  const result = service.getPlanningResult(operation.operationId); assert.equal(JSON.stringify(result).includes('extraction'), false);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Unterrichtsplanung reicht ein Provider-Zeitlimit oberhalb von 30 Sekunden durch', async () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-provider-timeout-'));
  const source = path.join(factoryDir, 'quelle.md');
  fs.writeFileSync(source, '# HTML und CSS\nSemantische Struktur und Gestaltung');
  let receivedOptions;
  const provider = {
    name: 'fake',
    model: 'fake',
    isConfigured: () => true,
    async analyzeDocument(input) {
      return {
        documentId: input.document.id,
        documentType: 'markdown',
        detectedCategory: 'Quelle',
        summary: 'HTML und CSS',
        topics: [{ title: 'HTML und CSS', difficulty: 'basic' }],
        learningObjectives: [{ title: 'Webseiten strukturieren' }],
        sourceReferences: [{ documentId: input.document.id, location: 'Abschnitt 1' }],
        confidence: 1
      };
    },
    async generateStructuredCoursePlan(input, options) {
      receivedOptions = options;
      return {
        summary: 'Plan',
        days: input.ueScaffold.days.map((day) => ({
          ...day,
          units: day.units.map((unit) => ({
            ...unit,
            topic: 'HTML und CSS',
            content: 'Semantische Struktur',
            competencyGoal: 'Strukturen erstellen',
            workFormat: { key: 'guided_practice', label: 'Angeleitete Übung' },
            sourceReferences: [{ documentId: 'doc', fileName: 'quelle.md' }],
            warnings: [],
            assumptions: [],
            originStatus: 'explicit',
            confidence: 1,
            reviewStatus: 'open'
          }))
        })),
        excludedTopics: [],
        unscheduledTopics: [],
        conflicts: [],
        missingInformation: [],
        warnings: [],
        reviewItems: []
      };
    }
  };
  const service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'slow-plan', title: 'Slow Plan' });
  service.importSourceFile({ projectId: 'slow-plan', documentId: 'doc', sourcePath: source, originalFileName: 'quelle.md' });
  service.saveCourseScope('slow-plan', { totalDays: 1, unitsPerDay: 1, unitDurationMinutes: 45, targetAudience: { value: 'students' }, priorKnowledge: { value: 'none' } });
  let operation = service.startDocumentAnalysis({ projectId: 'slow-plan' });
  let progress;
  do { await new Promise((resolve) => setTimeout(resolve, 5)); progress = service.getOperationStatus(operation.operationId); } while (!['completed', 'failed'].includes(progress.status));
  service.confirmTopicReview('slow-plan');
  operation = service.startCoursePlanning({ projectId: 'slow-plan' });
  do { await new Promise((resolve) => setTimeout(resolve, 5)); progress = service.getOperationStatus(operation.operationId); } while (!['completed', 'failed', 'timed_out'].includes(progress.status));
  assert.equal(progress.status, 'completed');
  assert.equal(receivedOptions.timeoutMs, PLANNING_PROVIDER_TIMEOUT_MS);
  assert.ok(receivedOptions.timeoutMs > 30000);
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

test('Renderer erhält keine API-Schlüssel über die Preload-Oberfläche', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'app', 'preload.js'), 'utf8');
  assert.doesNotMatch(preload, /OPENAI_API_KEY|getOpenAiKeyForServerUse/);
  assert.match(preload, /DOCUMENT_ANALYSIS_CHANNELS\.start/);
  assert.match(preload, /approve-structured-course-plan/);
});

test('Planungsprompt und Review bleiben fachneutral und Materialgeneratoren sind erweiterbar', () => {
  const provider = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'content-factory', 'ai', 'openai-provider.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');
  const generators = fs.readFileSync(path.join(__dirname, '..', 'app', 'lib', 'content-factory', 'artifact-generators', 'artifact-generator-service.js'), 'utf8');
  assert.match(provider, /Das System ist fachneutral/);
  assert.match(provider, /materialRequirements/);
  assert.match(renderer, /edit\('materials'/);
  assert.match(generators, /registerArtifactGenerator/);
});

test('Electron-Cache wird vor dem Browserfenster unter LOCALAPPDATA konfiguriert', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'app', 'main.js'), 'utf8');
  assert.match(main, /process\.env\.LOCALAPPDATA/);
  assert.ok(main.indexOf("app.setPath('cache'") < main.indexOf('function createWindow'));
  assert.doesNotMatch(main, /disk-cache-dir[^\n]*OneDrive/);
});
