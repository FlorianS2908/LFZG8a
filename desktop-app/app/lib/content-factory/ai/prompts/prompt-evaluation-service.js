function evaluatePrompt(promptInput = {}, lintResult = null) {
  const lint = lintResult || { checks: [], score: 0, status: 'failed' };
  const checks = lint.checks || [];
  const scoreFor = (ids) => {
    const relevant = checks.filter((check) => ids.some((id) => check.id.includes(id)));
    if (!relevant.length) return 70;
    const lost = relevant.reduce((sum, check) => sum + (check.status === 'failed' ? 25 : check.status === 'warning' ? 10 : 0), 0);
    return Math.max(0, 100 - lost);
  };
  const scores = {
    completenessScore: scoreFor(['prompt', 'purpose', 'schema', 'target', 'course']),
    didacticScore: scoreFor(['age', 'prior', 'learning', 'difficulty']),
    safetyScore: scoreFor(['secret', 'reference', 'exe', 'sql', 'solution']),
    schemaScore: scoreFor(['schema', 'json']),
    artifactScore: scoreFor(['course-type', 'java', 'sql', 'exe'])
  };
  const totalScore = Math.round((scores.completenessScore + scores.didacticScore + scores.safetyScore + scores.schemaScore + scores.artifactScore) / 5);
  return {
    ...scores,
    totalScore,
    level: levelFromScore(totalScore),
    status: lint.status || (totalScore >= 70 ? 'passed' : 'warning')
  };
}

function levelFromScore(score) {
  if (score < 50) return 'weak';
  if (score < 70) return 'usable';
  if (score < 85) return 'good';
  return 'strong';
}

module.exports = {
  evaluatePrompt,
  levelFromScore
};
