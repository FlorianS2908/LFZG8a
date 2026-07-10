import type { DraftContainer } from './types.ts';
import { normalizeArchivePath } from './file-type-rules.ts';

export function validateDraftExport(draft: DraftContainer): string[] {
  const errors: string[] = [];
  const paths = new Set(draft.files.map((file) => file.path));
  draft.files.forEach((file) => {
    const normalized = normalizeArchivePath(file.path);
    if (!normalized.safe) errors.push(`Unsicherer Exportpfad: ${file.path}`);
    if (/^teilnehmer\/.*loes/i.test(file.path)) errors.push(`Teilnehmerbereich enthaelt Loesung: ${file.path}`);
    if (/(^|\/)(node_modules|\.git)(\/|$)/.test(file.path)) errors.push(`Gesperrter Ordner im Export: ${file.path}`);
    if (/(^|\/)\.env($|\.)/.test(file.path)) errors.push(`Secret-Datei im Export: ${file.path}`);
  });
  const days = JSON.parse(draft.files.find((file) => file.path === 'catalog/days.json')?.content || '[]');
  days.forEach((day: { teacherPath: string; participantPath: string }) => {
    if (!paths.has(day.teacherPath)) errors.push(`days.json verweist auf fehlenden Dozentenpfad: ${day.teacherPath}`);
    if (!paths.has(day.participantPath)) errors.push(`days.json verweist auf fehlenden Teilnehmerpfad: ${day.participantPath}`);
  });
  if (!paths.has('source-map.json')) errors.push('source-map.json fehlt.');
  if (!draft.files.some((file) => file.path.endsWith('-analysis-report.json'))) errors.push('Analysebericht fehlt.');
  return errors;
}

export function createZipPreparationManifest(draft: DraftContainer) {
  return {
    preparedAt: new Date().toISOString(),
    containerId: draft.containerId,
    fileCount: draft.files.length,
    files: draft.files.map((file) => file.path),
    note: 'ZIP-Erzeugung ist vorbereitet. Browser-MVP exportiert zunaechst ein JSON-Bundle ohne externe ZIP-Bibliothek.'
  };
}
