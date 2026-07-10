import type { DraftContainer } from './types.ts';
import { validateOutput } from './validation/output-validator.ts';

export function validateDraftExport(draft: DraftContainer): string[] {
  return validateOutput(draft);
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
