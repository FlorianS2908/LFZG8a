import type { NamingConsistencyResult } from './naming-consistency-service.ts';

export function createNamingReport(result: NamingConsistencyResult) {
  return {
    ok: result.ok,
    checkedAt: new Date().toISOString(),
    warningCount: result.warnings.length,
    warnings: result.warnings,
    findings: result.findings
  };
}
