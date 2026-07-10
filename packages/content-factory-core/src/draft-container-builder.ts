import type { CoursePlan, DayMapping, DepartmentKey, DraftContainer, GapAnalysis, VirtualFile } from './types.ts';
import { createDayPreview } from './local-heuristic-provider.ts';
import { createSourceMap } from './source-map-service.ts';

export function buildDraftContainer(input: {
  coursePlan?: CoursePlan;
  mappings: DayMapping[];
  gapAnalysis: GapAnalysis;
  containerId?: string;
}): DraftContainer {
  if (!input.coursePlan) {
    throw new Error('Unterrichtsplan ist Pflicht fuer Containerexport.');
  }
  const courseId = input.containerId || input.coursePlan.courseId || slugify(input.coursePlan.courseTitle);
  const department: DepartmentKey = input.coursePlan.department || 'ALLGEMEIN';
  const files: VirtualFile[] = [];
  const dayCatalog: Array<{ dayNumber: number; title: string; teacherPath: string; participantPath: string }> = [];
  const releaseKeys: string[] = [];

  files.push({
    path: 'manifest.json',
    content: JSON.stringify({
      id: courseId,
      courseName: input.coursePlan.courseTitle,
      courseId,
      department,
      category: 'course',
      containerType: 'factory-generated',
      status: 'draft',
      version: '0.1.0-lab'
    }, null, 2)
  });
  files.push({
    path: 'container.json',
    content: JSON.stringify({ id: courseId, generatedBy: 'content-factory-lab', createdAt: new Date().toISOString() }, null, 2)
  });

  input.mappings.forEach((mapping) => {
    const tag = `tag_${String(mapping.dayNumber).padStart(2, '0')}`;
    const preview = createDayPreview(mapping);
    const teacherBase = `dozent/${tag}`;
    const participantBase = `teilnehmer/${tag}`;
    files.push({ path: `${teacherBase}/webvariante.html`, content: preview.html });
    files.push({ path: `${teacherBase}/aufgaben.html`, content: createListHtml('Aufgaben', mapping.tasks) });
    files.push({ path: `${teacherBase}/loesungen.html`, content: createListHtml('Loesungen', mapping.solutions) });
    files.push({ path: `${participantBase}/webvariante.html`, content: preview.html });
    files.push({ path: `${participantBase}/aufgaben.html`, content: createListHtml('Aufgaben', mapping.tasks) });
    files.push({ path: `reviews/${tag}.json`, content: JSON.stringify({ status: 'draft', warnings: preview.warnings, gaps: input.gapAnalysis.gaps }, null, 2) });
    dayCatalog.push({
      dayNumber: mapping.dayNumber,
      title: mapping.planDay.title,
      teacherPath: `${teacherBase}/webvariante.html`,
      participantPath: `${participantBase}/webvariante.html`
    });
    releaseKeys.push(`${tag}.webvariante`, `${tag}.aufgaben`);
  });

  files.push({ path: 'catalog/days.json', content: JSON.stringify(dayCatalog, null, 2) });
  files.push({ path: 'catalog/projects.json', content: JSON.stringify([], null, 2) });
  files.push({ path: 'catalog/tools.json', content: JSON.stringify([], null, 2) });
  files.push({ path: 'catalog/participant-content.json', content: JSON.stringify(dayCatalog.map((day) => ({ dayNumber: day.dayNumber, path: day.participantPath })), null, 2) });
  files.push({ path: 'catalog/release-keys.json', content: JSON.stringify(releaseKeys, null, 2) });
  files.push({ path: 'shared/quiz/.gitkeep', content: '' });
  files.push({ path: 'source-map.json', content: JSON.stringify(createSourceMap(input.mappings), null, 2) });

  const report = {
    importTime: new Date().toISOString(),
    courseName: input.coursePlan.courseTitle,
    courseId,
    department,
    fileCount: input.mappings.reduce((sum, mapping) => sum + mapping.files.length, 0),
    dayCount: input.mappings.length,
    taskCount: input.mappings.reduce((sum, mapping) => sum + mapping.tasks.length, 0),
    solutionCount: input.mappings.reduce((sum, mapping) => sum + mapping.solutions.length, 0),
    quizCount: input.mappings.reduce((sum, mapping) => sum + mapping.quizzes.length, 0),
    projectFileCount: input.mappings.reduce((sum, mapping) => sum + mapping.projectFiles.length, 0),
    warnings: input.gapAnalysis.warnings,
    conflicts: input.gapAnalysis.conflicts,
    gaps: input.gapAnalysis.gaps,
    exportedPath: `output/drafts/${courseId}`
  };

  files.push({ path: `reports/${courseId}-analysis-report.json`, content: JSON.stringify(report, null, 2) });
  files.push({ path: `reports/${courseId}-analysis-report.html`, content: createReportHtml(report) });
  return { containerId: courseId, files, analysisReport: report };
}

function createListHtml(title: string, files: Array<{ fileName: string }>): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><ul>${files.map((file) => `<li>${file.fileName}</li>`).join('')}</ul></body></html>`;
}

function createReportHtml(report: DraftContainer['analysisReport']): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Analysebericht</title></head><body><h1>${report.courseName}</h1><pre>${JSON.stringify(report, null, 2)}</pre></body></html>`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'container';
}
