import type { DayGenerationResult } from './schemas.ts';

export function repairParticipantOutput(result: DayGenerationResult): DayGenerationResult {
  return {
    ...result,
    webvariant: {
      ...result.webvariant,
      participantHtmlSections: result.webvariant.participantHtmlSections.map((section) => ({
        ...section,
        content: section.content.replace(/loesung|lösung|solution/gi, 'Hinweis')
      }))
    }
  };
}
