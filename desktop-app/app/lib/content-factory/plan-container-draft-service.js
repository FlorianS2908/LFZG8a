const fs = require('fs');
const path = require('path');
const { ensureDir, writeJson } = require('../json-store');
const { normalizeCourseId, normalizeCourseName } = require('./naming/course-name-normalizer');
const { createNamingReport } = require('./naming/naming-report-service');
const { validateGeneratedContainer } = require('./generated-container-validator');

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
  const files = createVirtualFiles({ courseName, courseId, department, containerId, coursePlan: input.coursePlan, dayResults, aiMode: input.aiMode || 'local', references: input.references || [] });
  files.forEach((file) => writeFile(rootDir, file.path, file.content));
  const namingReport = createNamingReport(files, { courseName, courseId });
  const validation = validateGeneratedContainer(rootDir, { courseName, courseId });
  const analysisReport = createAnalysisReport({ courseName, courseId, department, input, files, namingReport, validation, rootDir });
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
    analysisReport,
    validation
  };
}

function createVirtualFiles({ courseName, courseId, department, containerId, coursePlan, dayResults, aiMode, references }) {
  const days = dayResults.map((result) => {
    const daySlug = `tag_${String(result.dayNumber).padStart(2, '0')}`;
    return {
      dayNumber: result.dayNumber,
      title: result.title,
      teacherWeb: `dozent/${daySlug}/webvariante.html`,
      teacherTasks: `dozent/${daySlug}/aufgaben.html`,
      teacherSolutions: `dozent/${daySlug}/loesungen.html`,
      participantWeb: `teilnehmer/${daySlug}/webvariante.html`,
      participantTasks: `teilnehmer/${daySlug}/aufgaben.html`,
      quiz: `shared/quiz/${daySlug}.json`,
      sourceRefs: result.sourceRefs || [],
      warnings: result.warnings || []
    };
  });
  const participantContent = days.map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    web: day.participantWeb,
    tasks: day.participantTasks,
    quiz: day.quiz
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
    jsonFile('catalog/projects.json', []),
    jsonFile('catalog/tools.json', []),
    jsonFile('catalog/participant-content.json', participantContent),
    jsonFile('catalog/release-keys.json', releaseKeys),
    jsonFile('platform/adapter.json', adapter),
    jsonFile('platform/route-map.json', days.map((day) => ({ dayNumber: day.dayNumber, route: day.participantWeb }))),
    jsonFile('platform/integration.json', adapter.integration),
    jsonFile('source-map.json', { generatedFrom: 'content-factory', coursePlan: coursePlan?.sourceFile || '', selectedSheet: coursePlan?.selectedSheet || '', references: references.map(publicReference), aiMode }),
    { path: 'README.md', content: `# ${courseName}\n\nStatus: Draft\n\nStandalone: standalone/index.html\n` },
    { path: 'dozent/index.html', content: renderIndex(courseName, days, 'Dozentenansicht') },
    { path: 'teilnehmer/index.html', content: renderIndex(courseName, days, 'Teilnehmer-Vorschau') },
    { path: 'standalone/index.html', content: renderStandalone(courseName, days, dayResults) },
    { path: 'standalone/standalone.js', content: 'document.documentElement.dataset.ready = "true";\n' },
    { path: 'standalone/standalone.css', content: standaloneCss() }
  ];
  dayResults.forEach((result) => {
    const daySlug = `tag_${String(result.dayNumber).padStart(2, '0')}`;
    files.push({ path: `dozent/${daySlug}/webvariante.html`, content: renderSections(courseName, result.title, result.webvariant.teacherHtmlSections, true) });
    files.push({ path: `dozent/${daySlug}/aufgaben.html`, content: renderTasks(courseName, result.title, result.tasks) });
    files.push({ path: `dozent/${daySlug}/loesungen.html`, content: renderTasks(courseName, result.title, result.solutions, 'Loesungen') });
    files.push({ path: `teilnehmer/${daySlug}/webvariante.html`, content: renderSections(courseName, result.title, result.webvariant.participantHtmlSections, false) });
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
  const data = JSON.stringify({ courseName, days, dayResults }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(courseName)}</title><link rel="stylesheet" href="standalone.css"></head><body><header><strong>Standalone-Draft: keine echte Plattform-Freigabe</strong><h1>${escapeHtml(courseName)}</h1></header><main id="app"></main><script>const DATA=${data};document.getElementById('app').innerHTML=DATA.days.map((day,index)=>{const result=DATA.dayResults[index];return \`<section><h2>Tag \${day.dayNumber}: \${day.title}</h2><h3>Dozentenansicht</h3>\${result.webvariant.teacherHtmlSections.map(s=>\`<article><h4>\${s.title}</h4>\${s.content}</article>\`).join('')}<h3>Teilnehmer-Vorschau</h3>\${result.webvariant.participantHtmlSections.map(s=>\`<article><h4>\${s.title}</h4>\${s.content}</article>\`).join('')}<h3>Aufgaben</h3><ul>\${result.tasks.map(t=>\`<li>\${t.title}: \${t.text}</li>\`).join('')}</ul><h3>Quiz</h3><ul>\${result.quiz.map(q=>\`<li>\${q.text}</li>\`).join('')}</ul><details><summary>Loesungen nur Dozentenansicht</summary><ul>\${result.solutions.map(s=>\`<li>\${s.title}: \${s.text}</li>\`).join('')}</ul></details></section>\`;}).join('');</script><script src="standalone.js"></script></body></html>`;
}

function renderSections(courseName, title, sections, teacher) {
  return page(`${courseName} - ${title}`, `<p><strong>${teacher ? 'Dozentenansicht' : 'Teilnehmer-Vorschau'}</strong></p>${sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${section.content}</section>`).join('')}`);
}

function renderTasks(courseName, title, tasks, heading = 'Aufgaben') {
  return page(`${courseName} - ${title} - ${heading}`, `<h1>${escapeHtml(heading)}</h1><ul>${tasks.map((task) => `<li><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.text)}</p></li>`).join('')}</ul>`);
}

function renderIndex(courseName, days, label) {
  return page(`${courseName} - ${label}`, `<h1>${escapeHtml(label)}</h1><ul>${days.map((day) => `<li>Tag ${day.dayNumber}: ${escapeHtml(day.title)}</li>`).join('')}</ul>`);
}

function page(title, body) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

function standaloneCss() {
  return 'body{font-family:Arial,sans-serif;margin:24px;line-height:1.5;color:#0f1f33}section{border:1px solid #d7e3f4;border-radius:8px;padding:16px;margin:16px 0}header{background:#f2f7fd;padding:16px;border-radius:8px}details{background:#fff7e6;padding:10px;border-radius:6px}';
}

function createAnalysisReport({ courseName, courseId, department, input, files, namingReport, validation, rootDir }) {
  return {
    courseName,
    courseId,
    department,
    coursePlan: input.coursePlan?.sourceFile || '',
    selectedSheet: input.coursePlan?.selectedSheet || '',
    recognizedDays: input.coursePlan?.days?.length || 0,
    aiMode: input.aiMode || 'local',
    usedMaterials: (input.materials || []).map((file) => file.originalFilename || file.filename || file.name),
    usedReferences: (input.references || []).map(publicReference),
    warnings: [...(input.warnings || []), ...(validation.warnings || [])],
    namingReport,
    exportSafetyReport: validation,
    openItems: validation.errors || [],
    generatedFiles: files.map((file) => file.path),
    exportedPath: rootDir
  };
}

function renderReportHtml(report) {
  return page(`${report.courseName} Analysebericht`, `<h1>Analysebericht</h1><pre>${escapeHtml(JSON.stringify(report, null, 2))}</pre>`);
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

function jsonFile(filePath, value) {
  return { path: filePath, content: JSON.stringify(value, null, 2) };
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
