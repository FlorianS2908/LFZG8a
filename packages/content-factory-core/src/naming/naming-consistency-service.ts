import type { VirtualFile } from '../types.ts';
import { detectLegacyNames, type LegacyNameFinding } from './legacy-name-detector.ts';
import { normalizeVisibleCourseName } from './course-name-normalizer.ts';

export type NamingConsistencyResult = {
  ok: boolean;
  warnings: string[];
  findings: Array<LegacyNameFinding & { path: string }>;
};

const allowedLegacyPaths = [/^source-map\.json$/, /^reports\//, /analysis-report/];

export function normalizeVisibleOutput(files: VirtualFile[], courseName: string): VirtualFile[] {
  return files.map((file) => {
    if (allowedLegacyPaths.some((pattern) => pattern.test(file.path))) return file;
    return { ...file, content: normalizeVisibleCourseName(file.content, courseName) };
  });
}

export function runNamingConsistency(files: VirtualFile[], courseName: string): NamingConsistencyResult {
  const findings = files.flatMap((file) => {
    if (allowedLegacyPaths.some((pattern) => pattern.test(file.path))) return [];
    return detectLegacyNames(file.content, courseName).map((finding) => ({ ...finding, path: file.path }));
  });
  return {
    ok: findings.length === 0,
    warnings: findings.map((finding) => `${finding.path}: sichtbarer Legacy-Name ${finding.value}`),
    findings
  };
}
