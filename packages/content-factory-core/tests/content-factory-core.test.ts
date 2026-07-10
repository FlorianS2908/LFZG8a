import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeGaps,
  AiOrchestrator,
  buildDraftContainer,
  classifyUploadedFile,
  classifyUploads,
  createEmptyWizardState,
  createFallbackCoursePlan,
  createPlanOnlyMappings,
  createDayDraftFromPlan,
  getAllStepGates,
  getStepGate,
  getUploadCategory,
  listCoursePlanSheets,
  LocalHeuristicProvider,
  mapFilesToDays,
  normalizeArchivePath,
  OpenAIProvider,
  parseCoursePlanFromCsvText,
  runNamingConsistency,
  uploadCategoryDefinitions,
  validateDraftExport,
  validateQuizQuestions
} from '../src/index.ts';

test('classification detects common web and code file types by context', () => {
  assert.equal(classifyUploadedFile({ fileName: 'tag_01_webvariante.html' }).technicalType, 'web-document');
  assert.equal(classifyUploadedFile({ fileName: 'src/index.html' }).technicalType, 'source-code');
  assert.equal(classifyUploadedFile({ fileName: 'styles/app.css' }).technicalType, 'source-code');
  assert.equal(classifyUploadedFile({ fileName: 'scripts/app.js' }).technicalType, 'source-code');
  assert.equal(classifyUploadedFile({ fileName: 'server/index.php' }).language, 'php');
  assert.equal(classifyUploadedFile({ fileName: 'src/Main.java' }).language, 'java');
  assert.equal(classifyUploadedFile({ fileName: 'src/Program.cs' }).language, 'csharp');
});

test('classification detects SQL, quiz JSON and unknown files', () => {
  assert.equal(classifyUploadedFile({ fileName: 'datenbank/schema.sql' }).technicalType, 'database');
  assert.equal(classifyUploadedFile({ fileName: 'quiz/fragenpool_tag_01.json' }).technicalType, 'quiz');
  const unknown = classifyUploadedFile({ fileName: 'rohmaterial/datei.xyz' });
  assert.equal(unknown.technicalType, 'unknown');
  assert.equal(unknown.contentCategory, 'other');
});

test('classification accepts XML Word and TXT question pools in quiz upload area', () => {
  assert.equal(classifyUploadedFile({ fileName: 'fragenpool.xml', uploadArea: 'quiz' }).technicalType, 'quiz');
  assert.equal(classifyUploadedFile({ fileName: 'fragenpool.docx', uploadArea: 'quiz' }).contentCategory, 'quiz');
  assert.equal(classifyUploadedFile({ fileName: 'fragenpool.txt', uploadArea: 'quiz' }).contentCategory, 'quiz');
});

test('classification accepts Word and PDF files as course plans in the course-plan upload area', () => {
  assert.equal(classifyUploadedFile({ fileName: 'Unterrichtsplan.docx', uploadArea: 'course-plan' }).technicalType, 'course-plan');
  assert.equal(classifyUploadedFile({ fileName: 'Unterrichtsplan.pdf', uploadArea: 'course-plan' }).contentCategory, 'course-plan');
});

test('security rules prevent zip slip and flag ignored or blocked files', () => {
  assert.equal(normalizeArchivePath('../evil.txt').safe, false);
  assert.equal(classifyUploadedFile({ fileName: 'node_modules/pkg/index.js' }).ignored, true);
  assert.equal(classifyUploadedFile({ fileName: '.env' }).blocked, true);
  assert.equal(classifyUploadedFile({ fileName: 'tools/setup.exe' }).blocked, true);
});

test('course plan is required for container export', () => {
  assert.throws(() => buildDraftContainer({
    mappings: [],
    gapAnalysis: { warnings: [], conflicts: [], gaps: [], riskFiles: [] }
  }), /Unterrichtsplan ist Pflicht/);
});

test('draft export creates safe catalog, source map and analysis report without participant solutions', () => {
  const plan = createFallbackCoursePlan({ fileName: 'HTML_CSS_FIAE.xlsx' });
  const files = classifyUploads([
    { fileName: 'tag_01_aufgabe.html', uploadArea: 'tasks' },
    { fileName: 'tag_01_loesung.html', uploadArea: 'solutions' },
    { fileName: 'tag_01_quiz.json', uploadArea: 'quiz' }
  ]);
  const mappings = mapFilesToDays(plan, files);
  const gaps = analyzeGaps(mappings, files);
  const draft = buildDraftContainer({ coursePlan: plan, mappings, gapAnalysis: gaps, containerId: 'html-css-fiae' });
  const paths = draft.files.map((file) => file.path);

  assert.ok(paths.includes('manifest.json'));
  assert.ok(paths.includes('catalog/days.json'));
  assert.ok(paths.includes('source-map.json'));
  assert.ok(paths.includes('reports/html-css-fiae-analysis-report.json'));
  assert.equal(paths.some((path) => /^teilnehmer\/.*loes/i.test(path)), false);
  assert.deepEqual(validateDraftExport(draft), []);
});

test('dual-mode manifest, platform adapter and standalone runner are generated', () => {
  const plan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  plan.courseTitle = 'Kursname bei Kurs-ID';
  plan.courseId = 'kurs-id';
  const files = classifyUploads([{ fileName: 'tag_01_aufgabe.html', uploadArea: 'tasks' }]);
  const mappings = mapFilesToDays(plan, files);
  const draft = buildDraftContainer({ coursePlan: plan, mappings, gapAnalysis: analyzeGaps(mappings, files) });
  const byPath = new Map(draft.files.map((file) => [file.path, file.content]));
  const manifest = JSON.parse(byPath.get('manifest.json') || '{}');
  const adapter = JSON.parse(byPath.get('platform/adapter.json') || '{}');

  assert.equal(manifest.runtimeModes.standalone.entry, 'standalone/index.html');
  assert.equal(manifest.runtimeModes.platform.adapter, 'platform/adapter.json');
  assert.equal(adapter.courseName, 'Kursname bei Kurs-ID');
  assert.equal(adapter.roles.participant.canSeeSolutions, false);
  assert.ok(byPath.has('standalone/index.html'));
  assert.match(byPath.get('standalone/index.html') || '', /Standalone-Vorschau/);
});

test('course name from input replaces visible legacy names while source map may keep originals', () => {
  const plan = createFallbackCoursePlan({ fileName: 'LFZQ8a_Altbestand.xlsx' });
  plan.courseTitle = 'LF05 FIAE';
  plan.courseId = 'lf05-fiae';
  const files = classifyUploads([{ fileName: 'LFZQ8a_tag_01_aufgabe.html', uploadArea: 'tasks' }]);
  const mappings = mapFilesToDays(plan, files);
  const draft = buildDraftContainer({ coursePlan: plan, mappings, gapAnalysis: analyzeGaps(mappings, files) });
  const visibleFiles = draft.files.filter((file) => file.path !== 'source-map.json' && !file.path.startsWith('reports/'));
  const visibleText = visibleFiles.map((file) => file.content).join('\n');

  assert.equal(runNamingConsistency(visibleFiles, 'LF05 FIAE').ok, true);
  assert.doesNotMatch(visibleText, /LFZQ8a/);
  assert.match(draft.files.find((file) => file.path === 'source-map.json')?.content || '', /LFZQ8a/);
});

test('release keys are unique and catalog paths exist', () => {
  const plan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  const files = classifyUploads([{ fileName: 'tag_01_aufgabe.html', uploadArea: 'tasks' }]);
  const mappings = mapFilesToDays(plan, files);
  const draft = buildDraftContainer({ coursePlan: plan, mappings, gapAnalysis: analyzeGaps(mappings, files) });
  const releaseKeys = JSON.parse(draft.files.find((file) => file.path === 'catalog/release-keys.json')?.content || '[]');

  assert.equal(new Set(releaseKeys).size, releaseKeys.length);
  assert.deepEqual(validateDraftExport(draft), []);
});

test('output validator blocks env files and executable files', () => {
  const plan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  const draft = buildDraftContainer({ coursePlan: plan, mappings: mapFilesToDays(plan, []), gapAnalysis: { warnings: [], conflicts: [], gaps: [], riskFiles: [] } });
  draft.files.push({ path: '.env', content: 'SECRET=1' });
  draft.files.push({ path: 'tools/setup.exe', content: '' });

  assert.match(validateDraftExport(draft).join(' '), /\.env/);
  assert.match(validateDraftExport(draft).join(' '), /Ausfuehrbare Datei/);
});

test('quiz validation detects invalid correct indexes', () => {
  assert.deepEqual(validateQuizQuestions([{ id: 'q1', options: ['A'], correct: [2] }]), ['q1: correct-Index 2 ist ungueltig.']);
});

test('local heuristic provider works without API key and orchestrator falls back locally', async () => {
  const local = new LocalHeuristicProvider();
  assert.equal(await local.isConfigured(), true);
  const orchestrator = new AiOrchestrator([new OpenAIProvider('', '')]);
  const selected = await orchestrator.selectProvider();
  const draft = await orchestrator.generateDayDraft({ dayNumber: 1, title: 'Tag 1', courseName: 'LF05 FIAE', sourceTexts: [] });

  assert.equal(selected.name, 'local');
  assert.equal(draft.dayNumber, 1);
  assert.equal(draft.solutions.length, 1);
});

test('wizard locks step 2 when course data is missing', () => {
  const state = createEmptyWizardState();
  const gate = getStepGate(state, 'course-plan');

  assert.equal(gate.accessible, false);
  assert.match(gate.missing[0], /Kursname/);
});

test('wizard locks upload step when course plan is missing or unconfirmed', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });

  assert.equal(getStepGate(state, 'uploads').accessible, false);
  assert.match(getStepGate(state, 'uploads').missing.join(' '), /Unterrichtsplan/);

  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  assert.equal(getStepGate(state, 'uploads').accessible, false);
  assert.match(getStepGate(state, 'uploads').missing.join(' '), /bestaetigen/);
});

test('wizard allows plan-only review after confirmed course plan', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;

  assert.equal(getStepGate(state, 'uploads').accessible, true);
  assert.equal(getStepGate(state, 'review').accessible, true);
});

test('course plan parser creates sheet list and recognizes days from plan text', () => {
  const text = '--- sheet: Variante A ---\nTag;Titel;Thema;Lernziel;UE;Zeit;Lehraufgabe;Lernaufgabe;Evaluation;Ressourcen;Hinweis\n1;Tag 1;CSS Grundlagen;Selektoren verstehen;4;09:00;Boxmodell erklaeren;Selektoren ueben;Kurzcheck;Handout;Start\n2;Tag 2;Flexbox;Layouts bauen;4;09:00;Demo;Navigation bauen;Review;Slides;\n--- sheet: Variante B ---\nTag;Titel;Thema\n1;Alternativ;Projekt';
  const sheets = listCoursePlanSheets({ fileName: 'Plan.xlsx', text });
  const plan = parseCoursePlanFromCsvText('Tag;Titel;Thema;Lernziel;UE;Zeit;Lehraufgabe;Lernaufgabe;Evaluation;Ressourcen;Hinweis\n1;Tag 1;CSS Grundlagen;Selektoren verstehen;4;09:00;Boxmodell erklaeren;Selektoren ueben;Kurzcheck;Handout;Start', 'LF05_FIAE.xlsx', { courseTitle: 'LF05 FIAE', selectedSheet: 'Variante A' });

  assert.deepEqual(sheets.map((sheet) => sheet.name), ['Variante A', 'Variante B']);
  assert.equal(plan.selectedSheet, 'Variante A');
  assert.equal(plan.days.length, 1);
  assert.equal(plan.days[0].ueBlocks?.[0].learnerTask, 'Selektoren ueben');
});

test('plan-only draft creates dual-mode container files for every day', () => {
  const plan = parseCoursePlanFromCsvText('Tag;Titel;Thema;Lernziel;UE;Zeit;Lehraufgabe;Lernaufgabe;Evaluation;Ressourcen\n1;Tag 1;CSS Grundlagen;Selektoren verstehen;4;09:00;Boxmodell erklaeren;Selektoren ueben;Kurzcheck;Handout', 'LF05_FIAE.xlsx', { courseTitle: 'LF05 FIAE', courseId: 'lf05-fiae', department: 'FIAE', selectedSheet: 'Tabelle1' });
  const mappings = createPlanOnlyMappings(plan);
  const draft = buildDraftContainer({ coursePlan: plan, mappings, gapAnalysis: { warnings: [], conflicts: [], gaps: [], riskFiles: [] } });
  const byPath = new Map(draft.files.map((file) => [file.path, file.content]));
  const days = JSON.parse(byPath.get('catalog/days.json') || '[]');

  assert.equal(days[0].webTeacher, 'dozent/tag_01/webvariante.html');
  assert.equal(days[0].webParticipant, 'teilnehmer/tag_01/webvariante.html');
  assert.ok(byPath.has('dozent/tag_01/loesungen.html'));
  assert.ok(byPath.has('teilnehmer/tag_01/aufgaben.html'));
  assert.ok(byPath.has('shared/quiz/tag_01.json'));
  assert.match(byPath.get('dozent/tag_01/webvariante.html') || '', /Automatisch aus Unterrichtsplan erzeugt/);
  assert.match(byPath.get('teilnehmer/tag_01/webvariante.html') || '', /Selektoren ueben/);
  assert.doesNotMatch(byPath.get('teilnehmer/tag_01/webvariante.html') || '', /Loesung|Loesungen|solution/i);
  assert.deepEqual(validateDraftExport(draft), []);
});

test('local plan day draft marks generated content and keeps solutions teacher-only', () => {
  const plan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  const draft = createDayDraftFromPlan(plan.days[0], 'LF05 FIAE');

  assert.match(draft.teacherWebHtml, /Automatisch aus Unterrichtsplan erzeugt/);
  assert.match(draft.solutionsHtml, /Loesung/);
  assert.doesNotMatch(draft.participantWebHtml, /Loesung|solution/i);
});

test('wizard locks day mapping until analysis is complete', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;
  state.uploadedFiles = classifyUploads([{ fileName: 'tag_01_aufgabe.html', uploadArea: 'tasks' }]);

  assert.equal(getStepGate(state, 'day-mapping').accessible, false);
  assert.match(getStepGate(state, 'day-mapping').missing.join(' '), /Dateianalyse/);
});

test('export is locked without course plan and locked steps explain what is missing', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  const gates = getAllStepGates(state);
  const exportGate = gates.find((gate) => gate.step === 'export');

  assert.equal(exportGate?.accessible, false);
  assert.match(exportGate?.missing.join(' '), /Unterrichtsplan/);
});

test('upload areas expose context and safety descriptions', () => {
  assert.ok(uploadCategoryDefinitions.length >= 9);
  assert.match(getUploadCategory('ai-materials')?.description || '', /keine fertigen Materialien/);
  assert.match(getUploadCategory('materials')?.description || '', /Materialien/);
  assert.deepEqual(getUploadCategory('quiz')?.accept, ['.json', '.xml', '.docx', '.txt']);
  assert.match(getUploadCategory('solutions')?.safetyNote || '', /Teilnehmerbereich/);
  assert.match(getUploadCategory('source-code')?.safetyNote || '', /nicht ausgefuehrt/);
  assert.match(getUploadCategory('database')?.safetyNote || '', /nicht automatisch ausgefuehrt/);
  assert.match(getUploadCategory('zip-package')?.safetyNote || '', /\.git|node_modules|\.env/);
});

test('unclear files block continuation until reviewed', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;
  state.analysisCompleted = true;
  state.uploadedFiles = classifyUploads([{ fileName: 'rohmaterial/datei.xyz', uploadArea: 'other' }]);
  state.mappings = mapFilesToDays(state.coursePlan, state.uploadedFiles);

  assert.equal(getStepGate(state, 'gap-analysis').accessible, false);
  state.reviewStates[state.uploadedFiles[0].fileId] = 'ignored';
  state.mappings.forEach((mapping) => {
    state.dayApproval[mapping.dayNumber] = 'skipped';
  });
  assert.equal(getStepGate(state, 'gap-analysis').accessible, true);
});

test('critical gaps block day preview until handled', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;
  state.analysisCompleted = true;
  state.uploadedFiles = classifyUploads([{ fileName: 'tag_01_loesung.html', uploadArea: 'solutions' }]);
  state.reviewStates[state.uploadedFiles[0].fileId] = 'confirmed';
  state.mappings = mapFilesToDays(state.coursePlan, state.uploadedFiles);
  state.mappings.forEach((mapping) => {
    state.dayApproval[mapping.dayNumber] = mapping.dayNumber === 1 ? 'confirmed' : 'skipped';
  });
  state.gaps = [{ id: 'gap-1', message: 'Loesung ohne Aufgabe.', severity: 'critical', state: 'open', dayNumber: 1 }];

  assert.equal(getStepGate(state, 'day-preview').accessible, false);
  state.gaps[0].state = 'later';
  assert.equal(getStepGate(state, 'day-preview').accessible, true);
});

test('gap analysis is locked until all day mappings are confirmed or skipped', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;
  state.analysisCompleted = true;
  state.uploadedFiles = classifyUploads([{ fileName: 'tag_01_aufgabe.html', uploadArea: 'tasks' }]);
  state.reviewStates[state.uploadedFiles[0].fileId] = 'confirmed';
  state.mappings = mapFilesToDays(state.coursePlan, state.uploadedFiles);

  assert.equal(getStepGate(state, 'gap-analysis').accessible, false);
  state.mappings.forEach((mapping) => {
    state.dayApproval[mapping.dayNumber] = mapping.dayNumber === 1 ? 'confirmed' : 'skipped';
  });
  assert.equal(getStepGate(state, 'gap-analysis').accessible, true);
  assert.equal(getStepGate(state, 'day-mapping').status, 'done');
});

test('export warns when open hints are intentionally allowed', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;
  state.analysisCompleted = true;
  state.uploadedFiles = classifyUploads([{ fileName: 'tag_01_aufgabe.html', uploadArea: 'tasks' }]);
  state.reviewStates[state.uploadedFiles[0].fileId] = 'confirmed';
  state.mappings = mapFilesToDays(state.coursePlan, state.uploadedFiles);
  state.mappings.forEach((mapping) => {
    state.dayApproval[mapping.dayNumber] = mapping.dayNumber === 1 ? 'confirmed' : 'skipped';
  });
  state.gaps = [{ id: 'gap-1', message: 'Bitte spaeter pruefen.', severity: 'important', state: 'open' }];
  state.previews = [{ dayNumber: 1, title: 'Tag 1', html: '<h1>Tag 1</h1>', warnings: [] }];
  state.allowDraftWithOpenWarnings = true;

  assert.equal(getStepGate(state, 'export').accessible, true);
  assert.equal(getStepGate(state, 'export').status, 'warning');
});
