function renderPromptQualitySummary(runs = []) {
  const safeRuns = runs || [];
  return {
    runCount: safeRuns.length,
    fallbackCount: safeRuns.filter((run) => run.fallbackUsed).length,
    blockedCount: safeRuns.filter((run) => run.qualityGateBlockedProvider).length,
    reviewCount: safeRuns.filter((run) => run.reviewUsed).length,
    repairCount: safeRuns.filter((run) => run.repairUsed).length,
    promptTemplates: Array.from(new Set(safeRuns.map((run) => run.promptId).filter(Boolean))),
    promptVersions: Array.from(new Set(safeRuns.map((run) => run.promptVersion).filter(Boolean))),
    promptContracts: Array.from(new Set(safeRuns.map((run) => run.promptId && run.promptVersion ? `${run.promptId}@${run.promptVersion}` : '').filter(Boolean))),
    averagePromptQualityScore: average(safeRuns.map((run) => run.promptScore ?? run.promptQualityScore)),
    averageOutputReviewScore: average(safeRuns.map((run) => run.outputReviewScore)),
    providers: Array.from(new Set(safeRuns.map((run) => run.provider).filter(Boolean))),
    models: Array.from(new Set(safeRuns.map((run) => run.model).filter(Boolean))),
    warnings: safeRuns.flatMap((run) => run.warnings || [])
  };
}

function average(values) {
  const numeric = values.filter((value) => typeof value === 'number');
  if (!numeric.length) return 0;
  return Math.round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length);
}

module.exports = {
  renderPromptQualitySummary
};
