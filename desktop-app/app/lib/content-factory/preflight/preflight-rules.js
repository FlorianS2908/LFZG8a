function checkOk(id, label, ok, message, severity = 'error') {
  return {
    id,
    label,
    status: ok ? 'ok' : severity,
    message: ok ? `${label}: ok` : message
  };
}

function statusFromChecks(checks = []) {
  if (checks.some((check) => check.status === 'error')) return 'red';
  if (checks.some((check) => check.status === 'warning')) return 'yellow';
  return 'green';
}

function scoreFromChecks(checks = []) {
  if (!checks.length) return 0;
  const penalty = checks.reduce((sum, check) => sum + (check.status === 'error' ? 18 : check.status === 'warning' ? 7 : 0), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

module.exports = {
  checkOk,
  statusFromChecks,
  scoreFromChecks
};
