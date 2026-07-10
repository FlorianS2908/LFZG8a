import type { CoursePlan, DayMapping, FileAnalysis } from './types.ts';

export function mapFilesToDays(coursePlan: CoursePlan, files: FileAnalysis[]): DayMapping[] {
  return coursePlan.days.map((planDay) => {
    const dayFiles = files.filter((file) => !file.ignored && !file.blocked && file.detectedDay === planDay.dayNumber);
    return {
      dayNumber: planDay.dayNumber,
      planDay,
      files: dayFiles,
      tasks: dayFiles.filter((file) => file.contentCategory === 'task'),
      solutions: dayFiles.filter((file) => file.contentCategory === 'solution' || file.contentCategory === 'database-solution' || file.contentCategory === 'project-solution'),
      quizzes: dayFiles.filter((file) => file.contentCategory === 'quiz'),
      projectFiles: dayFiles.filter((file) => file.contentCategory.startsWith('project-')),
      sourceCode: dayFiles.filter((file) => file.contentCategory === 'source-code'),
      databaseFiles: dayFiles.filter((file) => file.contentCategory.startsWith('database-')),
      assets: dayFiles.filter((file) => file.contentCategory === 'asset'),
      unclearFiles: dayFiles.filter((file) => file.needsReview),
      conflicts: []
    };
  });
}
