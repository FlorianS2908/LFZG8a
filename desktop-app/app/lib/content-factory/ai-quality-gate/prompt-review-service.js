const { REVIEW_ROLES } = require('./prompt-quality-types');

function runPromptReviews(input = {}, lintResult = {}) {
  const serialized = JSON.stringify(input);
  const safetySerialized = JSON.stringify({ ...input, prompt: { ...(input.prompt || {}), rules: undefined } });
  const reviews = REVIEW_ROLES.map((role) => reviewRole(role, input, lintResult, serialized, safetySerialized));
  return reviews;
}

function reviewRole(role, input, lintResult, serialized, safetySerialized) {
  if (role === 'prompt_planner') {
    return result(role, lintResult.errors?.length ? 'failed' : 'passed', lintResult.errors?.length ? 'Prompt hat harte Planungsfehler.' : 'Prompt passt zur Aufgabe und Output ist strukturiert.');
  }
  if (role === 'didactic_reviewer') {
    const missing = !/ageRange|Zielgruppenalter/i.test(serialized) || !/priorKnowledge|Vorkenntnisse/i.test(serialized);
    return result(role, missing ? 'warning' : 'passed', missing ? 'Didaktische Zielgruppenregeln nur teilweise sichtbar.' : 'Alter, Vorkenntnisse und Niveau sind beruecksichtigt.');
  }
  if (role === 'safety_reviewer') {
    const unsafe = /apiKey|secret|token|rawText|textPreview|reference-library|chunks\.json|extracted\.json/i.test(safetySerialized);
    return result(role, unsafe ? 'failed' : 'passed', unsafe ? 'Sicherheitskritische Daten im Prompt erkannt.' : 'Keine Secrets oder Rohdaten erkannt.');
  }
  if (role === 'schema_reviewer') {
    const ok = Boolean(input.expectedSchema) && /json/i.test(serialized);
    return result(role, ok ? 'passed' : 'failed', ok ? 'Schema und JSON-Ausgabe sind definiert.' : 'Schema oder JSON-only-Regel fehlt.');
  }
  const failed = lintResult.status === 'failed';
  return result(role, failed ? 'failed' : lintResult.status === 'warning' ? 'warning' : 'passed', failed ? 'Final Decision: Provider blockieren.' : 'Final Decision: Provider darf gemaess Modus genutzt werden.');
}

function result(role, status, message) {
  return { role, status, message };
}

module.exports = {
  runPromptReviews
};
