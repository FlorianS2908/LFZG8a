function renderPreflightSummary(preflight = {}) {
  return {
    status: preflight.status || 'red',
    score: preflight.score || 0,
    errors: preflight.errors || [],
    warnings: preflight.warnings || [],
    recommendations: preflight.recommendations || []
  };
}

module.exports = {
  renderPreflightSummary
};
