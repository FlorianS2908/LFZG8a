import type { DayGenerationResult, DayReviewResult } from './schemas.ts';

export function reviewGeneratedDay(result: DayGenerationResult): DayReviewResult {
  const warnings = [];
  if (JSON.stringify(result.webvariant.participantHtmlSections).match(/loesung|solution/i)) {
    warnings.push('Teilnehmerbereich enthaelt moeglichen Loesungshinweis.');
  }
  return { ok: warnings.length === 0, warnings, repairHints: warnings };
}
