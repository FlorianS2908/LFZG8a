function summarizeFitReport(fit = {}) {
  return {
    profileId: fit.profileId || fit.profile?.id || '',
    label: fit.profile?.label || fit.profileId || '',
    score: fit.score || 0,
    level: fit.level || 'weak',
    reasons: fit.reasons || [],
    warnings: fit.warnings || [],
    risks: fit.risks || [],
    recommendedAdjustments: fit.recommendedAdjustments || [],
    criteria: fit.criteria || {}
  };
}

function renderFitReason(fit = {}) {
  const reasons = (fit.reasons || []).slice(0, 3).join(' ');
  return reasons || `Fit Score ${fit.score || 0} (${fit.level || 'weak'}).`;
}

module.exports = {
  summarizeFitReport,
  renderFitReason
};
