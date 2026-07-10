import type { DraftContainer } from '../types.ts';

export function validateParticipantSafety(draft: DraftContainer): string[] {
  return draft.files
    .filter((file) => /^teilnehmer\//.test(file.path))
    .filter((file) => /loesung|lösung|solution|muster/i.test(`${file.path}\n${file.content}`))
    .map((file) => `Teilnehmerbereich enthaelt Loesungshinweis: ${file.path}`);
}
