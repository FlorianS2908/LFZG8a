import type { DayGenerationResult } from './schemas.ts';

function normalizeDifficulty(value: string): 'easy' | 'medium' | 'hard' | 'easy_medium' | 'medium_hard' | 'all' {
  const normalized = String(value || '').toLowerCase().replace(/-and-/g, '_').replace(/\s*&\s*|\s*\+\s*|\s*,\s*|[\s-]+/g, '_');
  if (['easy_medium_hard', 'easy_normal_hard', 'all', 'alle_3'].includes(normalized)) return 'all';
  if (['easy_medium', 'easy_normal', 'einfach_mittel', 'leicht_mittel'].includes(normalized)) return 'easy_medium';
  if (['medium_hard', 'normal_hard', 'mittel_schwer'].includes(normalized)) return 'medium_hard';
  if (['easy', 'leicht', 'einfach'].includes(normalized)) return 'easy';
  if (['hard', 'schwer', 'difficult'].includes(normalized)) return 'hard';
  return 'medium';
}

export function normalizeDayGenerationResult(result: DayGenerationResult): DayGenerationResult {
  const sourceRefs = Array.from(new Set(result.sourceRefs.length ? result.sourceRefs : [`course-plan-day-${result.dayNumber}`]));
  return {
    ...result,
    warnings: Array.from(new Set(result.warnings)),
    sourceRefs,
    webvariant: {
      teacherHtmlSections: result.webvariant.teacherHtmlSections.map((section) => ({ ...section, sourceRefs: section.sourceRefs.length ? section.sourceRefs : sourceRefs })),
      participantHtmlSections: result.webvariant.participantHtmlSections.map((section) => ({ ...section, sourceRefs: section.sourceRefs.length ? section.sourceRefs : sourceRefs }))
    },
    tasks: result.tasks.map((task) => ({ ...task, difficulty: normalizeDifficulty(task.difficulty), sourceRefs: task.sourceRefs.length ? task.sourceRefs : sourceRefs })),
    solutions: result.solutions.map((solution) => ({ ...solution, sourceRefs: solution.sourceRefs.length ? solution.sourceRefs : sourceRefs })),
    quiz: result.quiz.map((question) => ({ ...question, difficulty: normalizeDifficulty(question.difficulty), sourceRefs: question.sourceRefs.length ? question.sourceRefs : sourceRefs }))
  };
}
