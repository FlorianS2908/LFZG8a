import { detectLegacyNames } from './legacy-name-detector.ts';

export function normalizeVisibleCourseName(content: string, courseName: string): string {
  let normalized = content;
  detectLegacyNames(content, courseName).forEach((finding) => {
    normalized = normalized.split(finding.value).join(courseName);
  });
  return normalized;
}

export function normalizeCourseId(value: string): string {
  return value
    .toLowerCase()
    .replace(/ae/g, 'ae')
    .replace(/oe/g, 'oe')
    .replace(/ue/g, 'ue')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'container';
}
