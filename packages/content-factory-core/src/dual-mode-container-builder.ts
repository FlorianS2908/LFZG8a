import type { CoursePlan, DayMapping, DepartmentKey, DraftContainer, GapAnalysis, VirtualFile } from './types.ts';
import { createDayPreview } from './local-heuristic-provider.ts';
import { createSourceMap } from './source-map-service.ts';
import { normalizeCourseId } from './naming/course-name-normalizer.ts';
import { normalizeVisibleOutput, runNamingConsistency } from './naming/naming-consistency-service.ts';
import { createNamingReport } from './naming/naming-report-service.ts';
import { createDayDraftFromPlan } from './plan-day-draft-generator.ts';

export function buildDualModeContainer(input: {
  coursePlan?: CoursePlan;
  mappings: DayMapping[];
  gapAnalysis: GapAnalysis;
  containerId?: string;
}): DraftContainer {
  if (!input.coursePlan) {
    throw new Error('Unterrichtsplan ist Pflicht fuer Containerexport.');
  }

  const courseName = input.coursePlan.courseTitle;
  const courseId = normalizeCourseId(input.containerId || input.coursePlan.courseId || courseName);
  const department: DepartmentKey = input.coursePlan.department || 'ALLGEMEIN';
  const files: VirtualFile[] = [];
  const dayCatalog: Array<{
    id: string;
    dayNumber: number;
    title: string;
    releaseKey: string;
    theme: string;
    webTeacher: string;
    webParticipant: string;
    tasksTeacher: string;
    tasksParticipant: string;
    solutions: string;
    quizzes: string[];
    sourceRefs: string[];
    teacherPath: string;
    participantPath: string;
    tasksPath: string;
    solutionsPath: string;
  }> = [];
  const participantCatalog: Array<{ dayNumber: number; title: string; releaseKey: string; path: string; tasksPath: string }> = [];
  const releaseKeys: string[] = [];

  files.push({ path: 'manifest.json', content: json({
    id: courseId,
    displayName: courseName,
    courseName,
    courseId,
    department,
    category: 'course',
    containerType: 'learning-content',
    version: '1.0.0',
    status: 'draft',
    assignable: true,
    exportable: true,
    runtimeModes: {
      standalone: { enabled: true, entry: 'standalone/index.html' },
      platform: { enabled: true, adapter: 'platform/adapter.json', catalog: 'catalog/days.json' }
    }
  }) });
  files.push({ path: 'container.json', content: json({ id: courseId, courseName, courseId, department, generatedBy: 'content-factory-lab', mode: 'dual', createdAt: new Date().toISOString() }) });

  input.mappings.forEach((mapping) => {
    const tag = `tag_${String(mapping.dayNumber).padStart(2, '0')}`;
    const preview = createDayPreview(mapping);
    const planDraft = createDayDraftFromPlan(mapping.planDay, courseName);
    const teacherBase = `dozent/${tag}`;
    const participantBase = `teilnehmer/${tag}`;
    const releaseKey = tag;
    const webKey = `${tag}_web`;
    const tasksKey = `${tag}_tasks`;
    const solutionsKey = `${tag}_solutions`;
    const quizKey = `${tag}_quiz`;
    const teacherWeb = `${teacherBase}/webvariante.html`;
    const teacherTasks = `${teacherBase}/aufgaben.html`;
    const teacherSolutions = `${teacherBase}/loesungen.html`;
    const participantWeb = `${participantBase}/webvariante.html`;
    const participantTasks = `${participantBase}/aufgaben.html`;
    const quizPath = `shared/quiz/${tag}.json`;

    files.push({ path: teacherWeb, content: mapping.files.length ? pageHtml(`${courseName} - ${mapping.planDay.title}`, preview.html, courseName) : planDraft.teacherWebHtml });
    files.push({ path: teacherTasks, content: mapping.tasks.length ? createListHtml(`${courseName} - Aufgaben`, mapping.tasks, courseName) : planDraft.teacherTasksHtml });
    files.push({ path: teacherSolutions, content: mapping.solutions.length ? createListHtml(`${courseName} - Loesungen`, mapping.solutions, courseName) : planDraft.solutionsHtml });
    files.push({ path: participantWeb, content: planDraft.participantWebHtml });
    files.push({ path: participantTasks, content: mapping.tasks.length ? createListHtml(`${courseName} - Aufgaben`, mapping.tasks, courseName) : planDraft.participantTasksHtml });
    files.push({ path: quizPath, content: planDraft.quizJson });
    files.push({ path: `reviews/${tag}.json`, content: planDraft.reviewJson });
    dayCatalog.push({
      id: `day-${mapping.dayNumber}`,
      dayNumber: mapping.dayNumber,
      title: mapping.planDay.title,
      releaseKey,
      theme: mapping.planDay.mainTopic,
      webTeacher: teacherWeb,
      webParticipant: participantWeb,
      tasksTeacher: teacherTasks,
      tasksParticipant: participantTasks,
      solutions: teacherSolutions,
      quizzes: [quizPath],
      sourceRefs: [],
      teacherPath: teacherWeb,
      participantPath: participantWeb,
      tasksPath: teacherTasks,
      solutionsPath: teacherSolutions
    });
    participantCatalog.push({ dayNumber: mapping.dayNumber, title: mapping.planDay.title, releaseKey, path: participantWeb, tasksPath: participantTasks });
    releaseKeys.push(releaseKey, webKey, tasksKey, solutionsKey, quizKey);
  });

  files.push({ path: 'dozent/index.html', content: createIndexHtml(courseName, 'Dozentenbereich', dayCatalog.map((day) => day.teacherPath), true) });
  files.push({ path: 'teilnehmer/index.html', content: createIndexHtml(courseName, 'Teilnehmerbereich', participantCatalog.map((day) => day.path), false) });
  files.push({ path: 'catalog/days.json', content: json(dayCatalog) });
  files.push({ path: 'catalog/projects.json', content: json([]) });
  files.push({ path: 'catalog/tools.json', content: json([]) });
  files.push({ path: 'catalog/participant-content.json', content: json(participantCatalog) });
  files.push({ path: 'catalog/release-keys.json', content: json(Array.from(new Set(releaseKeys))) });
  files.push({ path: 'shared/quiz/.gitkeep', content: '' });
  files.push({ path: 'shared/assets/.gitkeep', content: '' });
  files.push({ path: 'shared/metadata/container.json', content: json({ courseName, courseId, department, status: 'draft' }) });
  files.push({ path: 'standalone/index.html', content: standaloneIndex(courseName) });
  files.push({ path: 'standalone/standalone.js', content: standaloneJs() });
  files.push({ path: 'standalone/standalone.css', content: standaloneCss() });
  files.push({ path: 'platform/adapter.json', content: json({
    contentContainerId: courseId,
    courseName,
    courseId,
    department,
    supportedReleaseKeys: Array.from(new Set(releaseKeys)),
    roles: {
      teacher: { catalog: 'catalog/days.json', canSeeSolutions: true },
      participant: { catalog: 'catalog/participant-content.json', canSeeSolutions: false }
    },
    integration: { requiresCourseInstance: true, usesReleaseStates: true, usesCourseMembers: true, usesAuditLog: true }
  }) });
  files.push({ path: 'platform/route-map.json', content: json({
    standalone: 'standalone/index.html',
    teacherEntry: 'dozent/index.html',
    participantEntry: 'teilnehmer/index.html',
    catalog: 'catalog/days.json'
  }) });
  files.push({ path: 'platform/integration.json', content: json({
    provides: ['content-container', 'catalog', 'release-keys'],
    expectsFromPlatform: ['CourseInstance', 'CourseMembers', 'ReleaseStates', 'CourseSettings', 'Attendance', 'AuditLog'],
    containsRuntimeUsers: false,
    containsDatabaseLogic: false
  }) });
  files.push({ path: 'source-map.json', content: json({
    generatedFrom: 'course-plan',
    coursePlan: {
      originalFileName: input.coursePlan.sourceFile || '',
      selectedSheet: input.coursePlan.selectedSheet || 'Tabelle1',
      warnings: input.coursePlan.warnings
    },
    sourceMap: createSourceMap(input.mappings),
    generatedFiles: files.map((file) => file.path)
  }) });

  const report = {
    importTime: new Date().toISOString(),
    courseName,
    courseId,
    department,
    fileCount: input.mappings.reduce((sum, mapping) => sum + mapping.files.length, 0),
    dayCount: input.mappings.length,
    taskCount: input.mappings.reduce((sum, mapping) => sum + mapping.tasks.length, 0),
    solutionCount: input.mappings.reduce((sum, mapping) => sum + mapping.solutions.length, 0),
    quizCount: input.mappings.reduce((sum, mapping) => sum + mapping.quizzes.length, 0),
    projectFileCount: input.mappings.reduce((sum, mapping) => sum + mapping.projectFiles.length, 0),
    selectedSheet: input.coursePlan.selectedSheet,
    coursePlanFile: input.coursePlan.sourceFile,
    ueBlockCount: input.coursePlan.days.reduce((sum, day) => sum + (day.ueBlocks?.length || 0), 0),
    generatedFiles: files.map((file) => file.path),
    warnings: input.gapAnalysis.warnings,
    conflicts: input.gapAnalysis.conflicts,
    gaps: input.gapAnalysis.gaps,
    exportedPath: `output/drafts/${courseId}`
  };

  const normalizedFiles = normalizeVisibleOutput(files, courseName);
  const namingReport = createNamingReport(runNamingConsistency(normalizedFiles, courseName));
  normalizedFiles.push({ path: `reports/${courseId}-analysis-report.json`, content: json(report) });
  normalizedFiles.push({ path: `reports/${courseId}-analysis-report.html`, content: createReportHtml(report) });
  normalizedFiles.push({ path: `reports/${courseId}-naming-report.json`, content: json(namingReport) });
  normalizedFiles.push({ path: 'README.md', content: createContainerReadme(courseName, courseId) });

  return { containerId: courseId, files: normalizedFiles, analysisReport: report };
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function createListHtml(title: string, files: Array<{ fileName: string }>, courseName: string): string {
  const list = files.map((file) => `<li>${escapeHtml(file.fileName)}</li>`).join('') || '<li>Noch keine Quelle zugeordnet.</li>';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(courseName)}</p><ul>${list}</ul></body></html>`;
}

function pageHtml(title: string, innerHtml: string, courseName: string): string {
  return innerHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`).replace(/<body>/, `<body><p><strong>${escapeHtml(courseName)}</strong></p>`);
}

function createIndexHtml(courseName: string, title: string, paths: string[], teacher: boolean): string {
  const links = paths.map((path) => `<li><a href="../${path}">${escapeHtml(path)}</a></li>`).join('');
  const solutionHint = teacher ? '<p>Loesungen sind nur in dieser Dozentenansicht sichtbar.</p>' : '<p>Teilnehmerbereich mit Aufgaben und Materialien.</p>';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(courseName)} - ${escapeHtml(title)}</title></head><body><h1>${escapeHtml(courseName)}</h1><h2>${escapeHtml(title)}</h2>${solutionHint}<ul>${links}</ul></body></html>`;
}

function createParticipantDayHtml(courseName: string, title: string, mainTopic: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(courseName)} - ${escapeHtml(title)}</title></head><body><p><strong>${escapeHtml(courseName)}</strong></p><h1>${escapeHtml(title)}</h1><h2>${escapeHtml(mainTopic)}</h2><p>Bearbeite die Aufgaben und nutze die freigegebenen Materialien.</p></body></html>`;
}

function standaloneIndex(courseName: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(courseName)} Standalone</title><link rel="stylesheet" href="standalone.css"></head><body><header><strong>${escapeHtml(courseName)}</strong><span>Standalone-Vorschau, keine echte Plattform-Freigabe</span></header><main id="app"></main><script src="standalone.js"></script></body></html>`;
}

function standaloneJs(): string {
  return `const app=document.getElementById('app');app.innerHTML='<section><h1>Standalone Runner</h1><p>Dozentenansicht und Teilnehmer-Vorschau lesen die lokalen Kataloge. Loesungen werden nur in der Dozentenansicht verlinkt.</p><button data-role="teacher">Dozent</button><button data-role="participant">Teilnehmer</button><div id="view"></div></section>';document.querySelectorAll('button[data-role]').forEach((button)=>button.addEventListener('click',()=>{const teacher=button.dataset.role==='teacher';document.getElementById('view').innerHTML=teacher?'<h2>Dozentenansicht</h2><p>Tage, Aufgaben, Quiz, Projekte und Loesungen.</p>':'<h2>Teilnehmer-Vorschau</h2><p>Tage, Aufgaben, Quiz und Projekte. Keine Loesungen.</p>';}));`;
}

function standaloneCss(): string {
  return `body{font-family:Arial,sans-serif;margin:0;color:#0b1b33;background:#f6f8fb}header{display:flex;justify-content:space-between;gap:16px;padding:16px 24px;background:#0f5ea8;color:white}main{max-width:960px;margin:32px auto;padding:0 20px}button{margin-right:8px;padding:10px 14px;border:1px solid #0f5ea8;background:#0f5ea8;color:white;border-radius:6px;font-weight:700}#view{margin-top:18px;padding:16px;border:1px solid #c9d8ea;background:white}`;
}

function createReportHtml(report: DraftContainer['analysisReport']): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Analysebericht</title></head><body><h1>${escapeHtml(report.courseName)}</h1><pre>${escapeHtml(JSON.stringify(report, null, 2))}</pre></body></html>`;
}

function createContainerReadme(courseName: string, courseId: string): string {
  return `# ${courseName}\n\nDraft-Container ${courseId}. Dieser Export ist dual-mode-faehig: lokal ueber standalone/index.html testbar und fuer eine spaetere Plattformintegration ueber platform/adapter.json vorbereitet.\n\nKeine echten Nutzer, keine Kursinstanzen, keine Datenbanklogik und keine produktive Freigabe sind enthalten.\n`;
}

function escapeHtml(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
