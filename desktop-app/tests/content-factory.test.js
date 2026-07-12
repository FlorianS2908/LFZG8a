const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { createAppData, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } = require('../app/lib/app-data');
const { createContentFactoryService } = require('../app/lib/content-factory/content-factory-service');
const { detectTargetArea, extractDayNumber, detectFileKind } = require('../app/lib/content-factory/file-type-rules');
const { createMappingSuggestion, applyMapping } = require('../app/lib/content-factory/mapping-service');
const { extractSourceOutline } = require('../app/lib/content-factory/source-extraction/source-extractor-service');
const { AiOrchestrator } = require('../app/lib/content-factory/ai/ai-orchestrator');
const { LocalHeuristicProvider } = require('../app/lib/content-factory/ai/local-heuristic-provider');
const { sanitizeInput, parseJsonLoose } = require('../app/lib/content-factory/ai/openai-provider');
const { OpenAIProvider } = require('../app/lib/content-factory/ai/openai-provider');
const { createAiKeyStoreService } = require('../app/lib/content-factory/ai/ai-key-store-service');
const { assessCurriculumQuality } = require('../app/lib/content-factory/curriculum-planner/curriculum-quality-service');
const { decideArtifactSuggestions } = require('../app/lib/content-factory/container-profile/audience-artifact-decision-service');
const { suggestionsToTargets } = require('../app/lib/content-factory/container-profile/artifact-target-service');
const { generateArtifactFiles } = require('../app/lib/content-factory/artifact-generators/artifact-generator-service');
const { validateGeneratedArtifacts } = require('../app/lib/content-factory/container-profile/generated-artifact-validator');
const { runPreflight } = require('../app/lib/content-factory/preflight/preflight-service');
const { listPresets, applyPreset } = require('../app/lib/content-factory/presets/preset-service');
const { buildPrompt, runPromptQualityGate } = require('../app/lib/content-factory/ai-quality-gate/ai-quality-gate-service');
const { lintPrompt } = require('../app/lib/content-factory/ai-quality-gate/prompt-linter');
const { reviewOutput, reviewArtifactContent } = require('../app/lib/content-factory/ai-quality-gate/output-review-service');
const { loadAppEnv, getOpenAiApiKey } = require('../app/lib/env/env-loader');
const { estimateContentFactoryCost } = require('../app/lib/content-factory/ai/cost-estimator');
const { validateGeneratedContainer } = require('../app/lib/content-factory/generated-container-validator');
const { inferDemoTargetsForDays } = require('../app/lib/content-factory/demo-targets/demo-target-service');
const { generateDemoArtifacts } = require('../app/lib/content-factory/demo-targets/demo-artifact-generator');
const { openDemoTarget } = require('../app/lib/demo-launcher/demo-launcher-service');
const { listDidacticProfiles, getDidacticProfile, suggestDidacticProfile, recommendDidacticProfiles } = require('../app/lib/content-factory/didactics/didactic-profile-service');
const { evaluateDidacticFit } = require('../app/lib/content-factory/didactics/didactic-fit-service');
const { createDidacticPreview } = require('../app/lib/content-factory/didactics/didactic-preview-service');
const { runDidacticQualityGate } = require('../app/lib/content-factory/didactics/didactic-quality-gate');
const { contracts } = require('../app/lib/content-factory/ai/prompts/contracts');
const { dayDraftContract } = require('../app/lib/content-factory/ai/prompts/contracts/day-draft-contract');
const promptBuilder = require('../app/lib/content-factory/ai/prompts/prompt-builder');
const contractPromptLinter = require('../app/lib/content-factory/ai/prompts/prompt-linter');
const { runGoldenPromptTest, summarizeGoldenPromptTests } = require('../app/lib/content-factory/ai/prompts/golden-tests/golden-test-runner');
const { createDropZoneHtml, validateUploadSelection, addFilesToUploadState, removeUploadFile, removeDropZoneFile, renderFileList } = require('../app/renderer/tool-center/factory-upload-utils');

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
  assert.equal(detectTargetArea('material.pdf'), 'material');
  assert.equal(detectTargetArea('Fachbuch_Datenbanken.pdf'), 'referenceLiterature');
  assert.equal(detectTargetArea('referenz.epub'), 'referenceLiterature');
  assert.equal(detectFileKind('grafik.png'), 'image');
  assert.equal(detectFileKind('material.pdf'), 'document');
  assert.equal(extractDayNumber('LFZQ8a_tag_10_Webvariante.html'), 10);
  assert.equal(extractDayNumber('day01_task.html'), 1);
});

test('content factory upload dropzone utils validate multi file selections safely', () => {
  const existing = [{ name: 'material.pdf', size: 12, lastModified: 1, uploadArea: 'materials' }];
  const selection = validateUploadSelection([
    { name: 'material.pdf', path: 'fixtures/material.pdf', size: 12, type: 'application/pdf', lastModified: 1 },
    { name: 'fragen.xml', path: 'fixtures/fragen.xml', size: 120, type: 'text/xml', lastModified: 2 },
    { name: 'start.cmd', path: 'fixtures/start.cmd', size: 10, type: 'text/plain', lastModified: 3 }
  ], { id: 'quiz', accept: '.json,.xml,.docx,.txt,.zip', source: 'drop' }, existing);
  const combined = [...existing, ...selection.files];
  const removed = removeDropZoneFile(combined, 'quiz', 0);
  const added = addFilesToUploadState(existing, [{ name: 'neu.zip', path: 'fixtures/neu.zip', size: 99, type: 'application/zip', lastModified: 4 }], { id: 'materials', accept: '.pdf,.zip', source: 'picker' });
  const removedById = removeUploadFile([{ id: 'keep' }, { id: 'remove' }], 'remove');
  const html = renderFileList(selection.files, (value) => String(value));
  const dropzoneHtml = createDropZoneHtml({ id: 'materials', title: 'Materialien', accept: '.pdf,.zip', files: added.files, multiple: true });

  assert.equal(selection.files.length, 2);
  assert.equal(selection.blockedFiles.length, 1);
  assert.equal(selection.files[0].duplicate, true);
  assert.equal(selection.files.every((file) => file.uploadArea === 'quiz'), true);
  assert.equal(added.files.length, 2);
  assert.equal(removedById.length, 1);
  assert.equal(removed.some((file) => file.name === 'material.pdf' && file.uploadArea === 'quiz'), false);
  assert.match(html, /dropzone-file-list/);
  assert.match(html, /data-dropzone-remove="quiz:0"/);
  assert.match(dropzoneHtml, /multiple/);
  assert.match(dropzoneHtml, /data-dropzone="materials"/);
});

test('content factory extracts safe source outlines from office epub text and pdf fallbacks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-outlines-'));
  try {
    const mdPath = path.join(dir, 'curriculum.md');
    fs.writeFileSync(mdPath, '# Datenbanken\n\nGrundlagen und Tabellen.\n\n## SQL Abfragen\nSELECT nur als Thema.', 'utf8');
    const pptxPath = path.join(dir, 'slides.pptx');
    const docxPath = path.join(dir, 'doc.docx');
    const epubPath = path.join(dir, 'book.epub');
    const pdfPath = path.join(dir, 'fallback.pdf');

    createZip(pptxPath, {
      'ppt/slides/slide1.xml': '<p:sld><a:t>Agenda</a:t><a:t>Ignoriert</a:t></p:sld>',
      'ppt/slides/slide2.xml': '<p:sld><a:t>Normalisierung</a:t><a:t>Tabellen strukturieren</a:t></p:sld>'
    });
    createZip(docxPath, {
      'word/document.xml': '<w:document><w:t>Netzwerk Grundlagen</w:t><w:t>IP Adressen und Subnetze</w:t></w:document>'
    });
    createZip(epubPath, {
      'OPS/chapter1.xhtml': '<html><body><h1>Programmierung</h1><p>Variablen und Kontrollstrukturen.</p></body></html>'
    });
    fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj\n(Objektorientierung und Klassen) Tj\nendobj', 'latin1');

    const md = extractSourceOutline({ name: 'curriculum.md', path: mdPath });
    const ppt = extractSourceOutline({ name: 'slides.pptx', path: pptxPath }, { ranges: [{ type: 'slides', from: 2, to: 2 }] });
    const doc = extractSourceOutline({ name: 'doc.docx', path: docxPath });
    const epub = extractSourceOutline({ name: 'book.epub', path: epubPath });
    const pdf = extractSourceOutline({ name: 'fallback.pdf', path: pdfPath });

    assert.equal(md.sections.some((section) => section.title === 'Datenbanken'), true);
    assert.equal(ppt.sections.length, 1);
    assert.equal(ppt.sections[0].title, 'Normalisierung');
    assert.equal(doc.sections.some((section) => /Netzwerk/.test(section.title)), true);
    assert.equal(epub.sections.some((section) => /Programmierung/.test(section.title)), true);
    assert.equal(pdf.format, 'pdf');
    assert.ok(['medium', 'high', 'low'].includes(pdf.quality.level));
    assert.equal(ppt.quality.usedFallback, false);
    assert.ok(md.quality.score >= 0.45);
    assert.equal(Array.isArray(pdf.warnings), true);
    assert.ok((ppt.sections[0].textPreview || '').length <= 180);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('content factory productive MVP creates draft with runtime modes and standalone', async () => {
  const { dir, service, session, cleanup } = createTempFactory();

  try {
    const planPath = path.join(dir, 'Plan.xlsx');
    fs.writeFileSync(planPath, 'placeholder', 'utf8');
    const anchor = service.createCurriculumAnchor({
      type: 'course-plan',
      title: 'LF05 FIAE',
      sourceFiles: [{ name: 'Plan.xlsx', path: planPath }]
    }, session);
    let curriculum = await service.analyzeCurriculumAnchor({
      anchor,
      course: { courseName: 'LF05 FIAE', courseId: 'lf05-fiae', department: 'FIAE' },
      duration: { durationMode: 'days', numberOfDays: 2, uePerDay: 9, hoursPerDay: 8 },
      targetAudience: { department: 'FIAE', priorKnowledge: 'basic', difficultyMode: 'normal' },
      courseGoal: 'HTML und CSS Grundlagen',
      expectedOutcome: 'webseite',
      didacticStyle: 'guided'
    }, session);
    await assert.rejects(() => service.generateDayDraft({
      course: { courseName: 'LF05 FIAE', courseId: 'lf05-fiae', department: 'FIAE' },
      curriculumPlan: curriculum,
      day: curriculum.days[0],
      aiMode: 'local'
    }, session), /Freigabe/);
    curriculum = service.approveCurriculumDraft(curriculum.id, session);
    const plan = {
      courseTitle: curriculum.course.courseName,
      courseId: curriculum.course.courseId,
      department: curriculum.course.department,
      sourceFile: curriculum.anchor.title,
      selectedSheet: 'Curriculum Planner',
      days: curriculum.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        mainTopic: day.mainTopic,
        learningGoals: day.learningGoals,
        subTopics: [],
        ueBlocks: day.topics.map((topic) => ({ topic: topic.title, learnerTask: topic.summary, teacherTask: topic.summary, evaluation: `Pruefen: ${topic.title}`, resources: topic.sourceRefs.join(', ') })),
        pauses: [],
        warnings: day.warnings
      })),
      warnings: []
    };
    const draftDay = await service.generateDayDraft({
      course: { courseName: 'LF05 FIAE', courseId: 'lf05-fiae', department: 'FIAE' },
      coursePlan: plan,
      approvedCurriculumPlan: curriculum,
      day: plan.days[0],
      aiMode: 'openai',
      useReferences: false
    }, session);
    const allDays = await service.generateAllDayDrafts({
      course: { courseName: 'LF05 FIAE', courseId: 'lf05-fiae', department: 'FIAE' },
      coursePlan: plan,
      approvedCurriculumPlan: curriculum,
      aiMode: 'openai',
      useReferences: false
    }, session);
    const draft = service.createPlanContainerDraft({
      course: { courseName: 'LF05 FIAE', courseId: 'lf05-fiae', department: 'FIAE' },
      coursePlan: plan,
      approvedCurriculumPlan: curriculum,
      dayResults: allDays,
      aiMode: 'openai',
      targetAudience: { department: 'FIAE', priorKnowledge: 'intermediate', projectOrientation: true },
      containerProfile: { courseType: 'java-maven', artifactMode: 'web-and-files', generateReadme: true, generateStarterFiles: true, generateSolutionFiles: true }
    }, session);
    const manifest = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'manifest.json'), 'utf8'));
    const participantWeb = fs.readFileSync(path.join(draft.storagePath, 'teilnehmer', 'tag_01', 'webvariante.html'), 'utf8');
    const participantContent = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'participant-content.json'), 'utf8'));
    const sourceMap = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'source-map.json'), 'utf8'));
    const standalone = fs.readFileSync(path.join(draft.storagePath, 'standalone', 'index.html'), 'utf8');
    const reportHtml = fs.readFileSync(path.join(draft.storagePath, 'reports', `${draft.containerId}-analysis-report.html`), 'utf8');
    const testProtocol = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'reports', 'testprotokoll.json'), 'utf8'));
    const testProtocolHtml = fs.readFileSync(path.join(draft.storagePath, 'reports', 'testprotokoll.html'), 'utf8');
    const artifacts = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'artifacts.json'), 'utf8'));
    const demoTargets = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'demo-targets.json'), 'utf8'));
    const didacticProfile = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'didactic-profile.json'), 'utf8'));
    const releasePlan = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'release-plan.json'), 'utf8'));
    const days = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'days.json'), 'utf8'));

    assert.equal(draftDay.warnings.some((warning) => /OpenAI ist nicht konfiguriert|Quality Gate|Fallback/.test(warning)), true);
    assert.equal(allDays.length, 2);
    assert.ok(allDays[0].tasks.length >= 1);
    assert.ok(allDays[0].quiz.length >= 5);
    assert.doesNotMatch(JSON.stringify(allDays[0].tasks), /Aufgabe noch ergaenzen/i);
    assert.match(JSON.stringify(allDays[0].solutions), /Erwartungshorizont|Typische Fehler/);
    assert.equal(manifest.status, 'draft');
    assert.equal(manifest.runtimeModes.standalone.entry, 'standalone/index.html');
    assert.equal(fs.existsSync(path.join(draft.storagePath, 'standalone', 'index.html')), true);
    assert.equal(fs.existsSync(path.join(draft.storagePath, 'platform', 'adapter.json')), true);
    assert.equal(fs.existsSync(path.join(draft.storagePath, 'teilnehmer', 'tag_02', 'webvariante.html')), true);
    assert.equal(artifacts.some((artifact) => artifact.path.endsWith('pom.xml')), true);
    assert.ok(demoTargets.length >= 1);
    assert.equal(didacticProfile.id, 'worked-example-fading');
    assert.ok(Array.isArray(didacticProfile.lessonFlow));
    assert.ok(releasePlan.length >= 1);
    assert.ok(days[0].didacticFlow.length >= 1);
    assert.ok(days[0].releasePlan.length >= 1);
    assert.equal(days[0].demos.includes(demoTargets[0].id), true);
    assert.equal(fs.existsSync(path.join(draft.storagePath, demoTargets[0].filePath)), true);
    assert.match(fs.readFileSync(path.join(draft.storagePath, 'dozent', 'tag_01', 'webvariante.html'), 'utf8'), /class="demo-open-button"/);
    assert.doesNotMatch(participantWeb, /demo-open-button/);
    assert.equal(JSON.stringify(participantContent).includes(demoTargets[0].id), false);
    assert.equal(testProtocol.checks.some((check) => check.group === 'Demos'), true);
    assert.equal(testProtocol.checks.some((check) => check.group === 'Didaktik'), true);
    assert.equal(draft.analysisReport.demoTargets.length, demoTargets.length);
    assert.equal(draft.analysisReport.didacticProfile.id, 'worked-example-fading');
    assert.equal(draft.analysisReport.releasePlan.length, releasePlan.length);
    assert.equal(artifacts.some((artifact) => artifact.solutionOnly === true && artifact.path.startsWith('dozent/')), true);
    assert.equal(fs.existsSync(path.join(draft.storagePath, artifacts.find((artifact) => artifact.path.endsWith('pom.xml')).path)), true);
    assert.doesNotMatch(participantWeb, /Loesung|solution/i);
    assert.doesNotMatch(JSON.stringify(participantContent), /Loesung|solution/i);
    assert.equal(JSON.stringify(participantContent).includes('dozent/'), false);
    assert.doesNotMatch(JSON.stringify(sourceMap), /Originaltext|Reference chunk|Buchseite/i);
    assert.match(standalone, /data-role="participant"/);
    assert.equal(draft.analysisReport.dayCount, 2);
    assert.equal(typeof draft.analysisReport.curriculumQuality.score, 'number');
    assert.equal(draft.analysisReport.containerProfile.courseType, 'java-maven');
    assert.ok(draft.analysisReport.generatedArtifacts.length > 0);
    assert.equal(draft.analysisReport.testProtocol.path, 'reports/testprotokoll.html');
    assert.equal(fs.existsSync(draft.testProtocolPath), true);
    assert.ok(['passed', 'warning', 'failed'].includes(testProtocol.overallStatus));
    assert.equal(testProtocol.checks.some((check) => check.group === 'Preflight'), true);
    assert.equal(testProtocol.checks.some((check) => check.group === 'Curriculum'), true);
    assert.equal(testProtocol.checks.some((check) => check.group === 'Artefakte'), true);
    assert.equal(testProtocol.checks.some((check) => check.group === 'Export'), true);
    assert.equal(testProtocol.checks.some((check) => check.group === 'Sicherheit'), true);
    assert.ok(testProtocol.aiRuns.length >= 2);
    assert.equal(testProtocol.aiRuns.every((run) => run.promptId && run.promptVersion), true);
    assert.equal(testProtocol.aiRuns.every((run) => run.promptContract && typeof run.promptScore === 'number'), true);
    assert.ok(testProtocol.manualChecks.length >= 8);
    assert.doesNotMatch(JSON.stringify(testProtocol), /Originaltext|Reference chunk|Buchseite|rawText|textPreview|reference-library|chunks\.json|extracted\.json/i);
    assert.doesNotMatch(testProtocolHtml, /Originaltext|Reference chunk|Buchseite|rawText|textPreview|reference-library|chunks\.json|extracted\.json/i);
    assert.doesNotMatch(JSON.stringify(testProtocol) + testProtocolHtml, /OPENAI_API_KEY|s[k]-[A-Za-z0-9_-]{10,}|apiKey|secret/i);
    assert.doesNotMatch(JSON.stringify(participantContent), /testprotokoll/i);
    assert.equal(draft.analysisReport.fallbackUsed, true);
    assert.match(reportHtml, /<h2>Quality<\/h2>/);
    assert.match(reportHtml, /<h2>Testprotokoll<\/h2>/);
    assert.match(reportHtml, /<h2>Prompt Quality<\/h2>/);
    assert.match(reportHtml, /<h2>Didaktik<\/h2>/);
    assert.ok(draft.analysisReport.promptQuality.runCount >= 2);
    assert.ok(draft.analysisReport.promptQuality.averagePromptQualityScore >= 0);
    assert.equal((draft.analysisReport.promptQuality.promptContracts || []).some((item) => /day-draft-v1@1\.0\.0/.test(item)), true);
    assert.doesNotMatch(reportHtml, /Originaltext|Reference chunk|Buchseite/i);
    assert.doesNotMatch(reportHtml + JSON.stringify(draft.analysisReport), /OPENAI_API_KEY|s[k]-[A-Za-z0-9_-]{10,}|apiKey|secret/i);
    assert.equal(draft.validation.isValid, true, JSON.stringify(draft.validation));
  } finally {
    cleanup();
  }
});

test('curriculum planner handles text anchors ranges target audience moves and approval', async () => {
  const { service, session, cleanup } = createTempFactory();

  try {
    const anchor = service.createCurriculumAnchor({
      type: 'text-document',
      title: 'SQL Grundlagen',
      sourceFiles: [{ name: 'sql-grundlagen.md', path: '' }],
      ranges: []
    }, session);
    let draft = await service.analyzeCurriculumAnchor({
      anchor,
      course: { courseName: 'SQL Kurs', courseId: 'sql-kurs', department: 'FISI' },
      duration: { durationMode: 'ue', totalUE: 18, uePerDay: 9, hoursPerDay: 8 },
      targetAudience: { department: 'FISI', priorKnowledge: 'none', difficultyMode: 'easy-normal-hard', projectOrientation: false },
      courseGoal: 'SQL Grundlagen anwenden',
      expectedOutcome: 'datenbankmodell',
      didacticStyle: 'guided'
    }, session);
    const firstTopic = draft.days[0].topics[0];
    assert.equal(draft.anchor.type, 'text-document');
    assert.equal(draft.duration.numberOfDays, 2);
    assert.equal(firstTopic.difficulty, 'easy');
    assert.ok(draft.quality.score >= 50);
    draft = service.moveCurriculumTopic(draft.id, firstTopic.id, 2, 1, session);
    assert.equal(draft.days[1].topics.some((topic) => topic.id === firstTopic.id), true);
    draft = service.approveCurriculumDraft(draft.id, session);
    assert.equal(draft.status, 'approved');
    assert.doesNotMatch(JSON.stringify(draft), /Originaltext|SELECT \*/i);
  } finally {
    cleanup();
  }
});

test('curriculum planner uses real pptx ranges and keeps topic edits under review', async () => {
  const { dir, service, session, cleanup } = createTempFactory();

  try {
    const pptxPath = path.join(dir, 'unterricht.pptx');
    createZip(pptxPath, {
      'ppt/slides/slide1.xml': '<p:sld><a:t>Agenda</a:t></p:sld>',
      'ppt/slides/slide2.xml': '<p:sld><a:t>Klassen und Objekte</a:t><a:t>Attribute und Methoden</a:t></p:sld>',
      'ppt/slides/slide3.xml': '<p:sld><a:t>Vererbung</a:t><a:t>Basisklassen</a:t></p:sld>'
    });
    const anchor = service.createCurriculumAnchor({
      type: 'book-or-presentation',
      title: 'OOP Folien',
      sourceFiles: [{ name: 'unterricht.pptx', path: pptxPath }],
      ranges: [{ type: 'slides', from: 2, to: 3 }]
    }, session);
    let draft = await service.analyzeCurriculumAnchor({
      anchor,
      course: { courseName: 'OOP Kurs', courseId: 'oop-kurs', department: 'FIAE' },
      duration: { durationMode: 'days', numberOfDays: 1, uePerDay: 9, hoursPerDay: 8 },
      targetAudience: { department: 'FIAE', priorKnowledge: 'basic', difficultyMode: 'normal', projectOrientation: true },
      courseGoal: 'OOP Grundlagen',
      expectedOutcome: 'Projekt',
      didacticStyle: 'guided'
    }, session);

    assert.equal(draft.extractedSourceOutline.length, 2);
    assert.equal(draft.extractedSourceOutline.some((section) => section.title === 'Klassen und Objekte'), true);
    assert.equal(draft.extractedSourceOutline.some((section) => section.title === 'Agenda'), false);
    assert.ok(draft.extractedSourceOutline.every((section) => section.quality));
    assert.equal(draft.days[0].topics.some((topic) => ['project', 'guided-task'].includes(topic.practiceType)), true);

    draft = service.approveCurriculumDraft(draft.id, session);
    assert.equal(draft.status, 'approved');
    draft = service.updateCurriculumDraft(draft.id, { days: [{ ...draft.days[0], topics: [{ ...draft.days[0].topics[0], title: 'Objekte sauber modellieren' }] }] }, session);
    assert.equal(draft.status, 'needs-review');
    await assert.rejects(() => service.generateAllDayDrafts({
      course: draft.course,
      coursePlan: { days: [] },
      approvedCurriculumPlan: draft,
      aiMode: 'local'
    }, session), /Freigabe/);
  } finally {
    cleanup();
  }
});

test('invalid openai day output falls back to local without leaking solutions to participants', async () => {
  const orchestrator = new AiOrchestrator({
    localProvider: new LocalHeuristicProvider(),
    openaiProvider: {
      model: 'test-model',
      isConfigured: () => true,
      generateDayDraft: async () => ({ title: '', webvariant: { participantHtmlSections: [{ title: 'Loesung', content: 'solution' }] } })
    }
  });
  const result = await orchestrator.generateDayDraft({
    ...createApprovedTestInput(),
    dayNumber: 1,
    title: 'Fallback Tag',
    day: {
      dayNumber: 1,
      title: 'Fallback Tag',
      mainTopic: 'HTML',
      learningGoals: ['HTML verstehen'],
      ueBlocks: [{ topic: 'HTML', learnerTask: 'Struktur bauen', teacherTask: 'Demo', evaluation: 'Pruefen' }]
    },
    materials: []
  }, 'openai');

  assert.equal(result.dayNumber, 1);
  assert.equal(result.warnings.some((warning) => /OpenAI-Fallback/.test(warning)), true);
  assert.equal(result.aiMeta.provider, 'local');
  assert.equal(result.aiMeta.fallbackUsed, true);
  assert.equal(result.aiMeta.promptQualityStatus, 'passed');
  assert.ok(['passed', 'warning'].includes(result.aiMeta.outputReviewStatus));
  assert.doesNotMatch(JSON.stringify(result.webvariant.participantHtmlSections), /Loesung|solution/i);
  assert.ok(result.solutions.length > 0);
});

test('ai orchestrator blocks unsafe openai prompt and records ai meta', async () => {
  const orchestrator = new AiOrchestrator({
    localProvider: new LocalHeuristicProvider(),
    openaiProvider: {
      model: 'test-model',
      isConfigured: () => true,
      generateDayDraft: async () => { throw new Error('OpenAI should not be called'); }
    }
  });
  const result = await orchestrator.generateDayDraft({
    ...createApprovedTestInput(),
    apiKey: 'secret',
    dayNumber: 1,
    day: createApprovedTestInput().coursePlan.days[0],
    materials: []
  }, 'openai-review');

  assert.equal(result.aiMeta.qualityGateBlockedProvider, true);
  assert.equal(result.aiMeta.fallbackUsed, true);
  assert.equal(result.aiMeta.promptQualityStatus, 'failed');
  assert.equal(result.aiMeta.provider, 'local');
});

test('content factory quality and ai helpers protect local output and secrets', async () => {
  const provider = new LocalHeuristicProvider();
  const result = await provider.generateDayDraft({
    dayNumber: 1,
    title: 'SQL Joins',
    targetAudience: { difficultyMode: 'easy-normal-hard', examOrientation: true, projectOrientation: true, priorKnowledge: 'none' },
    day: {
      dayNumber: 1,
      title: 'SQL Joins',
      mainTopic: 'JOIN Arten',
      learningGoals: ['JOIN Arten unterscheiden'],
      ueBlocks: [{ topic: 'INNER JOIN', learnerTask: 'Beispieldaten verbinden', teacherTask: 'Join visualisieren', evaluation: 'Join-Typen korrekt bewerten' }]
    },
    materials: [{ name: 'demo.sql' }]
  });
  const quality = assessCurriculumQuality({
    duration: { numberOfDays: 1, uePerDay: 9 },
    targetAudience: { department: 'FISI' },
    courseGoal: 'SQL sicher anwenden',
    days: [{ dayNumber: 1, estimatedUE: 6, topics: [{ title: 'JOIN Arten', sourceRefs: ['sql:1'], estimatedUE: 6, active: true }] }],
    warnings: []
  }, [{ title: 'JOIN Arten', sourceRef: 'sql:1', quality: { level: 'high' }, warnings: [] }]);
  const sanitized = sanitizeInput({ apiKey: 'secret', referenceContext: [{ textPreview: 'original preview', summary: 'kurz', sourceRef: 'ref:1' }], longText: 'x'.repeat(1100) });

  assert.ok(result.tasks.length >= 3);
  assert.ok(result.quiz.length >= 8);
  assert.match(JSON.stringify(result.solutions), /Erwartungshorizont/);
  assert.doesNotMatch(JSON.stringify(result.webvariant.participantHtmlSections), /Loesung|solution/i);
  assert.ok(quality.score >= 70);
  assert.equal(sanitized.apiKey, undefined);
  assert.equal(sanitized.referenceContext[0].textPreview, undefined);
  assert.ok(sanitized.longText.length < 1010);
  assert.deepEqual(parseJsonLoose('```json\n{"ok":true}\n```'), { ok: true });
});

test('prompt precision contracts builder linter and golden tests protect provider prompts', () => {
  const input = createApprovedTestInput({
    targetAudience: { ...createApprovedTestInput().targetAudience, ageRange: '16-20', priorKnowledge: 'none', learningLevel: 'intro' },
    containerProfile: { ...createApprovedTestInput().containerProfile, courseType: 'java' },
    rawText: 'Originaltext darf nicht bleiben',
    referenceContext: [{ textPreview: 'Reference chunk', summary: 'safe', sourceRef: 'ref:1' }],
    apiKey: 'secret'
  });
  const prompt = promptBuilder.buildPrompt('generateDayDraft', input);
  const lint = contractPromptLinter.lintPrompt(prompt);
  const missingSchema = contractPromptLinter.lintPrompt({ ...prompt, expectedSchema: '', contract: { ...prompt.contract, expectedOutputSchema: '' }, prompt: { ...prompt.prompt, expectedSchema: '' } });
  const missingAge = contractPromptLinter.lintPrompt(promptBuilder.buildPrompt('generateDayDraft', createApprovedTestInput({ targetAudience: { ...createApprovedTestInput().targetAudience, ageRange: 'unknown' } })));
  const javaGolden = runGoldenPromptTest('java-beginner');
  const sqlGolden = runGoldenPromptTest('sql-beginner');
  const umlGolden = runGoldenPromptTest('uml-drawio');
  const summary = summarizeGoldenPromptTests();

  contracts.forEach((contract) => {
    assert.ok(contract.id);
    assert.ok(contract.version);
    assert.ok(contract.purpose);
    assert.ok(contract.expectedOutputSchema);
  });
  assert.equal(dayDraftContract.id, 'day-draft-v1');
  assert.equal(dayDraftContract.mustIncludeRules.some((rule) => /Teilnehmerbereich.*niemals.*Loesungen/i.test(rule)), true);
  assert.equal(dayDraftContract.artifactRules.some((rule) => /Java Einsteiger.*keine Maven/i.test(rule)), true);
  assert.equal(prompt.promptId, 'day-draft-v1');
  assert.equal(prompt.promptVersion, '1.0.0');
  assert.doesNotMatch(JSON.stringify(prompt.userPayload), /Originaltext darf nicht bleiben|Reference chunk|apiKey|secret|rawText|textPreview/i);
  assert.equal(lint.status === 'passed' || lint.status === 'warning', true);
  assert.equal(missingSchema.status, 'failed');
  assert.equal(missingAge.status, 'warning');
  assert.equal(javaGolden.status, 'passed');
  assert.equal(sqlGolden.status, 'passed');
  assert.equal(umlGolden.status, 'passed');
  assert.equal(summary.status, 'passed');
});

test('content factory didactic profiles provide presets suggestions and prompt metadata', () => {
  const profiles = listDidacticProfiles();
  const guidedCoding = getDidacticProfile('guided-coding');
  const exam = suggestDidacticProfile({ targetAudience: { examOrientation: true } });
  const project = suggestDidacticProfile({ targetAudience: { projectOrientation: true } });
  const beginner = suggestDidacticProfile({ targetAudience: { priorKnowledge: 'none' } });
  const prompt = promptBuilder.buildPrompt('generateDayDraft', createApprovedTestInput({ didacticProfile: guidedCoding }));
  const lint = contractPromptLinter.lintPrompt(prompt);

  assert.equal(profiles.length, 8);
  assert.equal(profiles.every((profile) => profile.id && profile.teachingModel && profile.lessonFlow.length), true);
  assert.equal(guidedCoding.demoStrategy, 'live-coding');
  assert.equal(exam.id, 'exam-training');
  assert.equal(project.id, 'project-based');
  assert.equal(beginner.id, 'worked-example-fading');
  assert.equal(prompt.prompt.didacticProfile.id, 'guided-coding');
  assert.equal(prompt.userPayload.didacticProfile.id, 'guided-coding');
  assert.equal(prompt.developerRules.didacticProfileSignals.id, 'guided-coding');
  assert.equal(lint.status === 'passed' || lint.status === 'warning', true);
});

test('content factory didactic matrix validates all profiles recommendations and containers', async () => {
  const { service, session, cleanup } = createTempFactory();
  const provider = new LocalHeuristicProvider();
  const cases = [
    ['explain-demo-practice', 'html-css', { priorKnowledge: 'basic', ageRange: '16-20', needsStepByStep: true }, 'HTML CSS Einstieg'],
    ['problem-first', 'java', { priorKnowledge: 'intermediate' }, 'Java Debugging Fehleranalyse'],
    ['project-based', 'html-css', { priorKnowledge: 'intermediate', projectOrientation: true }, 'HTML CSS Projekt'],
    ['worked-example-fading', 'java', { priorKnowledge: 'none', ageRange: '16-20', needsStepByStep: true }, 'Java Einsteiger'],
    ['exam-training', 'sql', { priorKnowledge: 'basic', examOrientation: true }, 'SQL Pruefung'],
    ['station-learning', 'theory', { priorKnowledge: 'basic', ageRange: 'mixed' }, 'Heterogene Gruppe Stationen'],
    ['flipped-classroom', 'theory', { priorKnowledge: 'intermediate' }, 'Wiederholung Vorbereitung'],
    ['guided-coding', 'python', { priorKnowledge: 'basic', needsStepByStep: true }, 'Python Java Guided Coding']
  ];

  try {
    for (const [profileId, courseType, audiencePatch, goal] of cases) {
      const profile = getDidacticProfile(profileId);
      const targetAudience = { ...createApprovedTestInput().targetAudience, ...audiencePatch };
      const containerProfile = { ...createApprovedTestInput().containerProfile, courseType, artifactMode: 'web-and-files' };
      const input = createApprovedTestInput({ targetAudience, containerProfile, didacticProfile: profile, courseGoal: goal });
      input.approvedCurriculumPlan = { ...input.approvedCurriculumPlan, targetAudience, didacticProfile: profile, courseGoal: goal };
      input.curriculumPlan = input.approvedCurriculumPlan;
      const fit = evaluateDidacticFit(profile, input);
      const recommendation = recommendDidacticProfiles(input);
      const preview = createDidacticPreview({ didacticProfile: profile, courseType, targetAudience, courseGoal: goal });
      const prompt = promptBuilder.buildPrompt('generateDayDraft', input);
      const promptLint = contractPromptLinter.lintPrompt(prompt);
      const dayDraft = await provider.generateDayDraft({ ...input, day: input.coursePlan.days[0], dayNumber: 1, title: goal });
      const qualityGate = runDidacticQualityGate(dayDraft, { didacticProfile: profile });
      const draft = service.createPlanContainerDraft({
        ...input,
        course: { courseName: `Matrix ${profileId}`, courseId: `matrix-${profileId}`, department: 'FIAE' },
        coursePlan: { ...input.coursePlan, courseTitle: `Matrix ${profileId}`, courseId: `matrix-${profileId}` },
        approvedCurriculumPlan: { ...input.approvedCurriculumPlan, didacticProfile: profile, targetAudience },
        dayResults: [dayDraft],
        aiMode: 'local'
      }, session);
      const protocol = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'reports', 'testprotokoll.json'), 'utf8'));
      const participantContent = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'participant-content.json'), 'utf8'));
      const teacherRunbooks = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'teacher-runbooks.json'), 'utf8'));
      const days = JSON.parse(fs.readFileSync(path.join(draft.storagePath, 'catalog', 'days.json'), 'utf8'));
      const runbookHtml = fs.readFileSync(path.join(draft.storagePath, 'dozent', 'tag_01', 'unterrichtsablauf.html'), 'utf8');
      const runbook = teacherRunbooks[0];
      const phases = runbook.phases || [];

      assert.equal(profile.id, profileId);
      assert.ok(dayDraft.teacherRunbook, `${profileId} teacherRunbook`);
      assert.ok(phases.length >= 4, `${profileId} teacherRunbook phases`);
      assert.equal(phases.every((phase) => phase.teacherAction && phase.participantAction), true);
      assert.equal(phases.some((phase) => (phase.moderationQuestions || []).length), true);
      assert.equal(phases.some((phase) => (phase.typicalProblems || []).length), true);
      assert.equal(phases.some((phase) => phase.differentiation?.supportWeak && phase.differentiation?.challengeStrong), true);
      assert.equal(phases.some((phase) => phase.checkpoint), true);
      assert.equal(dayDraft.tasks.every((task) => task.releaseHint), true);
      assert.match(runbookHtml, /Dozenten-Fahrplan/);
      assert.ok(fit.score >= 50, `${profileId} fit score`);
      assert.ok(recommendation.recommended.profile.id);
      assert.ok((recommendation.alternatives || []).length >= 1);
      assert.equal((preview.expectedDayFlow || []).length >= 1, true);
      assert.ok(['passed', 'warning'].includes(promptLint.status), `${profileId} prompt lint ${promptLint.status}`);
      assert.ok(['passed', 'warning'].includes(qualityGate.status), `${profileId} quality gate ${qualityGate.status}`);
      assert.equal(protocol.checks.some((check) => check.id === 'didactic-fit-score'), true);
      assert.equal(protocol.checks.some((check) => check.id === 'didactic-quality-gate'), true);
      assert.equal(protocol.checks.some((check) => check.id === 'teacher-runbook-present'), true);
      assert.equal(days[0].teacherRunbook, 'dozent/tag_01/unterrichtsablauf.html');
      assert.doesNotMatch(JSON.stringify(participantContent), /Loesung|solution|Dozentenhinweis/i);
      assert.doesNotMatch(JSON.stringify(participantContent), /unterrichtsablauf|teacherRunbook|Dozenten-Fahrplan/i);
    }

    const competingJava = recommendDidacticProfiles(createApprovedTestInput({
      targetAudience: { ...createApprovedTestInput().targetAudience, priorKnowledge: 'none', projectOrientation: true },
      containerProfile: { ...createApprovedTestInput().containerProfile, courseType: 'java' },
      courseGoal: 'Java Projekt Einstieg'
    }));
    const competingSql = recommendDidacticProfiles(createApprovedTestInput({
      targetAudience: { ...createApprovedTestInput().targetAudience, priorKnowledge: 'none', examOrientation: true },
      containerProfile: { ...createApprovedTestInput().containerProfile, courseType: 'sql' },
      courseGoal: 'SQL Pruefung Einstieg'
    }));
    const competingHtml = recommendDidacticProfiles(createApprovedTestInput({
      targetAudience: { ...createApprovedTestInput().targetAudience, priorKnowledge: 'basic', projectOrientation: true },
      containerProfile: { ...createApprovedTestInput().containerProfile, courseType: 'html-css' },
      courseGoal: 'HTML CSS Projekt Einstieg'
    }));

    assert.ok(['worked-example-fading', 'guided-coding', 'project-based'].includes(competingJava.recommended.profile.id));
    assert.equal(competingJava.alternatives.some((item) => ['project-based', 'guided-coding', 'worked-example-fading'].includes(item.profile.id)), true);
    assert.equal(competingSql.recommended.profile.id, 'exam-training');
    assert.equal(competingHtml.alternatives.some((item) => item.profile.id === 'project-based' || item.profile.id === 'worked-example-fading'), true);
  } finally {
    cleanup();
  }
});

test('openai env setup files and loader keep api keys out of repository outputs', () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
  const example = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
  const setupScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'setup-openai-env.ps1'), 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-env-'));
  const oldKey = process.env.OPENAI_API_KEY;
  const oldProvider = process.env.AI_PROVIDER;
  const oldModel = process.env.OPENAI_MODEL;
  try {
    fs.writeFileSync(path.join(tmp, '.env'), 'AI_PROVIDER=openai\nOPENAI_API_KEY=LOCAL_TEST_PLACEHOLDER\nOPENAI_MODEL=dotenv-model\nOPENAI_TIMEOUT_MS=12345\nCONTENT_FACTORY_COST_WARNING_USD=0.25\n', 'utf8');
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_MODEL;
    const dotenvEnv = loadAppEnv(tmp);
    process.env.OPENAI_MODEL = 'env-model';
    const envOverride = loadAppEnv(tmp);

    assert.match(gitignore, /^\.env$/m);
    assert.match(gitignore, /^\.env\.local$/m);
    assert.match(gitignore, /^api_key_ContentFactory\.txt$/m);
    assert.match(gitignore, /^\*_key\.txt$/m);
    assert.match(gitignore, /^openai-key\.txt$/m);
    assert.doesNotMatch(example, /s[k]-[A-Za-z0-9_-]{10,}/);
    assert.match(example, /OPENAI_API_KEY=/);
    assert.doesNotMatch(setupScript, /s[k]-[A-Za-z0-9_-]{10,}/);
    assert.equal(dotenvEnv.openAiConfigured, true);
    assert.equal(dotenvEnv.openAiKeySource, 'dotenv');
    assert.equal(dotenvEnv.keySource, 'dotenv');
    assert.equal(dotenvEnv.openAiModel, 'dotenv-model');
    assert.equal(envOverride.openAiModel, 'env-model');
    assert.equal(Object.prototype.hasOwnProperty.call(dotenvEnv, 'OPENAI_API_KEY'), false);
    assert.equal(getOpenAiApiKey(tmp).value, 'LOCAL_TEST_PLACEHOLDER');
    assert.equal(getOpenAiApiKey(tmp).source, 'dotenv');
  } finally {
    restoreEnv('OPENAI_API_KEY', oldKey);
    restoreEnv('AI_PROVIDER', oldProvider);
    restoreEnv('OPENAI_MODEL', oldModel);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('openai txt setup script imports fake key into env and deletes source file', () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const script = fs.readFileSync(path.join(repoRoot, 'scripts', 'setup-openai-key-from-txt.ps1'), 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-keytxt-'));
  const keyFile = path.join(tmp, 'openai_key.txt');
  const envPath = path.join(repoRoot, '.env');
  const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : null;
  const fakeKey = `s${'k'}-test-placeholder-not-real-1234567890`;
  try {
    fs.writeFileSync(keyFile, fakeKey, 'utf8');
    if (fs.existsSync(envPath)) fs.rmSync(envPath, { force: true });
    const powershell = process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
      : 'pwsh';
    const result = require('child_process').spawnSync(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(repoRoot, 'scripts', 'setup-openai-key-from-txt.ps1'), '-KeyFile', keyFile], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    if (result.error && result.error.code === 'EPERM') {
      assert.match(script, /Get-Content -LiteralPath \$KeyFile -Raw/);
      assert.match(script, /Set-Content -LiteralPath \$envPath/);
      assert.match(script, /Remove-Item -LiteralPath \$KeyFile -Force/);
      assert.doesNotMatch(script, /Write-Host\s+\$apiKey|Write-Output\s+\$apiKey/);
      return;
    }
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(keyFile), false);
    const envContent = fs.readFileSync(envPath, 'utf8');
    assert.match(envContent, /AI_PROVIDER=openai/);
    assert.match(envContent, /OPENAI_MODEL=gpt-5\.4-mini/);
    assert.match(envContent, /OPENAI_API_KEY=/);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(fakeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(script, /s[k]-[A-Za-z0-9_-]{10,}/);
    assert.match(script, /api_key_ContentFactory\.txt/);
  } finally {
    if (existingEnv === null) {
      if (fs.existsSync(envPath)) fs.rmSync(envPath, { force: true });
    } else {
      fs.writeFileSync(envPath, existingEnv, 'utf8');
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('openai provider status and fallback never expose api keys', async () => {
  const provider = new OpenAIProvider({ apiKey: 'LOCAL_TEST_PLACEHOLDER', model: 'test-model', keySource: 'process.env' });
  const missing = new OpenAIProvider({ apiKey: '', model: 'test-model' });
  const orchestrator = new AiOrchestrator({
    env: { aiProvider: 'openai', openAiModel: 'test-model', timeoutMs: 30000, maxPromptChars: 40000, costWarningUsd: 1, keySource: 'missing' },
    localProvider: new LocalHeuristicProvider(),
    openaiProvider: missing
  });
  const status = provider.getStatus();
  const missingStatus = orchestrator.getStatus();
  const result = await orchestrator.generateDayDraft({ ...createApprovedTestInput(), day: createApprovedTestInput().coursePlan.days[0] }, 'openai');

  assert.deepEqual(status, { provider: 'openai', configured: true, model: 'test-model', keySource: 'process.env' });
  assert.doesNotMatch(JSON.stringify(status), /LOCAL_TEST_PLACEHOLDER/);
  assert.equal(missingStatus.providers.openai.configured, false);
  assert.equal(missingStatus.providers.openai.keySource, 'missing');
  assert.equal(result.aiMeta.provider, 'local');
  assert.equal(result.aiMeta.fallbackUsed, true);
});

test('admin ai key store imports txt deletes source and never returns key', async () => {
  const { dir, appData, service, session, cleanup } = createTempFactory();
  const fakeKey = `s${'k'}-admin-store-placeholder-not-real-1234567890`;
  const keyFile = path.join(dir, 'admin-openai-key.txt');
  const oldKey = process.env.OPENAI_API_KEY;
  const oldModel = process.env.OPENAI_MODEL;
  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    fs.writeFileSync(keyFile, fakeKey, 'utf8');
    const imported = service.importOpenAiKeyFromTxt(keyFile, session);
    const status = service.getAiProviderStatus(session);
    const store = createAiKeyStoreService({ appData });
    const keyInfo = store.getOpenAiKeyForServerUse();

    assert.equal(imported.success, true);
    assert.equal(imported.deletedSourceFile, true);
    assert.equal(fs.existsSync(keyFile), false);
    assert.equal(status.providers.openai.configured, true);
    assert.equal(status.providers.openai.keySource, 'admin-key-store');
    assert.equal(keyInfo.value, fakeKey);
    assert.equal(keyInfo.source, 'admin-key-store');
    assert.doesNotMatch(JSON.stringify(imported) + JSON.stringify(status), new RegExp(fakeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(JSON.stringify(status), /openAiKeyLocal|apiKey|secret/i);
    assert.ok(fs.existsSync(path.join(dir, 'data', 'secure', 'ai-provider-config.json')));

    service.clearOpenAiKey(session);
    const missingTest = await store.testOpenAiConnection(session);
    assert.equal(service.getAiProviderStatus(session).providers.openai.configured, false);
    assert.equal(missingTest.status, 'warning');
    assert.equal(missingTest.errorCategory, 'missing-key');
  } finally {
    restoreEnv('OPENAI_API_KEY', oldKey);
    restoreEnv('OPENAI_MODEL', oldModel);
    cleanup();
  }
});

test('openai provider resolves process env before admin key store and admin before dotenv', () => {
  const { dir, appData, service, session, cleanup } = createTempFactory();
  const oldKey = process.env.OPENAI_API_KEY;
  const oldModel = process.env.OPENAI_MODEL;
  const oldProvider = process.env.AI_PROVIDER;
  const envKey = `s${'k'}-process-env-placeholder-not-real-1234567890`;
  const storeKey = `s${'k'}-store-placeholder-not-real-1234567890`;
  try {
    fs.writeFileSync(path.join(dir, '.env'), `AI_PROVIDER=openai\nOPENAI_API_KEY=s${'k'}-dotenv-placeholder-not-real-1234567890\nOPENAI_MODEL=dotenv-model\n`, 'utf8');
    const keyFile = path.join(dir, 'store-key.txt');
    fs.writeFileSync(keyFile, storeKey, 'utf8');
    service.importOpenAiKeyFromTxt(keyFile, session);
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.AI_PROVIDER;

    const adminProvider = new OpenAIProvider({ projectRoot: dir, aiKeyStore: createAiKeyStoreService({ appData }) });
    process.env.OPENAI_API_KEY = envKey;
    process.env.OPENAI_MODEL = 'env-model';
    const envProvider = new OpenAIProvider({ projectRoot: dir, aiKeyStore: createAiKeyStoreService({ appData }) });

    assert.equal(adminProvider.getStatus().keySource, 'admin-key-store');
    assert.equal(adminProvider.apiKey, storeKey);
    assert.equal(envProvider.getStatus().keySource, 'process.env');
    assert.equal(envProvider.apiKey, envKey);
    assert.doesNotMatch(JSON.stringify(envProvider.getStatus()), new RegExp(envKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    restoreEnv('OPENAI_API_KEY', oldKey);
    restoreEnv('OPENAI_MODEL', oldModel);
    restoreEnv('AI_PROVIDER', oldProvider);
    cleanup();
  }
});

test('content factory cost estimator and preflight warn on openai cost or missing key', () => {
  const input = createApprovedTestInput({ aiMode: 'openai' });
  const estimate = estimateContentFactoryCost(input, { model: 'gpt-5.4-mini', warningLimitUsd: 0.0001 });
  const preflight = runPreflight({ ...input, costEstimate: estimate }, {
    aiStatus: {
      defaultProvider: 'openai',
      providers: { openai: { configured: false, model: 'gpt-5.4-mini', keySource: 'missing' } }
    }
  });

  assert.equal(estimate.warning, true);
  assert.ok(estimate.inputTokens > 0);
  assert.ok(estimate.outputTokens > 0);
  assert.equal(preflight.status, 'yellow');
  assert.ok(preflight.warnings.some((warning) => /kein API-Key|Kosten/.test(warning)));
});

test('content factory preflight accepts admin key store as configured', () => {
  const result = runPreflight(createApprovedTestInput({ aiMode: 'openai' }), {
    aiStatus: {
      defaultProvider: 'openai',
      providers: { openai: { configured: true, model: 'gpt-5.4-mini', keySource: 'admin-key-store', connectionTestStatus: 'success' } }
    }
  });
  const failedConnection = runPreflight(createApprovedTestInput({ aiMode: 'openai' }), {
    aiStatus: {
      defaultProvider: 'openai',
      providers: { openai: { configured: true, model: 'gpt-5.4-mini', keySource: 'admin-key-store', connectionTestStatus: 'failed' } }
    }
  });

  assert.equal(result.checks.find((check) => check.id === 'ai-openai').status, 'ok');
  assert.equal(result.warnings.some((warning) => /kein API-Key/.test(warning)), false);
  assert.equal(failedConnection.status, 'yellow');
  assert.ok(failedConnection.warnings.some((warning) => /Verbindungstest/.test(warning)));
});

test('prompt linter blocks unsafe prompts and warns about age range', () => {
  const complete = buildPrompt('generateDayDraft', createApprovedTestInput());
  const passed = runPromptQualityGate(complete);
  const missingId = lintPrompt({ ...complete, promptId: '', prompt: { ...complete.prompt, promptId: '' } });
  const unknownAge = runPromptQualityGate(buildPrompt('generateDayDraft', createApprovedTestInput({ targetAudience: { ...createApprovedTestInput().targetAudience, ageRange: 'unknown' } })));
  const rawText = runPromptQualityGate({ ...complete, prompt: { ...complete.prompt, input: { rawText: 'Originaltext' } } });
  const secret = runPromptQualityGate({ ...complete, prompt: { ...complete.prompt, apiKey: 'secret' } });
  const referencePath = runPromptQualityGate({ ...complete, prompt: { ...complete.prompt, path: 'AppData/content-factory/reference-library/chunks.json' } });
  const mavenWarn = runPromptQualityGate(buildPrompt('generateDayDraft', createApprovedTestInput({ containerProfile: { ...createApprovedTestInput().containerProfile, courseType: 'java-maven' }, targetAudience: { ...createApprovedTestInput().targetAudience, priorKnowledge: 'basic' } })));

  assert.equal(passed.status, 'passed');
  assert.equal(missingId.status, 'failed');
  assert.equal(unknownAge.status, 'warning');
  assert.equal(rawText.maySendToProvider, false);
  assert.equal(secret.status, 'failed');
  assert.equal(referencePath.status, 'failed');
  assert.equal(mavenWarn.status, 'warning');
  assert.equal(passed.checks.some((check) => check.id === 'expected-schema'), true);
});

test('output review catches participant solutions placeholders and unsafe artifacts', async () => {
  const provider = new LocalHeuristicProvider();
  const good = await provider.generateDayDraft(createApprovedTestInput());
  const solutionLeak = reviewOutput({ ...good, tasks: [{ title: 'A', text: 'Loesung: fertig' }] }, { purpose: 'generateDayDraft', targetAudience: createApprovedTestInput().targetAudience });
  const placeholder = reviewOutput({ ...good, tasks: [{ title: 'A', text: 'Aufgabe noch ergaenzen' }] }, { purpose: 'generateDayDraft', targetAudience: createApprovedTestInput().targetAudience });
  const goodReview = reviewOutput(good, { purpose: 'generateDayDraft', targetAudience: createApprovedTestInput().targetAudience });
  const exe = reviewArtifactContent({ path: 'teilnehmer/tool.exe', content: '' }, {});
  const participantSolution = reviewArtifactContent({ path: 'teilnehmer/tag_01/loesung.md', content: 'solution', solutionOnly: true }, {});
  const javaSimple = reviewArtifactContent({ path: 'teilnehmer/tag_01/Aufgabe.java', content: 'class Aufgabe {}' }, { targetAudience: { priorKnowledge: 'none' } });
  const mavenIntermediate = reviewArtifactContent({ path: 'teilnehmer/tag_01/pom.xml', content: '<project><modelVersion>4.0.0</modelVersion></project>' }, { targetAudience: { priorKnowledge: 'intermediate' } });

  assert.equal(solutionLeak.status, 'failed');
  assert.equal(placeholder.status, 'warning');
  assert.equal(goodReview.status, 'passed');
  assert.equal(exe.status, 'failed');
  assert.equal(participantSolution.status, 'failed');
  assert.equal(javaSimple.status, 'passed');
  assert.equal(mavenIntermediate.status, 'passed');
});

test('content factory artifact suggestions respect audience and safe formats', () => {
  const beginnerJava = decideArtifactSuggestions({
    topic: { id: 't1', title: 'Schleifen' },
    day: { dayNumber: 1, title: 'Java Einstieg' },
    containerProfile: { courseType: 'java' },
    targetAudience: { priorKnowledge: 'none', learningLevel: 'intro', examOrientation: true }
  }).artifactSuggestions;
  const advancedJava = decideArtifactSuggestions({
    topic: { id: 't2', title: 'Services' },
    day: { dayNumber: 2, title: 'Java Projekt' },
    containerProfile: { courseType: 'java' },
    targetAudience: { priorKnowledge: 'intermediate', projectOrientation: true }
  }).artifactSuggestions;
  const sql = decideArtifactSuggestions({
    topic: { id: 't3', title: 'Joins' },
    day: { dayNumber: 3 },
    containerProfile: { courseType: 'sql' },
    targetAudience: { priorKnowledge: 'none' }
  }).artifactSuggestions;
  const diagram = decideArtifactSuggestions({
    topic: { id: 't4', title: 'ERM' },
    day: { dayNumber: 4 },
    containerProfile: { courseType: 'uml-pap' },
    targetAudience: { priorKnowledge: 'basic' }
  }).artifactSuggestions;
  const youngJavaMaven = decideArtifactSuggestions({
    topic: { id: 't5', title: 'Klassen' },
    day: { dayNumber: 5 },
    containerProfile: { courseType: 'java-maven' },
    targetAudience: { ageRange: '16-20', priorKnowledge: 'basic', learningLevel: 'basic' }
  }).artifactSuggestions;

  assert.equal(beginnerJava.some((item) => item.format === 'java'), true);
  assert.equal(beginnerJava.some((item) => item.format === 'maven-project'), false);
  assert.equal(beginnerJava.some((item) => /Codeverstaendnis/.test(item.title)), true);
  assert.equal(advancedJava.some((item) => item.format === 'maven-project'), true);
  assert.equal(sql.some((item) => item.format === 'sql'), true);
  assert.equal(sql.some((item) => /phpMyAdmin/.test(item.title)), true);
  assert.equal(diagram.some((item) => item.format === 'drawio'), true);
  assert.equal(youngJavaMaven.some((item) => item.format === 'maven-project'), false);
  assert.equal(youngJavaMaven.some((item) => /16-20/.test(item.targetAudienceImpact)), true);
});

test('content factory local provider adapts content for adult work practice', async () => {
  const provider = new LocalHeuristicProvider();
  const result = await provider.generateDayDraft({
    day: { dayNumber: 1, title: 'Datenbanken', ueBlocks: [{ topic: 'JOINs' }] },
    targetAudience: { ageRange: '30+', priorKnowledge: 'intermediate', learningLevel: 'advanced', difficultyMode: 'normal-and-hard' },
    containerProfile: { courseType: 'sql' }
  });

  assert.match(JSON.stringify(result.tasks), /Arbeitssituation|beruflich/i);
  assert.match(JSON.stringify(result.webvariant.teacherHtmlSections), /berufspraktisch|Arbeitssituationen/i);
});

test('content factory artifact generators create safe files and validate blocked executables', () => {
  const suggestions = decideArtifactSuggestions({
    topic: { id: 't1', title: 'Python Analyse' },
    day: { dayNumber: 1 },
    containerProfile: { courseType: 'jupyter' },
    targetAudience: { needsStepByStep: true }
  }).artifactSuggestions;
  const targets = suggestionsToTargets(suggestions);
  const files = generateArtifactFiles({
    course: { courseId: 'python-analyse', courseName: 'Python Analyse' },
    artifactTargets: targets
  });
  const blocked = validateGeneratedArtifacts([
    ...files,
    { path: 'teilnehmer/tag_01/starter/PapDesigner.exe', content: '', solutionOnly: false },
    { path: 'teilnehmer/tag_01/loesung/hinweis.md', content: 'Loesung', solutionOnly: true }
  ], targets);

  assert.equal(files.some((file) => file.path.endsWith('.ipynb') && JSON.parse(file.content).nbformat === 4), true);
  assert.equal(files.every((file) => !/\.(exe|bat|cmd|ps1)$/i.test(file.path)), true);
  assert.equal(blocked.isValid, false);
  assert.equal(blocked.errors.some((error) => /Ausfuehrbare Datei/.test(error)), true);
  assert.equal(blocked.errors.some((error) => /solutionOnly/.test(error)), true);
});

test('demo target service maps topics to safe demo targets and artifacts', () => {
  const base = (title, profile = {}) => inferDemoTargetsForDays({
    dayResults: [{ dayNumber: 1, title, tasks: [{ title, text: title }], webvariant: { teacherHtmlSections: [] } }],
    coursePlan: { days: [{ dayNumber: 1, title, mainTopic: title }] },
    containerProfile: profile
  })[0];
  const excel = base('Excel Tabelle filtern');
  const word = base('Bericht und Dokumentation schreiben');
  const java = base('Java Klasse und Methode');
  const sql = base('SQL SELECT Abfrage');
  const drawio = base('ERM Diagramm modellieren');
  const artifacts = generateDemoArtifacts([excel, word, java, sql, drawio]);

  assert.equal(excel.tool, 'excel');
  assert.match(excel.filePath, /\.csv$/);
  assert.equal(word.tool, 'word');
  assert.match(word.filePath, /\.rtf$/);
  assert.equal(java.tool, 'vscode');
  assert.match(java.filePath, /Main\.java$/);
  assert.equal(sql.tool, 'sql');
  assert.equal(sql.safety.allowAutoRun, false);
  assert.match(artifacts.find((file) => file.path === sql.filePath).content, /nicht automatisch ausgefuehrt/);
  assert.equal(drawio.tool, 'drawio');
  assert.match(drawio.filePath, /\.drawio$/);
});

test('demo launcher blocks unsafe paths and opens safe files through shell mock', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-demo-launcher-'));
  try {
    fs.writeFileSync(path.join(dir, 'demo.csv'), 'Name;Wert\nA;1\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'demo.sql'), '-- Diese Datei ist eine Demo und wird nicht automatisch ausgefuehrt.\nSELECT 1;\n', 'utf8');
    const opened = [];
    const shellMock = { openPath: async (target) => { opened.push(target); return ''; } };
    const csv = await openDemoTarget({ tool: 'excel', filePath: 'demo.csv' }, dir, { shell: shellMock });
    const sql = await openDemoTarget({ tool: 'sql', filePath: 'demo.sql' }, dir, { shell: shellMock });
    const outside = await openDemoTarget({ tool: 'excel', filePath: '../secret.csv' }, dir, { shell: shellMock });
    const blocked = await openDemoTarget({ tool: 'default', filePath: 'demo.cmd' }, dir, { shell: shellMock });

    assert.equal(csv.success, true);
    assert.equal(sql.success, true);
    assert.equal(opened.length, 2);
    assert.equal(outside.success, false);
    assert.equal(outside.errorCategory, 'outside-container');
    assert.equal(blocked.success, false);
    assert.equal(blocked.errorCategory, 'blocked-extension');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('generated container validator blocks admin ai key store export', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-secret-export-'));
  try {
    const secureDir = path.join(dir, 'secure');
    fs.mkdirSync(secureDir, { recursive: true });
    fs.writeFileSync(path.join(secureDir, 'ai-provider-config.json'), '{"provider":"openai"}', 'utf8');
    const result = validateGeneratedContainer(dir, {});
    assert.equal(result.isValid, false);
    assert.equal(result.errors.some((error) => /Secret-\/Key-Datei/.test(error)), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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

test('content factory preflight blocks incomplete input and warns before cloud fallback', () => {
  const red = runPreflight({});
  const yellow = runPreflight(createApprovedTestInput({ aiMode: 'openai' }), { aiStatus: { providers: { openai: { configured: false } } } });
  const green = runPreflight(createApprovedTestInput({ aiMode: 'local' }));
  const unknownAge = runPreflight(createApprovedTestInput({ targetAudience: { ...createApprovedTestInput().targetAudience, ageRange: 'unknown' } }));

  assert.equal(red.status, 'red');
  assert.ok(red.errors.some((error) => /Kursname|CurriculumPlanDraft/.test(error)));
  assert.equal(yellow.status, 'yellow');
  assert.ok(yellow.warnings.some((warning) => /OpenAI.*kein API-Key|OpenAI ist nicht konfiguriert/.test(warning)));
  assert.equal(green.status, 'green');
  assert.equal(unknownAge.status, 'yellow');
  assert.ok(unknownAge.warnings.some((warning) => /Zielgruppenalter/.test(warning)));
});

test('content factory presets use safe defaults for beginner code database and diagrams', () => {
  const ids = listPresets().map((preset) => preset.id);
  const javaBeginner = applyPreset('java-beginner', {});
  const javaAdvanced = applyPreset('java-advanced', {});
  const sql = applyPreset('sql-phpmyadmin-beginner', {});
  const uml = applyPreset('uml-pap-erm', {});

  assert.ok(ids.includes('java-beginner'));
  assert.equal(javaBeginner.containerProfile.courseType, 'java');
  assert.equal(javaAdvanced.containerProfile.courseType, 'java-maven');
  assert.equal(sql.containerProfile.allowDatabaseActions, false);
  assert.equal(uml.containerProfile.allowExecutableTools, false);
});

test('content factory test draft respects preflight gates and cleanup removes generated drafts only', async () => {
  const { dir, service, session, cleanup } = createTempFactory();

  try {
    const failed = await service.runContentFactoryTestDraft({}, session);
    const warning = await service.runContentFactoryTestDraft(createApprovedTestInput({ aiMode: 'openai' }), session);
    const created = await service.runContentFactoryTestDraft(createApprovedTestInput({ aiMode: 'openai', confirmWarnings: true }), session);
    const referenceDir = path.join(dir, 'data', 'content-factory', 'reference-library');
    const referenceFile = path.join(referenceDir, 'keep.txt');
    fs.mkdirSync(referenceDir, { recursive: true });
    fs.writeFileSync(referenceFile, 'reference-only', 'utf8');

    assert.equal(failed.status, 'failed');
    assert.equal(warning.requiresConfirmation, true);
    assert.equal(created.status, 'warning');
    assert.equal(fs.existsSync(created.standalonePath), true);
    assert.equal(fs.existsSync(created.reportPath), true);
    const cleanupReport = service.deleteGeneratedDraft(created.containerId, session);
    assert.equal(cleanupReport.status, 'success');
    assert.equal(fs.existsSync(created.storagePath), false);
    assert.equal(fs.existsSync(referenceFile), true);
  } finally {
    cleanup();
  }
});

test('content factory ui exposes test protocol open action', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');

  assert.match(ui, /Testprotokoll oeffnen/);
  assert.match(ui, /data-wizard-open="test-protocol"/);
  assert.match(ui, /Prompt-Praezision/);
  assert.match(ui, /previewPromptQuality/);
  assert.match(ui, /runPromptGoldenTests/);
  assert.doesNotMatch(ui, /OPENAI_API_KEY|apiKey|secret/i);
});

test('content factory navigation opens guided plan wizard before raw imports', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');

  assert.match(html, /data-open-factory-section="plan-wizard"/);
  assert.match(html, /Neuen Kurscontainer erstellen/);
  assert.match(html, /Unterrichtsplan, PowerPoint oder Materialien analysieren/);
  assert.doesNotMatch(html, /<strong>Container Erstellung<\/strong>[\s\S]*data-open-factory-section="import"/);
  assert.match(html, /Rohdaten \/ Experte/);
  assert.match(ui, /getFactoryTabGates/);
  assert.match(ui, /Bitte zuerst den Plan-Wizard abschliessen/);
});

test('content factory plan wizard renders gated single steps with source and ai guidance', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');
  const expectedSteps = ['course', 'anchor', 'durationAudience', 'didactics', 'containerProfile', 'analysis', 'curriculumReview', 'materials', 'aiMode', 'generation', 'preflight'];

  expectedSteps.forEach((step) => assert.match(ui, new RegExp(`id: '${step}'`), step));
  assert.match(ui, /state\.wizard\.activeStep = target\.id/);
  assert.match(ui, /data-plan-step-content="\$\{escapeHtml\(|data-plan-step-content="anchor"/);
  assert.match(ui, /data-wizard-analyze \$\{wizard\.anchorFiles\.length \? '' : 'disabled'\}/);
  ['Unterrichtsplan Upload', 'PowerPoint', 'PDF', 'EPUB', 'Word', 'Markdown', 'HTML', 'TXT', '.zip'].forEach((term) => assert.match(ui, new RegExp(term.replace('.', '\\.')), term));
  ['local', 'openai', 'openai-review', 'openai-review-repair'].forEach((mode) => assert.match(ui, new RegExp(mode), mode));
  assert.match(ui, /Schritt ueberspringen/);
  assert.match(ui, /Dieser Schritt ist noch gesperrt/);
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

function createApprovedTestInput(patch = {}) {
  const course = { courseName: 'Java Grundlagen', courseId: 'java-grundlagen', department: 'FIAE' };
  const targetAudience = {
    department: 'FIAE',
    ageRange: '20-30',
    educationContext: 'umschulung',
    priorKnowledge: 'basic',
    learningLevel: 'basic',
    difficultyMode: 'normal',
    needsStepByStep: true,
    projectOrientation: true
  };
  const curriculumPlan = {
    id: 'curriculum-test',
    status: 'approved',
    course,
    targetAudience,
    didacticProfile: getDidacticProfile('guided-coding'),
    quality: { score: 82, level: 'good', recommendations: [] },
    days: [{
      dayNumber: 1,
      title: 'Tag 1 - Java Einstieg',
      mainTopic: 'Variablen',
      estimatedUE: 8,
      learningGoals: ['Variablen erklaeren'],
      topics: [{
        id: 'topic-1',
        title: 'Variablen',
        summary: 'Datentypen und Variablen einfuehren.',
        sourceRefs: ['manual'],
        estimatedUE: 4,
        difficulty: 'normal',
        depth: 'basic',
        practiceType: 'guided-task',
        active: true
      }]
    }]
  };
  const coursePlan = {
    courseTitle: course.courseName,
    courseId: course.courseId,
    department: course.department,
    selectedSheet: 'Test',
    sourceFile: 'manual',
    days: [{
      dayNumber: 1,
      title: 'Tag 1 - Java Einstieg',
      mainTopic: 'Variablen',
      learningGoals: ['Variablen erklaeren'],
      ueBlocks: [{ topic: 'Variablen', learnerTask: 'Variable anlegen', teacherTask: 'Datentypen zeigen', evaluation: 'Code pruefen', resources: 'manual' }],
      warnings: []
    }],
    warnings: []
  };
  return {
    course,
    targetAudience,
    approvedCurriculumPlan: curriculumPlan,
    curriculumPlan,
    coursePlan,
    aiMode: 'local',
    useReferences: false,
    referenceUsage: { exportReferences: false },
    didacticProfile: getDidacticProfile('guided-coding'),
    containerProfile: {
      courseType: 'java',
      artifactMode: 'web-and-files',
      studentWorkspace: true,
      teacherSolutions: true,
      generateStarterFiles: true,
      generateSolutionFiles: true,
      generateReadme: true,
      generateSetupGuide: true,
      generateRunScripts: false,
      allowExecutableTools: false,
      allowDatabaseActions: false
    },
    ...patch
  };
}

function restoreEnv(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function createZip(zipPath, entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  Object.entries(entries).forEach(([relativePath, content]) => {
    const name = Buffer.from(relativePath.replace(/\\/g, '/'), 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  });
  const centralSize = centralParts.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  fs.writeFileSync(zipPath, Buffer.concat([...localParts, ...centralParts, end]));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
