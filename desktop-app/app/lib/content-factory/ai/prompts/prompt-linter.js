const { MAX_PROMPT_CHARS, HARD_PATTERNS, BLOCKED_EXECUTABLES } = require('../../ai-quality-gate/prompt-quality-rules');

function lintPrompt(promptInput = {}) {
  const checks = [];
  const prompt = promptInput.prompt || {};
  const contract = promptInput.contract || {};
  const payload = promptInput.userPayload || promptInput.input || {};
  const targetAudience = payload.targetAudience || prompt.targetAudience || promptInput.targetAudience || {};
  const containerProfile = payload.containerProfile || prompt.containerProfile || promptInput.containerProfile || {};
  const serialized = JSON.stringify(promptInput);
  const safetySerialized = JSON.stringify({
    userPayload: promptInput.userPayload,
    input: promptInput.userPayload?.input || promptInput.input,
    prompt: { ...prompt, rules: undefined, output: prompt.output }
  });

  required(checks, 'prompt-id', 'promptId vorhanden', Boolean(promptInput.promptId || prompt.promptId || contract.id));
  required(checks, 'prompt-version', 'promptVersion vorhanden', Boolean(promptInput.promptVersion || prompt.promptVersion || contract.version));
  required(checks, 'purpose', 'purpose vorhanden', Boolean(promptInput.purpose || prompt.purpose || contract.purpose));
  required(checks, 'expected-schema', 'expectedSchema vorhanden', Boolean(promptInput.expectedSchema || prompt.expectedSchema || contract.expectedOutputSchema));
  required(checks, 'json-only', 'JSON-only-Regel vorhanden', /json/i.test(serialized) && /ausschliesslich|only/i.test(serialized));
  required(checks, 'target-audience', 'targetAudience vorhanden', Boolean(targetAudience && Object.keys(targetAudience).length));
  warnIf(checks, 'age-range', 'ageRange vorhanden', !(targetAudience.ageRange && !['unknown', ''].includes(String(targetAudience.ageRange).toLowerCase())), 'ageRange fehlt oder ist unknown.');
  required(checks, 'prior-knowledge', 'priorKnowledge vorhanden', Boolean(targetAudience.priorKnowledge));
  required(checks, 'learning-level', 'learningLevel vorhanden', Boolean(targetAudience.learningLevel));
  required(checks, 'difficulty-mode', 'difficultyMode vorhanden', Boolean(targetAudience.difficultyMode));
  required(checks, 'container-profile', 'containerProfile vorhanden', Boolean(containerProfile && Object.keys(containerProfile).length));
  required(checks, 'course-type', 'courseType vorhanden', Boolean(containerProfile.courseType));
  required(checks, 'solution-protection', 'Loesungsschutz erwaehnt', /Teilnehmer.*keine.*Loesung|Loesungen.*Dozent|solutions.*Dozent|solutions.*teacher/i.test(serialized));
  required(checks, 'sql-no-auto', 'SQL-Autoausfuehrung ausgeschlossen', /(SQL.*(nie|nicht|niemals).*automatisch|niemals.*SQL.*ausgefuehrt|SQL wird niemals automatisch ausgefuehrt)/i.test(serialized));
  required(checks, 'exe-blocked', 'EXE/BAT/CMD/PS1 ausgeschlossen', /EXE\/BAT\/CMD\/PS1|Keine EXE/i.test(serialized) && !BLOCKED_EXECUTABLES.test(safetySerialized));
  required(checks, 'reference-chunks-blocked', 'Referenzchunks ausgeschlossen', !/rawText|originalText|textPreview|reference-library|chunks\.json|extracted\.json/i.test(safetySerialized));
  required(checks, 'prompt-size', 'Payload-Groesse begrenzt', serialized.length <= MAX_PROMPT_CHARS, `${serialized.length}/${MAX_PROMPT_CHARS}`);

  HARD_PATTERNS.forEach((rule) => required(checks, rule.id, rule.message, !rule.pattern.test(safetySerialized)));
  if (['none', 'basic'].includes(targetAudience.priorKnowledge) && /java-maven|maven-project|pom\.xml/i.test(serialized)) {
    warn(checks, 'java-beginner-maven', 'Java-Einsteiger/Maven-Konflikt erkannt.');
  } else {
    pass(checks, 'java-beginner-maven', 'Java-Einsteiger/Maven-Konflikt erkannt.');
  }

  const errors = checks.filter((check) => check.status === 'failed').map((check) => check.message);
  const warnings = checks.filter((check) => check.status === 'warning').map((check) => check.message);
  return {
    status: errors.length ? 'failed' : warnings.length ? 'warning' : 'passed',
    score: Math.max(0, 100 - errors.length * 16 - warnings.length * 5),
    errors,
    warnings,
    recommendations: checks.filter((check) => check.status !== 'passed').map((check) => check.message),
    checks,
    maySendToProvider: errors.length === 0
  };
}

function required(checks, id, label, ok, evidence = '') {
  checks.push({ id, label, status: ok ? 'passed' : 'failed', message: ok ? `${label}: ok` : `${label}: fehlt oder verletzt.`, evidence: evidence ? [String(evidence)] : [] });
}

function warnIf(checks, id, label, condition, message) {
  checks.push({ id, label, status: condition ? 'warning' : 'passed', message: condition ? message : `${label}: ok`, evidence: [] });
}

function warn(checks, id, message) {
  checks.push({ id, label: id, status: 'warning', message, evidence: [] });
}

function pass(checks, id, label) {
  checks.push({ id, label, status: 'passed', message: `${label}: ok`, evidence: [] });
}

module.exports = {
  lintPrompt
};
