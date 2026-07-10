import type { DraftContainer } from '../types.ts';

export function validateCatalogPaths(draft: DraftContainer): string[] {
  const errors: string[] = [];
  const paths = new Set(draft.files.map((file) => file.path));
  const days = readJson<Array<{ teacherPath: string; participantPath: string; tasksPath?: string; solutionsPath?: string }>>(draft, 'catalog/days.json', []);
  days.forEach((day) => {
    [day.teacherPath, day.participantPath, day.tasksPath, day.solutionsPath].filter(Boolean).forEach((path) => {
      if (!paths.has(path as string)) errors.push(`catalog/days.json verweist auf fehlenden Pfad: ${path}`);
    });
  });
  const participant = readJson<Array<{ path: string; tasksPath?: string }>>(draft, 'catalog/participant-content.json', []);
  participant.forEach((item) => {
    [item.path, item.tasksPath].filter(Boolean).forEach((path) => {
      if (!String(path).startsWith('teilnehmer/')) errors.push(`participant-content.json verweist nicht auf Teilnehmerpfad: ${path}`);
      if (!paths.has(path as string)) errors.push(`participant-content.json verweist auf fehlenden Pfad: ${path}`);
    });
  });
  return errors;
}

function readJson<T>(draft: DraftContainer, path: string, fallback: T): T {
  try {
    return JSON.parse(draft.files.find((file) => file.path === path)?.content || '') as T;
  } catch {
    return fallback;
  }
}
