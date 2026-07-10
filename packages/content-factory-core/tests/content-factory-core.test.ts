import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeGaps,
  buildDraftContainer,
  classifyUploadedFile,
  classifyUploads,
  createEmptyWizardState,
  createFallbackCoursePlan,
  getAllStepGates,
  getStepGate,
  getUploadCategory,
  mapFilesToDays,
  normalizeArchivePath,
  uploadCategoryDefinitions,
  validateDraftExport
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

test('wizard locks review when no uploads exist', () => {
  const state = createEmptyWizardState({
    courseName: 'LF05 FIAE Grundlagen',
    courseId: 'lf05-fiae-grundlagen',
    department: 'FIAE'
  });
  state.coursePlan = createFallbackCoursePlan({ fileName: 'LF05_FIAE.xlsx' });
  state.coursePlanConfirmed = true;

  assert.equal(getStepGate(state, 'review').accessible, false);
  assert.match(getStepGate(state, 'review').missing.join(' '), /Material|ZIP/);
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
