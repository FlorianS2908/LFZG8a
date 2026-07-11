import type { DraftContainer } from '../types.ts';
import { normalizeArchivePath } from '../file-type-rules.ts';
import { validateCatalogPaths } from './catalog-path-validator.ts';
import { validateNaming } from './naming-validator.ts';
import { validateParticipantSafety } from './participant-safety-validator.ts';

export function validateOutput(draft: DraftContainer): string[] {
  const errors: string[] = [];
  const paths = new Set(draft.files.map((file) => file.path));
  draft.files.forEach((file) => {
    const normalized = normalizeArchivePath(file.path);
    if (!normalized.safe) errors.push(`Unsicherer Exportpfad: ${file.path}`);
    if (/(^|\/)(node_modules|\.git)(\/|$)/.test(file.path)) errors.push(`Gesperrter Ordner im Export: ${file.path}`);
    if (/(^|\/)\.env($|\.)/.test(file.path)) errors.push(`Secret-Datei im Export: ${file.path}`);
    if (/\.(exe|bat|cmd|ps1|sh|msi)$/i.test(file.path)) errors.push(`Ausfuehrbare Datei im Export: ${file.path}`);
    if (/reference-library|\/original\/|extracted\.json|chunks\.json/i.test(file.path)) errors.push(`Referenzbibliothek darf nicht exportiert werden: ${file.path}`);
    if (/\.(pdf|epub)$/i.test(file.path)) errors.push(`Referenz-/Buchdatei darf nicht im Container liegen: ${file.path}`);
  });
  ['manifest.json', 'container.json', 'catalog/days.json', 'catalog/participant-content.json', 'catalog/release-keys.json', 'standalone/index.html', 'platform/adapter.json', 'source-map.json'].forEach((path) => {
    if (!paths.has(path)) errors.push(`${path} fehlt.`);
  });
  const manifest = readJson<any>(draft, 'manifest.json', {});
  if (!manifest.runtimeModes?.standalone?.enabled) errors.push('runtimeModes.standalone fehlt oder ist deaktiviert.');
  if (!manifest.runtimeModes?.platform?.enabled) errors.push('runtimeModes.platform fehlt oder ist deaktiviert.');
  const releaseKeys = readJson<string[]>(draft, 'catalog/release-keys.json', []);
  if (new Set(releaseKeys).size !== releaseKeys.length) errors.push('ReleaseKeys sind nicht eindeutig.');
  errors.push(...validateCatalogPaths(draft));
  errors.push(...validateParticipantSafety(draft));
  errors.push(...validateNaming(draft, draft.analysisReport.courseName));
  if (!draft.files.some((file) => file.path.endsWith('-analysis-report.json'))) errors.push('Analysebericht fehlt.');
  return errors;
}

function readJson<T>(draft: DraftContainer, path: string, fallback: T): T {
  try {
    return JSON.parse(draft.files.find((file) => file.path === path)?.content || '') as T;
  } catch {
    return fallback;
  }
}
