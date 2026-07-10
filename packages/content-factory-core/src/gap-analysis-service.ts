import type { DayMapping, FileAnalysis, GapAnalysis } from './types.ts';

export function analyzeGaps(mappings: DayMapping[], allFiles: FileAnalysis[]): GapAnalysis {
  const warnings: string[] = [];
  const conflicts: string[] = [];
  const gaps: string[] = [];
  const mappedIds = new Set(mappings.flatMap((mapping) => mapping.files.map((file) => file.fileId)));
  const riskFiles = allFiles.filter((file) => file.blocked || file.ignored || file.needsReview);

  mappings.forEach((mapping) => {
    if (!mapping.files.length) gaps.push(`Tag ${mapping.dayNumber}: Thema im Plan, aber kein Material gefunden.`);
    if (mapping.tasks.length && !mapping.solutions.length) gaps.push(`Tag ${mapping.dayNumber}: Aufgabe ohne Loesung.`);
    if (mapping.solutions.length && !mapping.tasks.length) conflicts.push(`Tag ${mapping.dayNumber}: Loesung ohne Aufgabe.`);
    if (mapping.projectFiles.some((file) => file.contentCategory === 'project-starter') && !mapping.projectFiles.some((file) => file.contentCategory === 'project-solution')) {
      gaps.push(`Tag ${mapping.dayNumber}: Projektstarter ohne Loesungsversion.`);
    }
    if (mapping.quizzes.some((file) => !file.detectedDay)) warnings.push(`Tag ${mapping.dayNumber}: Fragenpool ohne klares Tagesmapping.`);
    mapping.unclearFiles.forEach((file) => warnings.push(`Tag ${mapping.dayNumber}: geringe Confidence bei ${file.fileName}.`));
  });

  allFiles.filter((file) => !mappedIds.has(file.fileId) && !file.blocked && !file.ignored && file.contentCategory !== 'course-plan')
    .forEach((file) => gaps.push(`Material ohne Plantag: ${file.fileName}.`));

  riskFiles.forEach((file) => {
    file.warnings.forEach((warning) => warnings.push(`${file.fileName}: ${warning}`));
  });

  return { warnings, conflicts, gaps, riskFiles };
}
