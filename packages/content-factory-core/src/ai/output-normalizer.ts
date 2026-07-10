import type { DayGenerationResult } from './schemas.ts';

export function normalizeDayGenerationResult(result: DayGenerationResult): DayGenerationResult {
  return {
    ...result,
    warnings: Array.from(new Set(result.warnings)),
    sourceRefs: Array.from(new Set(result.sourceRefs))
  };
}
