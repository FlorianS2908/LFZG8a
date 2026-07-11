function createCleanupReport(action, details = {}) {
  return {
    action,
    status: details.status || 'success',
    deleted: details.deleted || [],
    skipped: details.skipped || [],
    warnings: details.warnings || [],
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  createCleanupReport
};
