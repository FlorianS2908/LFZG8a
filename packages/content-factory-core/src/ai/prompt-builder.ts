import type { DayGenerationInput } from './schemas.ts';

export function buildDayPrompt(input: DayGenerationInput): string {
  return `Erzeuge einen strukturierten Tagesentwurf fuer ${input.courseName}, Tag ${input.dayNumber}: ${input.title}.`;
}
