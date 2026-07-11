const { runNamingConsistency } = require('./naming-consistency-service');

function createNamingReport(files, course) {
  const result = runNamingConsistency(files, course);
  return {
    ...result,
    checkedAt: new Date().toISOString()
  };
}

module.exports = {
  createNamingReport
};
