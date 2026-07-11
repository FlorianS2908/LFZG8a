const { PURPOSES } = require('./prompt-quality-types');
const { HARD_PATTERNS, BLOCKED_EXECUTABLES, MAX_PROMPT_CHARS } = require('./prompt-quality-rules');

function lintPrompt(input = {}) {
  const checks = [];
  const prompt = input.prompt || {};
  const targetAudience = input.targetAudience || prompt.targetAudience || {};
  const containerProfile = input.containerProfile || prompt.containerProfile || {};
  const serialized = JSON.stringify(input);
  const safetySerialized = JSON.stringify({ ...input, prompt: { ...prompt, rules: undefined } });

  required(checks, 'prompt-id', 'promptId vorhanden', Boolean(input.promptId || prompt.promptId));
  required(checks, 'prompt-version', 'promptVersion vorhanden', Boolean(input.promptVersion || prompt.promptVersion));
  required(checks, 'purpose', 'purpose vorhanden', PURPOSES.includes(input.purpose));
  required(checks, 'expected-schema', 'expectedSchema vorhanden', Boolean(input.expectedSchema));
  required(checks, 'target-audience', 'targetAudience vorhanden', Boolean(targetAudience && Object.keys(targetAudience).length));
  required(checks, 'prior-knowledge', 'priorKnowledge vorhanden', Boolean(targetAudience.priorKnowledge));
  required(checks, 'learning-level', 'learningLevel vorhanden', Boolean(targetAudience.learningLevel));
  warnIf(checks, 'age-range', 'ageRange vorhanden', !(targetAudience.ageRange && !['unknown', ''].includes(String(targetAudience.ageRange).toLowerCase())), 'ageRange fehlt oder ist unknown.');
  required(checks, 'container-profile', 'containerProfile vorhanden', Boolean(containerProfile && Object.keys(containerProfile).length));
  required(checks, 'course-type', 'courseType vorhanden', Boolean(containerProfile.courseType));
  required(checks, 'json-only', 'Output JSON-only definiert', /json/i.test(serialized) && /ausschliesslich|only/i.test(serialized));

  didactic(checks, targetAudience, serialized);
  artifacts(checks, targetAudience, containerProfile, serialized);
  safety(checks, safetySerialized);
  schema(checks, input.expectedSchema, serialized);

  const errors = checks.filter((check) => check.status === 'failed').map((check) => check.message);
  const warnings = checks.filter((check) => check.status === 'warning').map((check) => check.message);
  const status = errors.length ? 'failed' : warnings.length ? 'warning' : 'passed';
  const score = Math.max(0, 100 - errors.length * 18 - warnings.length * 6);
  return {
    status,
    score,
    checks,
    warnings,
    errors,
    recommendations: checks.filter((check) => check.status !== 'passed').map((check) => check.recommendation || check.message),
    maySendToProvider: errors.length === 0
  };
}

function didactic(checks, audience, serialized) {
  if (['none', 'basic'].includes(audience.priorKnowledge)) {
    required(checks, 'beginner-rules', 'Einsteiger-Regeln vorhanden', /Einsteiger|Schritt|einfache|basic|none/i.test(serialized));
  }
  if (['intermediate', 'advanced'].includes(audience.priorKnowledge)) {
    required(checks, 'advanced-rules', 'Fortgeschrittenen-Regeln vorhanden', /Transfer|Projekt|fortgeschritten|advanced|intermediate/i.test(serialized));
  }
  required(checks, 'age-rules', 'ageRange-Regeln vorhanden', /ageRange|Zielgruppenalter|16-20|20-30|30\+/i.test(serialized));
  required(checks, 'difficulty-mode', 'difficultyMode beruecksichtigt', /difficultyMode|Schwierigkeit/i.test(serialized));
  required(checks, 'step-by-step', 'needsStepByStep beruecksichtigt', /needsStepByStep|Schritt/i.test(serialized));
  required(checks, 'exam-orientation', 'examOrientation beruecksichtigt', /examOrientation|Pruefung/i.test(serialized));
  required(checks, 'project-orientation', 'projectOrientation beruecksichtigt', /projectOrientation|Projekt/i.test(serialized));
}

function artifacts(checks, audience, profile, serialized) {
  if (['none', 'basic'].includes(audience.priorKnowledge) && /java-maven|maven-project/i.test(serialized)) {
    warn(checks, 'java-beginner-maven', 'Java Einsteiger darf Maven nicht automatisch erzwingen', 'Java-Einsteiger/Maven-Konflikt pruefen.');
  } else {
    pass(checks, 'java-beginner-maven', 'Java Einsteiger darf Maven nicht automatisch erzwingen');
  }
  required(checks, 'sql-no-exec', 'SQL darf keine automatische Ausfuehrung enthalten', !/execute SQL|auto(run|exec).*database|database.*auto(run|exec)/i.test(serialized) && !(/SQL.*automatisch.*ausfuehren/i.test(serialized) && !/(nie|nicht|niemals)\s+automatisch/i.test(serialized)));
  required(checks, 'drawio-preferred', 'Draw.io ist bevorzugtes Diagrammformat', profile.courseType !== 'uml-pap' || /draw\.io|drawio/i.test(serialized));
  required(checks, 'no-executables', 'EXE/BAT/CMD/PS1 ausgeschlossen', !BLOCKED_EXECUTABLES.test(serialized));
  required(checks, 'solution-protection', 'Loesungsschutz erwaehnt', /Teilnehmer.*keine.*Loesung|Loesungen.*Dozent|solutions.*teacher/i.test(serialized));
}

function safety(checks, serialized) {
  HARD_PATTERNS.forEach((rule) => required(checks, rule.id, rule.message, !rule.pattern.test(serialized)));
  required(checks, 'prompt-size', 'Prompt Payload unter Maximalgroesse', serialized.length <= MAX_PROMPT_CHARS, `${serialized.length}/${MAX_PROMPT_CHARS}`);
  if (serialized.length > 10000 && /Lorem|Original|Kapitel|Seite/i.test(serialized)) {
    fail(checks, 'long-original-text', 'Keine langen Originaltexte', 'Prompt wirkt wie langer Originaltext.');
  } else {
    pass(checks, 'long-original-text', 'Keine langen Originaltexte');
  }
}

function schema(checks, expectedSchema, serialized) {
  required(checks, 'schema-named', 'Erwartetes Schema benannt', Boolean(expectedSchema));
  required(checks, 'required-fields', 'Pflichtfelder beschrieben', /Pflichtfelder|required|fields|dayNumber|tasks|solutions|quiz/i.test(serialized));
  required(checks, 'participant-no-solutions', 'Teilnehmerbereich ohne Loesungen beschrieben', /Teilnehmer.*keine.*Loesung|participant.*no.*solution/i.test(serialized));
  required(checks, 'teacher-solutions', 'Loesungen nur in solutions/dozent beschrieben', /solutions|Dozent|teacher/i.test(serialized));
}

function required(checks, id, label, ok, evidence = '') {
  checks.push({ id, label, status: ok ? 'passed' : 'failed', message: ok ? `${label}: ok` : `${label}: fehlt oder verletzt.`, evidence: evidence ? [String(evidence)] : [] });
}

function warnIf(checks, id, label, condition, message) {
  checks.push({ id, label, status: condition ? 'warning' : 'passed', message: condition ? message : `${label}: ok`, evidence: [] });
}

function warn(checks, id, label, message) {
  checks.push({ id, label, status: 'warning', message, evidence: [] });
}

function fail(checks, id, label, message) {
  checks.push({ id, label, status: 'failed', message, evidence: [] });
}

function pass(checks, id, label) {
  checks.push({ id, label, status: 'passed', message: `${label}: ok`, evidence: [] });
}

module.exports = {
  lintPrompt
};
