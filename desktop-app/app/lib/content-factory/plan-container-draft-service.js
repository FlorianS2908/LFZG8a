const fs = require('fs');
const path = require('path');
const { ensureDir, writeJson } = require('../json-store');
const { normalizeCourseId, normalizeCourseName } = require('./naming/course-name-normalizer');
const { createNamingReport } = require('./naming/naming-report-service');
const { validateGeneratedContainer } = require('./generated-container-validator');
const { buildContainerProfile } = require('./container-profile/container-profile-service');
const { validateGeneratedArtifacts } = require('./container-profile/generated-artifact-validator');
const { generateArtifactFiles } = require('./artifact-generators/artifact-generator-service');
const { inferDemoTargetsForDays } = require('./demo-targets/demo-target-service');
const { generateDemoArtifacts } = require('./demo-targets/demo-artifact-generator');
const { normalizeDidacticProfile } = require('./didactics/didactic-profile-service');
const { buildDidacticFlow, buildReleasePlan } = require('./didactics/lesson-flow-service');
const { normalizeTeacherRunbook } = require('./ai/output-normalizer');
const { recommendDidacticProfiles } = require('./didactics/didactic-profile-service');
const { evaluateDidacticFit } = require('./didactics/didactic-fit-service');
const { createDidacticPreview } = require('./didactics/didactic-preview-service');
const { runDidacticQualityGate } = require('./didactics/didactic-quality-gate');
const { renderPreflightSummary } = require('./preflight/preflight-report-renderer');
const { createTestProtocol } = require('./test-protocol/test-protocol-service');
const { renderTestProtocolHtml } = require('./test-protocol/test-protocol-renderer');
const { renderPromptQualitySummary } = require('./ai-quality-gate/prompt-quality-report-renderer');

function createPlanContainerDraft(input = {}, options = {}) {
  const courseName = normalizeCourseName(input.course?.courseName || input.coursePlan?.courseTitle || 'Neuer Kurs');
  const courseId = normalizeCourseId(input.course?.courseId || courseName);
  const department = input.course?.department || 'ALLGEMEIN';
  const containerId = courseId;
  const rootDir = path.join(options.factoryDir, 'drafts', containerId);
  ensureDir(rootDir);
  const providedResults = input.dayResults?.length ? input.dayResults : [];
  const resultByDay = new Map(providedResults.map((result) => [Number(result.dayNumber), result]));
  const dayResults = (input.coursePlan?.days || providedResults).map((day) => resultByDay.get(Number(day.dayNumber)) || createFallbackDayResult(day));
  const profileContext = buildContainerProfile({
    ...input,
    curriculumPlan: input.approvedCurriculumPlan || input.curriculumPlan,
    targetAudience: input.approvedCurriculumPlan?.targetAudience || input.targetAudience
  });
  const files = createVirtualFiles({ courseName, courseId, department, containerId, coursePlan: input.coursePlan, dayResults, aiMode: input.aiMode || 'local', references: input.references || [], profileContext, targetAudience: input.targetAudience || input.approvedCurriculumPlan?.targetAudience || input.curriculumPlan?.targetAudience || {}, didacticProfile: input.didacticProfile || input.approvedCurriculumPlan?.didacticProfile || input.curriculumPlan?.didacticProfile });
  files.forEach((file) => writeFile(rootDir, file.path, file.content));
  const namingReport = createNamingReport(files, { courseName, courseId });
  const protocolInput = createProtocolInput({ courseName, containerId, input, dayResults, files, rootDir, profileContext });
  let testProtocol = createTestProtocol(protocolInput);
  writeTestProtocol(rootDir, testProtocol);
  const validation = validateGeneratedContainer(rootDir, { courseName, courseId });
  const artifactValidation = validateGeneratedArtifacts(files, profileContext.artifactTargets);
  validation.errors.push(...artifactValidation.errors);
  validation.warnings.push(...artifactValidation.warnings);
  validation.isValid = validation.errors.length === 0;
  testProtocol = createTestProtocol({ ...protocolInput, validation });
  writeTestProtocol(rootDir, testProtocol);
  const analysisReport = createAnalysisReport({ courseName, courseId, department, input, dayResults, files, namingReport, validation, rootDir, profileContext, testProtocol });
  writeJson(path.join(rootDir, 'reports', `${containerId}-analysis-report.json`), analysisReport);
  writeFile(rootDir, `reports/${containerId}-analysis-report.html`, renderReportHtml(analysisReport));
  writeJson(path.join(rootDir, 'container.json'), {
    id: containerId,
    status: 'draft',
    storagePath: rootDir,
    manifest: readJson(path.join(rootDir, 'manifest.json'), {}),
    analysisReport
  });
  return {
    id: containerId,
    containerId,
    status: 'draft',
    storagePath: rootDir,
    standalonePath: path.join(rootDir, 'standalone', 'index.html'),
    reportPath: path.join(rootDir, 'reports', `${containerId}-analysis-report.html`),
    testProtocolPath: path.join(rootDir, 'reports', 'testprotokoll.html'),
    testProtocol,
    analysisReport,
    validation
  };
}

function writeTestProtocol(rootDir, protocol) {
  writeJson(path.join(rootDir, 'reports', 'testprotokoll.json'), protocol);
  writeFile(rootDir, 'reports/testprotokoll.html', renderTestProtocolHtml(protocol));
}

function createProtocolInput({ courseName, containerId, input, dayResults, files, rootDir, profileContext, validation = null }) {
  const curriculum = input.approvedCurriculumPlan || input.curriculumPlan || {};
  return {
    containerId,
    courseName,
    rootDir,
    preflight: input.preflight || null,
    confirmWarnings: input.confirmWarnings === true,
    curriculum,
    targetAudience: curriculum.targetAudience || input.targetAudience || {},
    containerProfile: profileContext.containerProfile,
    artifactSuggestions: profileContext.artifactSuggestions,
    artifactTargets: profileContext.artifactTargets,
    demoTargets: readDemoTargetsFromFiles(files),
    didacticProfile: readJsonFromFiles(files, 'catalog/didactic-profile.json', {}),
    didacticDecision: readJsonFromFiles(files, 'catalog/didactic-decision.json', {}),
    didacticQuality: readJsonFromFiles(files, 'catalog/didactic-quality.json', {}),
    teacherRunbooks: readJsonFromFiles(files, 'catalog/teacher-runbooks.json', []),
    releasePlan: readJsonFromFiles(files, 'catalog/release-plan.json', []),
    dayResults,
    expectedDayCount: (curriculum.days || input.coursePlan?.days || []).length,
    files,
    validation,
    aiRuns: dayResults.map((result) => result.aiMeta).filter(Boolean),
    aiConfig: input.aiConfig || {},
    costEstimate: input.costEstimate || null
  };
}

function readJsonFromFiles(files = [], filePath, fallback) {
  const file = files.find((item) => item.path === filePath);
  if (!file) return fallback;
  try {
    return JSON.parse(file.content);
  } catch {
    return fallback;
  }
}

function createVirtualFiles({ courseName, courseId, department, containerId, coursePlan, dayResults, aiMode, references, profileContext, targetAudience, didacticProfile: inputDidacticProfile }) {
  const artifactFiles = generateArtifactFiles({
    course: { courseName, courseId, department },
    dayResults,
    containerProfile: profileContext.containerProfile,
    artifactTargets: profileContext.artifactTargets,
    artifactSuggestions: profileContext.artifactSuggestions
  });
  const didacticProfile = normalizeDidacticProfile(inputDidacticProfile || dayResults[0]?.didacticProfile || coursePlan?.didacticProfile);
  const didacticInput = { coursePlan, targetAudience: targetAudience || coursePlan?.targetAudience || {}, containerProfile: profileContext.containerProfile, didacticProfile, courseType: profileContext.containerProfile?.courseType };
  const didacticRecommendation = recommendDidacticProfiles(didacticInput);
  const didacticFit = evaluateDidacticFit(didacticProfile, didacticInput);
  const didacticPreview = createDidacticPreview({ didacticProfile, courseType: profileContext.containerProfile?.courseType, targetAudience: didacticInput.targetAudience, duration: coursePlan?.duration || {}, courseGoal: coursePlan?.courseTitle || coursePlan?.courseGoal || '' });
  const didacticFlowByDay = new Map(dayResults.map((result) => [
    Number(result.dayNumber),
    result.didacticFlow?.length ? result.didacticFlow : buildDidacticFlow(didacticProfile, result)
  ]));
  const releasePlan = buildReleasePlan(didacticProfile, dayResults);
  const demoTargets = inferDemoTargetsForDays({
    dayResults,
    coursePlan,
    containerProfile: profileContext.containerProfile,
    didacticProfile,
    options: {
      maxPerDay: didacticProfile.defaultDemoEnabled === false ? 0 : Number(profileContext.containerProfile?.demoCountPerDay ?? 1),
      visibleForParticipants: profileContext.containerProfile?.participantDemos === true || didacticProfile.defaultParticipantDemoVisible === true
    }
  });
  const demoFiles = generateDemoArtifacts(demoTargets);
  const teacherRunbooks = dayResults.map((result) => {
    const dayNumber = Number(result.dayNumber);
    return normalizeTeacherRunbook(result.teacherRunbook, {
      dayNumber,
      title: result.title,
      didacticFlow: didacticFlowByDay.get(dayNumber) || [],
      demos: demoTargets.filter((target) => Number(target.dayNumber) === dayNumber),
      tasks: result.tasks || [],
      quiz: result.quiz || [],
      releasePlan: releasePlan.filter((item) => Number(item.dayNumber) === dayNumber),
      reflection: result.reflection || {}
    });
  });
  const teacherRunbookByDay = new Map(teacherRunbooks.map((runbook) => [Number(runbook.dayNumber), runbook]));
  const enrichedDayResults = dayResults.map((result) => ({
    ...result,
    teacherRunbook: teacherRunbookByDay.get(Number(result.dayNumber))
  }));
  const didacticQuality = enrichedDayResults.map((result) => runDidacticQualityGate(result, { didacticProfile }));
  const artifactMetadata = artifactFiles.map((file) => ({
    path: file.path,
    role: file.role,
    kind: file.kind,
    solutionOnly: file.solutionOnly === true,
    title: file.metadata?.title || path.basename(file.path),
    reason: file.metadata?.reason || '',
    targetAudienceImpact: file.metadata?.targetAudienceImpact || ''
  }));
  const days = enrichedDayResults.map((result) => {
    const daySlug = `tag_${String(result.dayNumber).padStart(2, '0')}`;
    const dayArtifacts = artifactMetadata.filter((artifact) => artifact.path.includes(`/${daySlug}/`) || artifact.path.includes(`\\${daySlug}\\`));
    const dayDemos = demoTargets.filter((target) => Number(target.dayNumber) === Number(result.dayNumber));
    const didacticFlow = didacticFlowByDay.get(Number(result.dayNumber)) || [];
    const dayReleasePlan = releasePlan.filter((item) => Number(item.dayNumber) === Number(result.dayNumber));
    return {
      dayNumber: result.dayNumber,
      title: result.title,
      teacherWeb: `dozent/${daySlug}/webvariante.html`,
      teacherRunbook: `dozent/${daySlug}/unterrichtsablauf.html`,
      teacherTasks: `dozent/${daySlug}/aufgaben.html`,
      teacherSolutions: `dozent/${daySlug}/loesungen.html`,
      participantWeb: `teilnehmer/${daySlug}/webvariante.html`,
      participantTasks: `teilnehmer/${daySlug}/aufgaben.html`,
      quiz: `shared/quiz/${daySlug}.json`,
      didacticFlow,
      demos: dayDemos.map((target) => target.id),
      releasePlan: dayReleasePlan,
      artifacts: dayArtifacts,
      sourceRefs: result.sourceRefs || [],
      warnings: result.warnings || []
    };
  });
  const participantContent = days.map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    web: day.participantWeb,
    tasks: day.participantTasks,
    quiz: day.quiz,
    demos: demoTargets.filter((target) => Number(target.dayNumber) === Number(day.dayNumber) && target.visibleForParticipants === true).map((target) => target.id),
    artifacts: (day.artifacts || []).filter((artifact) => artifact.role !== 'teacher' && !artifact.solutionOnly).map((artifact) => artifact.path)
  }));
  const releaseKeys = days.map((day) => `${courseId}-tag-${String(day.dayNumber).padStart(2, '0')}`);
  const manifest = {
    id: containerId,
    displayName: courseName,
    courseName,
    courseId,
    department,
    category: 'course',
    containerType: 'learning-content',
    version: '0.1.0',
    status: 'draft',
    assignable: true,
    exportable: true,
    runtimeModes: {
      standalone: { enabled: true, entry: 'standalone/index.html' },
      platform: { enabled: true, adapter: 'platform/adapter.json', catalog: 'catalog/days.json' }
    }
  };
  const adapter = {
    contentContainerId: containerId,
    courseName,
    courseId,
    department,
    supportedReleaseKeys: releaseKeys,
    roles: {
      teacher: { catalog: 'catalog/days.json', canSeeSolutions: true },
      participant: { catalog: 'catalog/participant-content.json', canSeeSolutions: false }
    },
    integration: {
      requiresCourseInstance: true,
      usesReleaseStates: true,
      usesCourseMembers: true,
      usesAuditLog: true
    }
  };
  const files = [
    jsonFile('manifest.json', manifest),
    jsonFile('catalog/days.json', days),
    jsonFile('catalog/didactic-profile.json', didacticProfile),
    jsonFile('catalog/didactic-decision.json', { selectedProfile: didacticProfile, recommendation: didacticRecommendation, fit: didacticFit, preview: didacticPreview, customized: didacticProfile.customized === true, baseProfileId: didacticProfile.baseProfileId || didacticProfile.id }),
    jsonFile('catalog/didactic-quality.json', didacticQuality),
    jsonFile('catalog/teacher-runbooks.json', teacherRunbooks),
    jsonFile('catalog/demo-targets.json', demoTargets),
    jsonFile('catalog/release-plan.json', releasePlan),
    jsonFile('catalog/projects.json', []),
    jsonFile('catalog/tools.json', profileContext.toolProfiles),
    jsonFile('catalog/artifacts.json', artifactMetadata),
    jsonFile('catalog/participant-content.json', participantContent),
    jsonFile('catalog/release-keys.json', releaseKeys),
    jsonFile('platform/adapter.json', adapter),
    jsonFile('platform/route-map.json', days.map((day) => ({ dayNumber: day.dayNumber, route: day.participantWeb }))),
    jsonFile('platform/integration.json', adapter.integration),
    jsonFile('source-map.json', { generatedFrom: 'content-factory', coursePlan: coursePlan?.sourceFile || '', selectedSheet: coursePlan?.selectedSheet || '', references: references.map(publicReference), aiMode, containerProfile: profileContext.containerProfile, didacticProfile: { id: didacticProfile.id, teachingModel: didacticProfile.teachingModel } }),
    { path: 'README.md', content: `# ${courseName}\n\nStatus: Draft\n\nStandalone: standalone/index.html\n` },
    { path: 'dozent/index.html', content: renderIndex(courseName, days, 'Dozentenansicht') },
    { path: 'teilnehmer/index.html', content: renderIndex(courseName, days, 'Teilnehmer-Vorschau') },
    { path: 'standalone/index.html', content: renderStandalone(courseName, days, enrichedDayResults) },
    { path: 'standalone/standalone.js', content: standaloneJs() },
    { path: 'standalone/standalone.css', content: standaloneCss() },
    ...artifactFiles,
    ...demoFiles
  ];
  enrichedDayResults.forEach((result) => {
    const daySlug = `tag_${String(result.dayNumber).padStart(2, '0')}`;
    const dayDemos = demoTargets.filter((target) => Number(target.dayNumber) === Number(result.dayNumber));
    const didacticFlow = didacticFlowByDay.get(Number(result.dayNumber)) || [];
    const dayReleasePlan = releasePlan.filter((item) => Number(item.dayNumber) === Number(result.dayNumber));
    files.push({ path: `dozent/${daySlug}/webvariante.html`, content: renderSections(courseName, result.title, result.webvariant.teacherHtmlSections, true, dayDemos, didacticFlow, dayReleasePlan, didacticProfile, `unterrichtsablauf.html`) });
    files.push({ path: `dozent/${daySlug}/unterrichtsablauf.html`, content: renderTeacherRunbook(courseName, result.teacherRunbook, didacticProfile, dayDemos, dayReleasePlan) });
    files.push({ path: `dozent/${daySlug}/aufgaben.html`, content: renderTasks(courseName, result.title, result.tasks) });
    files.push({ path: `dozent/${daySlug}/loesungen.html`, content: renderTasks(courseName, result.title, result.solutions, 'Loesungen') });
    files.push({ path: `teilnehmer/${daySlug}/webvariante.html`, content: renderSections(courseName, result.title, result.webvariant.participantHtmlSections, false, dayDemos.filter((target) => target.visibleForParticipants === true), didacticFlow, [], didacticProfile) });
    files.push({ path: `teilnehmer/${daySlug}/aufgaben.html`, content: renderTasks(courseName, result.title, result.tasks) });
    files.push(jsonFile(`shared/quiz/${daySlug}.json`, { dayNumber: result.dayNumber, questions: result.quiz }));
    files.push(jsonFile(`reviews/${daySlug}.json`, { dayNumber: result.dayNumber, status: 'draft', warnings: result.warnings, aiAdditions: result.aiAdditions }));
  });
  return files;
}

function createFallbackDayResult(day = {}) {
  const dayNumber = Number(day.dayNumber || 1);
  const title = day.title || `Tag ${dayNumber}`;
  const goals = day.learningGoals?.length ? day.learningGoals : ['Lernziel pruefen.'];
  const blocks = day.ueBlocks?.length ? day.ueBlocks : [{ topic: day.mainTopic || title, learnerTask: 'Aufgabe noch ergaenzen', teacherTask: 'Dozentenhinweis noch ergaenzen', evaluation: 'Loesung noch ergaenzen', resources: 'Material noch ergaenzen' }];
  const sourceRefs = [`course-plan-day-${dayNumber}`];
  return {
    dayNumber,
    title,
    status: 'draft',
    webvariant: {
      teacherHtmlSections: [
        { title: 'Tagesziel', content: `<ul>${goals.map((goal) => `<li>${escapeHtml(goal)}</li>`).join('')}</ul>`, sourceRefs, aiGenerated: false },
        { title: 'UE-Bloecke', content: blocks.map((block) => `<p><strong>${escapeHtml(block.topic || title)}</strong><br>${escapeHtml(block.teacherTask || '')}</p>`).join(''), sourceRefs, aiGenerated: false }
      ],
      participantHtmlSections: [
        { title: 'Tagesziel', content: `<ul>${goals.map((goal) => `<li>${escapeHtml(goal)}</li>`).join('')}</ul>`, sourceRefs, aiGenerated: false },
        { title: 'Lernaufgaben', content: `<ul>${blocks.map((block) => `<li>${escapeHtml(block.learnerTask || 'Aufgabe noch ergaenzen')}</li>`).join('')}</ul>`, sourceRefs, aiGenerated: false }
      ]
    },
    tasks: blocks.map((block, index) => ({ id: `task-${dayNumber}-${index + 1}`, title: block.topic || `Aufgabe ${index + 1}`, text: block.learnerTask || 'Aufgabe noch ergaenzen', sourceRefs, aiGenerated: false })),
    solutions: blocks.map((block, index) => ({ id: `solution-${dayNumber}-${index + 1}`, title: `Loesung ${index + 1}`, text: block.evaluation || block.teacherTask || 'Loesung noch ergaenzen', sourceRefs, aiGenerated: false })),
    quiz: [{ id: `quiz-${dayNumber}-1`, text: 'Quizfrage noch fachlich ergaenzen.', options: ['Korrekt', 'Nicht korrekt'], correct: [0], sourceRefs, aiGenerated: false }],
    sourceRefs,
    warnings: ['Automatischer Basisentwurf fuer noch nicht einzeln generierten Tag.'],
    aiAdditions: []
  };
}

function renderStandalone(courseName, days, dayResults) {
  const safeResults = dayResults.map((result) => ({
    dayNumber: result.dayNumber,
    title: result.title,
    webvariant: result.webvariant || { teacherHtmlSections: [], participantHtmlSections: [] },
    tasks: result.tasks || [],
    solutions: result.solutions || [],
    quiz: result.quiz || [],
    demos: (days.find((day) => Number(day.dayNumber) === Number(result.dayNumber))?.demos || []),
    teacherRunbook: result.teacherRunbook || null,
    sourceRefs: result.sourceRefs || [],
    warnings: result.warnings || []
  }));
  const data = JSON.stringify({ courseName, days, dayResults: safeResults }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(courseName)}</title><link rel="stylesheet" href="standalone.css"></head><body><header><p>Standalone-Draft: lokale Testvorschau ohne Plattform-Freigabe. Testprotokoll im Reports-Ordner verfuegbar.</p><h1>${escapeHtml(courseName)}</h1><nav><button type="button" data-role="participant" class="active">Teilnehmer-Vorschau</button><button type="button" data-role="teacher">Dozentenansicht</button></nav></header><main id="app"></main><script>window.CONTENT_FACTORY_DATA=${data};</script><script src="standalone.js"></script></body></html>`;
}

function renderSections(courseName, title, sections, teacher, demos = [], didacticFlow = [], releasePlan = [], didacticProfile = {}, runbookPath = '') {
  return page(`${courseName} - ${title}`, `<p><strong>${teacher ? 'Dozentenansicht' : 'Teilnehmer-Vorschau'}</strong></p>${teacher && didacticProfile?.label ? `<section class="didactic-profile"><h2>Didaktisches Profil</h2><p>${escapeHtml(didacticProfile.label)} | Demo: ${escapeHtml(didacticProfile.demoStrategy || '-')} | Freigabe: ${escapeHtml(didacticProfile.releaseStrategy || '-')}</p></section>` : ''}${teacher && runbookPath ? `<p><a href="${escapeHtml(runbookPath)}">Dozenten-Fahrplan oeffnen</a></p>` : ''}${renderDidacticFlow(didacticFlow, teacher, didacticProfile)}${renderDemoButtons(demos, teacher)}${teacher && releasePlan.length ? renderReleaseHint(releasePlan) : ''}${sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${section.content}</section>`).join('')}`);
}

function renderTeacherRunbook(courseName, runbook = {}, didacticProfile = {}, demos = [], releasePlan = []) {
  const phases = runbook.phases || [];
  return page(`${courseName} - ${runbook.title || 'Unterrichtsablauf'}`, `
    <h1>Dozenten-Fahrplan: ${escapeHtml(runbook.title || '')}</h1>
    <p>Didaktisches Profil: ${escapeHtml(didacticProfile.label || didacticProfile.id || '-')} | Gesamtzeit: ${escapeHtml(runbook.estimatedTotalMinutes || 0)} Minuten</p>
    <section><h2>Tagesziel</h2><p>${escapeHtml(runbook.title || '')}</p></section>
    <section><h2>Zeitplan und Phasen</h2>${phases.map((phase) => `
      <article>
        <h3>${escapeHtml(phase.title)} (${escapeHtml(phase.estimatedMinutes)} Min.)</h3>
        <p><strong>Dozent:</strong> ${escapeHtml(phase.teacherAction)}</p>
        <p><strong>Teilnehmende:</strong> ${escapeHtml(phase.participantAction)}</p>
        ${phase.moderationQuestions?.length ? `<p><strong>Moderationsfragen:</strong></p>${listHtml(phase.moderationQuestions)}` : ''}
        ${phase.demoId ? `<p><strong>Demo:</strong> ${escapeHtml(phase.demoId)}</p>` : ''}
        ${phase.releaseActions?.length ? `<p><strong>Freigabe:</strong></p>${listHtml(phase.releaseActions)}` : ''}
        ${phase.typicalProblems?.length ? `<p><strong>Typische Fehler:</strong></p>${listHtml(phase.typicalProblems)}` : ''}
        <p><strong>Differenzierung:</strong> ${escapeHtml(phase.differentiation?.supportWeak || '')} | ${escapeHtml(phase.differentiation?.challengeStrong || '')}</p>
        <p><strong>Checkpoint:</strong> ${escapeHtml(phase.checkpoint || '')}</p>
      </article>
    `).join('')}</section>
    <section><h2>Demo-Schritte</h2>${listHtml(demos.map((demo) => `${demo.title}: ${demo.filePath}`))}</section>
    <section><h2>Freigabe-Schritte</h2>${listHtml(releasePlan.map((item) => item.releaseHint || item.title))}</section>
    <section><h2>Checklisten</h2>
      <h3>Dozent</h3>${listHtml(runbook.teacherChecklist || [])}
      <h3>Material</h3>${listHtml(runbook.materialChecklist || [])}
      <h3>Demo</h3>${listHtml(runbook.demoChecklist || [])}
      <h3>Assessment</h3>${listHtml(runbook.assessmentChecklist || [])}
    </section>
    <section><h2>Fallback</h2><p>${escapeHtml(runbook.fallbackPlan || '')}</p></section>
  `);
}

function renderDemoButtons(demos = [], teacher = false) {
  if (!demos.length) return '';
  return `<section class="demo-panel"><h2>Demo-Dateien</h2>${demos.map((demo) => `
    <button type="button" class="demo-open-button" data-demo-id="${escapeHtml(demo.id)}" data-demo-path="${escapeHtml(demo.filePath)}" data-demo-tool="${escapeHtml(demo.tool)}">
      ${escapeHtml(demo.buttonLabel || 'Demo oeffnen')}
    </button>
    <p class="demo-hint">${escapeHtml(teacher ? demo.description : 'Diese Demo wurde explizit fuer Teilnehmer freigegeben.')}</p>
  `).join('')}</section>`;
}

function renderDidacticFlow(flow = [], teacher = false, profile = {}) {
  if (!flow.length) return '';
  const visible = teacher ? flow : flow.filter((item) => !/Freigabezentrum|Dozentenhinweis|Dozent/i.test(`${item.title} ${item.teacherAction}`));
  return `<section class="didactic-flow"><h2>Unterrichtsfluss${profile.label ? `: ${escapeHtml(profile.label)}` : ''}</h2><ol>${visible.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(teacher ? item.teacherAction || item.description : item.participantAction || item.description)}</p>${teacher && item.releaseHint ? `<small>${escapeHtml(item.releaseHint)}</small>` : ''}</li>`).join('')}</ol></section>`;
}

function renderReleaseHint(releasePlan = []) {
  const hints = Array.from(new Set(releasePlan.map((item) => item.releaseHint).filter(Boolean)));
  return hints.length ? `<section class="release-plan"><h2>Freigabehinweis</h2><ul>${hints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join('')}</ul></section>` : '';
}

function renderTasks(courseName, title, tasks, heading = 'Aufgaben') {
  return page(`${courseName} - ${title} - ${heading}`, `<h1>${escapeHtml(heading)}</h1><ul>${tasks.map((task) => `<li><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.text)}</p></li>`).join('')}</ul>`);
}

function renderIndex(courseName, days, label) {
  const teacher = /Dozent/i.test(label);
  return page(`${courseName} - ${label}`, `<h1>${escapeHtml(label)}</h1><ul>${days.map((day) => `<li>Tag ${day.dayNumber}: ${escapeHtml(day.title)}${teacher && day.teacherRunbook ? ` - <a href="../${escapeHtml(day.teacherRunbook)}">Unterrichtsablauf</a>` : ''}</li>`).join('')}</ul>`);
}

function page(title, body) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

function standaloneCss() {
  return `:root{color-scheme:light;--ink:#102033;--muted:#64748b;--line:#d8e3f2;--soft:#f5f8fc;--brand:#0b6fbd;--warn:#fff4d6}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;line-height:1.5;color:var(--ink);background:#f8fafc}header{position:sticky;top:0;background:#ffffff;border-bottom:1px solid var(--line);padding:18px 28px;z-index:2}header p{margin:0 0 6px;color:var(--muted);font-size:14px}h1{margin:0 0 14px;font-size:28px}nav{display:flex;gap:8px;flex-wrap:wrap}button{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:6px;padding:9px 12px;font-weight:700;cursor:pointer}button.active{background:var(--brand);border-color:var(--brand);color:#fff}main{max-width:1120px;margin:0 auto;padding:24px}section.day{background:#fff;border:1px solid var(--line);border-radius:8px;padding:18px;margin:0 0 18px}article{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.panel{background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:14px}.warning{background:var(--warn);border:1px solid #f4d17c;border-radius:6px;padding:10px}.teacher-only{display:none}body.teacher .teacher-only{display:block}.refs{color:var(--muted);font-size:13px;word-break:break-word}`;
}

function standaloneJs() {
  return `(() => {
  const data = window.CONTENT_FACTORY_DATA || { days: [], dayResults: [] };
  let role = 'participant';
  const app = document.getElementById('app');
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const renderSections = (sections) => (sections || []).map((section) => '<article><h3>' + escapeHtml(section.title) + '</h3>' + String(section.content || '') + '</article>').join('');
  const renderList = (items, formatter) => '<ul>' + (items || []).map(formatter).join('') + '</ul>';
  function render() {
    document.body.classList.toggle('teacher', role === 'teacher');
    app.innerHTML = data.dayResults.map((result) => {
      const sections = role === 'teacher' ? result.webvariant.teacherHtmlSections : result.webvariant.participantHtmlSections;
      const demoNotice = role === 'teacher' && (result.demos || []).length
        ? '<div class="panel teacher-only"><h3>Demo-Dateien</h3><p>Direktes Oeffnen ist nur in der Electron-App verfuegbar. Demo-Dateien liegen im Containerordner und sind in catalog/demo-targets.json dokumentiert.</p></div>'
        : '';
      const runbookNotice = role === 'teacher' && result.teacherRunbook
        ? '<div class="panel teacher-only"><h3>Dozenten-Fahrplan</h3><p>' + escapeHtml((result.teacherRunbook.phases || []).map((phase) => phase.title).join(' > ')) + '</p></div>'
        : '';
      return '<section class="day"><h2>Tag ' + escapeHtml(result.dayNumber) + ': ' + escapeHtml(result.title) + '</h2>'
        + demoNotice
        + runbookNotice
        + renderSections(sections)
        + '<div class="grid"><div class="panel"><h3>Aufgaben</h3>' + renderList(result.tasks, (task) => '<li><strong>' + escapeHtml(task.title) + '</strong><br>' + escapeHtml(task.text) + '</li>') + '</div>'
        + '<div class="panel"><h3>Quiz</h3>' + renderList(result.quiz, (quiz) => '<li>' + escapeHtml(quiz.text) + '</li>') + '</div></div>'
        + (role === 'teacher' ? '<div class="panel teacher-only"><h3>Loesungen</h3>' + renderList(result.solutions, (solution) => '<li><strong>' + escapeHtml(solution.title) + '</strong><br>' + escapeHtml(solution.text) + '</li>') + '</div>' : '')
        + ((result.warnings || []).length ? '<p class="warning">' + escapeHtml(result.warnings.join(' | ')) + '</p>' : '')
        + ((result.sourceRefs || []).length ? '<p class="refs">Quellen: ' + escapeHtml(result.sourceRefs.join(', ')) + '</p>' : '')
        + '</section>';
    }).join('');
  }
  document.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', () => {
    role = button.dataset.role;
    document.querySelectorAll('[data-role]').forEach((item) => item.classList.toggle('active', item === button));
    render();
  }));
  render();
  document.documentElement.dataset.ready = 'true';
})();\n`;
}

function createAnalysisReport({ courseName, courseId, department, input, dayResults, files, namingReport, validation, rootDir, profileContext, testProtocol }) {
  const curriculum = input.approvedCurriculumPlan || input.curriculumPlan || {};
  const anchor = curriculum.anchor || input.anchor || {};
  const warnings = [
    ...(input.warnings || []),
    ...(curriculum.warnings || []),
    ...dayResults.flatMap((result) => result.warnings || []),
    ...(validation.warnings || [])
  ];
  const solutionCount = dayResults.reduce((sum, result) => sum + (result.solutions || []).length, 0);
  const taskCount = dayResults.reduce((sum, result) => sum + (result.tasks || []).length, 0);
  const quizCount = dayResults.reduce((sum, result) => sum + (result.quiz || []).length, 0);
  const generatedArtifacts = files.filter((file) => file.kind || file.metadata).map((file) => ({
    artifact: file.path,
    topic: file.metadata?.title || '',
    format: path.extname(file.path).replace('.', ''),
    role: file.role || '',
    kind: file.kind || '',
    reason: file.metadata?.reason || '',
    targetAudienceImpact: file.metadata?.targetAudienceImpact || '',
    wasAutoSuggested: true,
    wasUserChanged: false,
    solutionOnly: file.solutionOnly === true
  }));
  const preflightSummary = input.preflight ? renderPreflightSummary(input.preflight) : null;
  const aiRuns = dayResults.map((result) => result.aiMeta).filter(Boolean);
  const promptQuality = renderPromptQualitySummary(aiRuns);
  const fallbackUsed = warnings.some((warning) => /Fallback|nicht konfiguriert/i.test(warning))
    || aiRuns.some((run) => run.fallbackUsed === true || run.provider === 'local')
    || Number(promptQuality.fallbackCount || 0) > 0;
  const didacticProfile = readJson(path.join(rootDir, 'catalog', 'didactic-profile.json'), {});
  const didacticDecision = readJson(path.join(rootDir, 'catalog', 'didactic-decision.json'), {});
  const didacticQuality = readJson(path.join(rootDir, 'catalog', 'didactic-quality.json'), []);
  const releasePlan = readJson(path.join(rootDir, 'catalog', 'release-plan.json'), []);
  const teacherRunbooks = readJson(path.join(rootDir, 'catalog', 'teacher-runbooks.json'), []);
  const teacherRunbookSummary = summarizeTeacherRunbooks(teacherRunbooks, readJson(path.join(rootDir, 'catalog', 'demo-targets.json'), []), releasePlan);
  return {
    courseName,
    courseId,
    department,
    anchorType: anchor.type || '',
    anchorFiles: (anchor.sourceFiles || []).map((file) => file.name || file.originalFilename || ''),
    usedRanges: anchor.ranges || [],
    extractionStatus: (curriculum.extractedSourceOutline || curriculum.outline || []).map((item) => ({
      sourceRef: item.sourceRef,
      title: item.title,
      pageNumber: item.pageNumber || null,
      slideNumber: item.slideNumber || null,
      chapter: item.chapter || null,
      quality: item.quality || null,
      warnings: item.warnings || []
    })),
    curriculumQuality: curriculum.quality || { score: 0, level: 'unknown', recommendations: [] },
    targetAudience: curriculum.targetAudience || input.targetAudience || {},
    duration: curriculum.duration || input.duration || {},
    days: (curriculum.days || []).map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      estimatedUE: day.estimatedUE,
      topicCount: (day.topics || []).length,
      topics: (day.topics || []).map((topic) => ({ title: topic.title, estimatedUE: topic.estimatedUE, sourceRefs: topic.sourceRefs || [] })),
      warnings: day.warnings || []
    })),
    coursePlan: input.coursePlan?.sourceFile || '',
    selectedSheet: input.coursePlan?.selectedSheet || '',
    recognizedDays: input.coursePlan?.days?.length || 0,
    aiMode: input.aiMode || 'local',
    openAiUsed: (input.aiMode || 'local').startsWith('openai') && !warnings.some((warning) => /OpenAI ist nicht konfiguriert|OpenAI-.*Fallback/i.test(warning)),
    fallbackUsed,
    testRunStatus: input.testRun ? 'test-run' : 'manual-draft',
    testProtocol: testProtocol ? {
      path: 'reports/testprotokoll.html',
      jsonPath: 'reports/testprotokoll.json',
      overallStatus: testProtocol.overallStatus,
      summary: testProtocol.summary
    } : null,
    promptQuality,
    didacticProfile,
    didacticDecision,
    didacticQuality,
    teacherRunbooks: teacherRunbookSummary,
    didacticFitScore: didacticDecision.fit?.score || 0,
    recommendedDidacticProfile: didacticDecision.recommendation?.recommended?.profile || {},
    didacticAlternatives: didacticDecision.recommendation?.alternatives || [],
    didacticDecisionWarnings: didacticDecision.recommendation?.warnings || [],
    teachingModel: didacticProfile.teachingModel || '',
    lessonFlow: didacticProfile.lessonFlow || [],
    demoStrategy: didacticProfile.demoStrategy || '',
    releaseStrategy: didacticProfile.releaseStrategy || '',
    taskProgression: didacticProfile.taskProgression || '',
    supportLevel: didacticProfile.supportLevel || '',
    assessmentMode: didacticProfile.assessmentMode || '',
    reflectionMode: didacticProfile.reflectionMode || '',
    didacticWarnings: [],
    releasePlan,
    aiConfig: input.aiConfig || {},
    costEstimate: input.costEstimate || null,
    aiRunCount: promptQuality.runCount,
    aiFallbackCount: promptQuality.fallbackCount,
    readyForReview: validation.isValid && input.preflight?.status !== 'red',
    preset: input.selectedPresetId || input.preset || '',
    preflight: preflightSummary,
    cleanupHints: [
      'Test-Drafts koennen ueber ContentFactory Cleanup geloescht werden.',
      'Staging-Dateien koennen separat geleert werden.',
      'Referenzbibliothek wird niemals automatisch geloescht oder exportiert.'
    ],
    dayCount: dayResults.length,
    topicCount: (curriculum.days || []).reduce((sum, day) => sum + (day.topics || []).length, 0),
    taskCount,
    solutionCount,
    quizCount,
    containerProfile: profileContext.containerProfile,
    artifactSuggestions: profileContext.artifactSuggestions,
    artifactTargets: profileContext.artifactTargets,
    generatedArtifacts,
    demoTargets: readJson(path.join(rootDir, 'catalog', 'demo-targets.json'), []),
    participantArtifacts: generatedArtifacts.filter((item) => item.role !== 'teacher' && !item.solutionOnly),
    teacherArtifacts: generatedArtifacts.filter((item) => item.role === 'teacher' || item.solutionOnly),
    toolProfiles: profileContext.toolProfiles,
    requiredTools: profileContext.toolProfiles.filter((tool) => tool.required).map((tool) => tool.name),
    artifactDecisionReasons: generatedArtifacts.map((item) => ({ artifact: item.artifact, reason: item.reason, targetAudienceImpact: item.targetAudienceImpact })),
    usedMaterials: (input.materials || []).map((file) => file.originalFilename || file.filename || file.name),
    usedReferences: (input.references || []).map(publicReference),
    referenceUsage: {
      enabled: Boolean(input.useReferences),
      exported: false,
      note: 'Referenzliteratur bleibt reference-only und wird nicht in den Kurscontainer kopiert.'
    },
    warnings: Array.from(new Set(warnings.filter(Boolean))),
    namingReport,
    exportSafetyReport: validation,
    openItems: validation.errors || [],
    nextRecommendedSteps: [
      ...(validation.errors || []).length ? ['Export-Schutz-Fehler beheben und Draft neu erzeugen.'] : [],
      ...(generatedArtifacts.length ? [] : ['Container-Konfiguration pruefen: Es wurden keine Artefakte erzeugt.']),
      input.preflight?.status === 'yellow' ? 'Preflight-Warnungen pruefen und bestaetigen.' : '',
      ...(warnings.length ? ['Warnungen fachlich pruefen.'] : []),
      curriculum.quality?.score < 70 ? 'Curriculum Review nachschaerfen und erneut freigeben.' : 'Standalone fachlich pruefen und Kursinstanz vorbereiten.'
    ].filter(Boolean),
    generatedFiles: files.map((file) => file.path),
    exportedPath: rootDir
  };
}

function renderReportHtml(report) {
  return page(`${report.courseName} Analysebericht`, `
    <style>
      body{font-family:Arial,sans-serif;color:#102033;line-height:1.5;margin:24px;background:#f8fafc}
      main{max-width:1120px;margin:auto}.card{background:#fff;border:1px solid #d8e3f2;border-radius:8px;padding:16px;margin:14px 0}
      table{width:100%;border-collapse:collapse;background:#fff}th,td{border-bottom:1px solid #d8e3f2;text-align:left;padding:8px;vertical-align:top}
      .ok{color:#137333}.warn{color:#9a6700}.error{color:#b42318}
    </style>
    <main>
      <h1>Analysebericht</h1>
      <section class="card"><h2>Kursdaten</h2><p><strong>${escapeHtml(report.courseName)}</strong> (${escapeHtml(report.courseId)}) - ${escapeHtml(report.department)}</p><p>Anchor: ${escapeHtml(report.anchorType)} | AI: ${escapeHtml(report.aiMode)} | Fallback: ${report.fallbackUsed ? 'ja' : 'nein'}</p></section>
      <section class="card"><h2>Preflight & Testlauf</h2><p>Status: <strong>${escapeHtml(report.preflight?.status || 'nicht ausgefuehrt')}</strong> | Score: ${escapeHtml(report.preflight?.score ?? '-')} | Modus: ${escapeHtml(report.testRunStatus)}</p><p>Preset: ${escapeHtml(report.preset || 'kein Preset')}</p><p>Ready for Review: ${report.readyForReview ? 'ja' : 'nein'}</p>${listHtml([...(report.preflight?.errors || []), ...(report.preflight?.warnings || []), ...(report.cleanupHints || [])])}</section>
      <section class="card"><h2>Testprotokoll</h2><p>Status: <strong>${escapeHtml(report.testProtocol?.overallStatus || 'fehlt')}</strong></p><p>Pfad: ${escapeHtml(report.testProtocol?.path || '-')}</p><p>Passed: ${escapeHtml(report.testProtocol?.summary?.passed || 0)} | Warnings: ${escapeHtml(report.testProtocol?.summary?.warnings || 0)} | Failed: ${escapeHtml(report.testProtocol?.summary?.failed || 0)} | Manuell: ${escapeHtml(report.testProtocol?.summary?.manualChecks || 0)}</p></section>
      <section class="card"><h2>Prompt Quality</h2><p>KI-Laeufe: ${escapeHtml(report.promptQuality?.runCount || 0)} | Fallbacks: ${escapeHtml(report.promptQuality?.fallbackCount || 0)} | Gate blockiert: ${escapeHtml(report.promptQuality?.blockedCount || 0)}</p><p>Prompt Score: ${escapeHtml(report.promptQuality?.averagePromptQualityScore || 0)} | Output Review: ${escapeHtml(report.promptQuality?.averageOutputReviewScore || 0)}</p><p>Prompt Contracts: ${escapeHtml((report.promptQuality?.promptContracts || []).join(', ') || '-')}</p><p>Templates: ${escapeHtml((report.promptQuality?.promptTemplates || []).join(', ') || '-')}</p>${listHtml(report.promptQuality?.warnings || [])}</section>
      <section class="card"><h2>Didaktik</h2><h3>Didaktische Entscheidung</h3><p><strong>Gewaehltes Profil:</strong> ${escapeHtml(report.didacticProfile?.label || report.teachingModel || '-')} (${escapeHtml(report.didacticProfile?.id || '-')})</p><p><strong>Empfohlen:</strong> ${escapeHtml(report.recommendedDidacticProfile?.label || '-')} | Fit Score: ${escapeHtml(report.didacticFitScore || 0)}</p><p>Teaching Model: ${escapeHtml(report.teachingModel)} | Demo: ${escapeHtml(report.demoStrategy)} | Release: ${escapeHtml(report.releaseStrategy)}</p><p>Progression: ${escapeHtml(report.taskProgression)} | Support: ${escapeHtml(report.supportLevel)} | Assessment: ${escapeHtml(report.assessmentMode)} | Reflexion: ${escapeHtml(report.reflectionMode)}</p><p>LessonFlow: ${escapeHtml((report.lessonFlow || []).join(' > ') || '-')}</p><p><strong>Auswirkungen:</strong> Webvariante folgt dem LessonFlow, Demos folgen ${escapeHtml(report.demoStrategy)}, Aufgaben folgen ${escapeHtml(report.taskProgression)}, Freigaben folgen ${escapeHtml(report.releaseStrategy)}, Quiz/Assessment folgt ${escapeHtml(report.assessmentMode)}, Reflexion folgt ${escapeHtml(report.reflectionMode)}.</p>${listHtml([...(report.didacticDecisionWarnings || []), ...(report.didacticQuality || []).flatMap((item) => item.warnings || []).slice(0, 5)])}<p><strong>Alternative Profile:</strong> ${(report.didacticAlternatives || []).slice(0, 3).map((item) => `${escapeHtml(item.profile?.label || item.profile?.id || '')} (${escapeHtml(item.score)})`).join(' | ') || '-'}</p></section>
      <section class="card"><h2>Dozenten-Fahrplan</h2><p>Anzahl: ${escapeHtml(report.teacherRunbooks?.count || 0)} | Phasen: ${escapeHtml(report.teacherRunbooks?.phaseCount || 0)} | Minuten: ${escapeHtml(report.teacherRunbooks?.estimatedTotalMinutes || 0)}</p><p>Demo-Verknuepfungen: ${escapeHtml(report.teacherRunbooks?.demoLinkCount || 0)} | Freigaben: ${escapeHtml(report.teacherRunbooks?.releaseLinkCount || 0)}</p><p>Typische Fehler: ${report.teacherRunbooks?.hasTypicalProblems ? 'ja' : 'nein'} | Differenzierung: ${report.teacherRunbooks?.hasDifferentiation ? 'ja' : 'nein'} | Checkpoints: ${report.teacherRunbooks?.hasCheckpoints ? 'ja' : 'nein'}</p>${tableHtml(['Tag','Phasen','Minuten','Warnungen'], (report.teacherRunbooks?.days || []).map((day) => [day.dayNumber, day.phaseCount, day.estimatedTotalMinutes, (day.warnings || []).join(' | ')]))}</section>
      <section class="card"><h2>KI-Konfiguration & Kosten</h2><p>AI_PROVIDER: ${escapeHtml(report.aiConfig?.aiProvider || report.aiMode)} | OpenAI configured: ${report.aiConfig?.openAiConfigured ? 'ja' : 'nein'} | Modell: ${escapeHtml(report.aiConfig?.openAiModel || '-')} | keySource: ${escapeHtml(report.aiConfig?.keySource || 'missing')}</p><p>Geschaetzte Kosten: ${escapeHtml(report.costEstimate?.estimatedCostUsd ?? 0)} USD | Limit: ${escapeHtml(report.costEstimate?.warningLimitUsd ?? '-')} USD</p></section>
      <section class="card"><h2>Quality</h2><p><strong>${escapeHtml(report.curriculumQuality.score)}</strong>/100 (${escapeHtml(report.curriculumQuality.level)})</p>${listHtml(report.curriculumQuality.recommendations || [])}</section>
      <section class="card"><h2>Quellen & Extraktion</h2>${tableHtml(['Quelle','Titel','Qualitaet','Warnungen'], (report.extractionStatus || []).map((item) => [item.sourceRef, item.title, item.quality ? `${item.quality.level} (${Math.round(item.quality.score * 100)}%)` : '-', (item.warnings || []).join(' | ')]))}</section>
      <section class="card"><h2>Tage & Themen</h2>${tableHtml(['Tag','Titel','UE','Themen','Warnungen'], (report.days || []).map((day) => [day.dayNumber, day.title, day.estimatedUE, (day.topics || []).map((topic) => topic.title).join(', '), (day.warnings || []).join(' | ')]))}</section>
      <section class="card"><h2>Content</h2><p>Aufgaben: ${escapeHtml(report.taskCount)} | Loesungen: ${escapeHtml(report.solutionCount)} | Quizfragen: ${escapeHtml(report.quizCount)}</p></section>
      <section class="card"><h2>Container-Konfiguration</h2><p>Kurstyp: ${escapeHtml(report.containerProfile?.courseType)} | Modus: ${escapeHtml(report.containerProfile?.artifactMode)}</p><p>Tools: ${escapeHtml((report.toolProfiles || []).map((tool) => tool.name).join(', ') || 'keine')}</p></section>
      <section class="card"><h2>Artefakte</h2>${tableHtml(['Artefakt','Rolle','Format','Grund'], (report.generatedArtifacts || []).map((item) => [item.artifact, item.role, item.format, item.reason]))}</section>
      <section class="card"><h2>Demo-Dateien</h2>${tableHtml(['Demo','Tool','Datei','Teilnehmer'], (report.demoTargets || []).map((item) => [item.title, item.tool, item.filePath, item.visibleForParticipants ? 'ja' : 'nein']))}</section>
      <section class="card"><h2>Export-Schutz</h2><p class="${report.exportSafetyReport?.isValid ? 'ok' : 'error'}">${report.exportSafetyReport?.isValid ? 'Bestanden' : 'Pruefen'}</p>${listHtml([...(report.exportSafetyReport?.errors || []), ...(report.exportSafetyReport?.warnings || [])])}</section>
      <section class="card"><h2>Warnungen</h2>${listHtml(report.warnings || [])}</section>
      <section class="card"><h2>Naechste Schritte</h2>${listHtml(report.nextRecommendedSteps || [])}</section>
      <section class="card"><h2>Erzeugte Dateien</h2>${listHtml((report.generatedFiles || []).slice(0, 200))}</section>
    </main>
  `);
}

function listHtml(items) {
  return items?.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Keine Eintraege.</p>';
}

function tableHtml(headers, rows) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${(rows.length ? rows : [['-']]).map((row) => `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function publicReference(ref) {
  return {
    referenceId: ref.referenceId || ref.id || '',
    title: ref.title || '',
    author: ref.author || '',
    sectionTitle: ref.sectionTitle || '',
    pageNumber: ref.pageNumber || null,
    summary: ref.generatedSummary || ref.summary || '',
    sourceRef: ref.sourceRef || ''
  };
}

function summarizeTeacherRunbooks(runbooks = [], demos = [], releasePlan = []) {
  const days = (runbooks || []).map((runbook) => {
    const phases = runbook.phases || [];
    const warnings = [];
    if (!phases.length) warnings.push('Keine Phasen vorhanden.');
    if (!phases.some((phase) => (phase.typicalProblems || []).length)) warnings.push('Typische Fehler fehlen.');
    if (!phases.some((phase) => phase.differentiation?.supportWeak && phase.differentiation?.challengeStrong)) warnings.push('Differenzierung fehlt.');
    if (!phases.some((phase) => phase.checkpoint)) warnings.push('Checkpoints fehlen.');
    return {
      dayNumber: runbook.dayNumber,
      title: runbook.title,
      phaseCount: phases.length,
      estimatedTotalMinutes: runbook.estimatedTotalMinutes || phases.reduce((sum, phase) => sum + Number(phase.estimatedMinutes || 0), 0),
      demoLinkCount: phases.filter((phase) => phase.demoId).length,
      releaseLinkCount: phases.reduce((sum, phase) => sum + (phase.releaseActions || []).length, 0),
      warnings
    };
  });
  const allPhases = runbooks.flatMap((runbook) => runbook.phases || []);
  return {
    count: runbooks.length,
    phaseCount: allPhases.length,
    estimatedTotalMinutes: days.reduce((sum, day) => sum + Number(day.estimatedTotalMinutes || 0), 0),
    demoLinkCount: allPhases.filter((phase) => phase.demoId).length || demos.length,
    releaseLinkCount: allPhases.reduce((sum, phase) => sum + (phase.releaseActions || []).length, 0) || releasePlan.length,
    hasTypicalProblems: allPhases.some((phase) => (phase.typicalProblems || []).length),
    hasDifferentiation: allPhases.some((phase) => phase.differentiation?.supportWeak && phase.differentiation?.challengeStrong),
    hasCheckpoints: allPhases.some((phase) => phase.checkpoint),
    days
  };
}

function jsonFile(filePath, value) {
  return { path: filePath, content: JSON.stringify(value, null, 2) };
}

function readDemoTargetsFromFiles(files = []) {
  const demoFile = files.find((file) => file.path === 'catalog/demo-targets.json');
  if (!demoFile) return [];
  try { return JSON.parse(demoFile.content); } catch { return []; }
}

function writeFile(rootDir, relativePath, content) {
  const target = path.join(rootDir, relativePath);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content, 'utf8');
}

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
  createPlanContainerDraft
};
