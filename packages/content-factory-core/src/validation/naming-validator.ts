import type { DraftContainer } from '../types.ts';
import { runNamingConsistency } from '../naming/naming-consistency-service.ts';

export function validateNaming(draft: DraftContainer, courseName: string): string[] {
  return runNamingConsistency(draft.files, courseName).warnings;
}
