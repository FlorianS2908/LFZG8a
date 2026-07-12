const { buildContainerProfile } = require('../container-profile/container-profile-service');
const { checkOk, statusFromChecks, scoreFromChecks } = require('./preflight-rules');
const { evaluateDidacticFit } = require('../didactics/didactic-fit-service');

function runPreflight(input = {}, options = {}) {
  const course = input.course || {};
  const curriculum = input.approvedCurriculumPlan || input.curriculumPlan || {};
  const targetAudience = input.targetAudience || curriculum.targetAudience || {};
  const aiStatus = options.aiStatus || {};
  const providerMode = input.aiMode || aiStatus.defaultProvider || 'local';
  const profileContext = buildContainerProfile({
    ...input,
    curriculumPlan: curriculum,
    targetAudience
  });
  const suggestions = input.artifactSuggestions?.length ? input.artifactSuggestions : profileContext.artifactSuggestions;
  const targets = profileContext.artifactTargets;
  const didacticFit = evaluateDidacticFit(input.didacticProfile || curriculum.didacticProfile || {}, { ...input, targetAudience, containerProfile: profileContext.containerProfile });
  const referencePaths = [
    ...(input.uploads || []),
    ...(input.materials || []),
    ...(input.files || [])
  ].map((item) => item.path || item.sourcePath || item.targetPath || '').filter(Boolean);
  const checks = [
    checkOk('course-name', 'Kursname', Boolean(course.courseName), 'Kursname fehlt.'),
    checkOk('course-id', 'Kurs-ID', Boolean(course.courseId), 'Kurs-ID fehlt.'),
    checkOk('department', 'Fachbereich', Boolean(course.department || targetAudience.department), 'Fachbereich fehlt.'),
    checkOk('curriculum-present', 'CurriculumPlanDraft', Boolean(curriculum.id || curriculum.days), 'CurriculumPlanDraft fehlt.'),
    checkOk('curriculum-approved', 'Curriculum-Freigabe', curriculum.status === 'approved', 'CurriculumPlanDraft ist nicht freigegeben.'),
    checkOk('curriculum-days', 'Curriculum-Tage', (curriculum.days || []).length > 0, 'Mindestens ein Tag fehlt.'),
    checkOk('active-topics', 'Aktive Themen', (curriculum.days || []).flatMap((day) => day.topics || []).some((topic) => topic.active !== false), 'Mindestens ein aktives Thema fehlt.'),
    checkOk('quality-score', 'Quality Score', typeof curriculum.quality?.score === 'number', 'Curriculum Quality Score fehlt.', 'warning'),
    checkOk('prior-knowledge', 'Vorkenntnisse', Boolean(targetAudience.priorKnowledge), 'priorKnowledge fehlt.'),
    checkOk('age-range', 'Zielgruppenalter', Boolean(targetAudience.ageRange && !['unknown', ''].includes(String(targetAudience.ageRange).toLowerCase())), 'Alter/Zielgruppenalter nicht gesetzt. Sichere Standardvorschlaege werden verwendet.', 'warning'),
    checkOk('learning-level', 'Lernniveau', Boolean(targetAudience.learningLevel), 'learningLevel fehlt.'),
    checkOk('difficulty-mode', 'Schwierigkeitsmodus', Boolean(targetAudience.difficultyMode), 'difficultyMode fehlt.'),
    checkOk('education-context', 'Bildungskontext', Boolean(targetAudience.educationContext || 'umschulung'), 'educationContext fehlt.', 'warning'),
    checkOk('course-type', 'Kurstyp', Boolean(profileContext.containerProfile.courseType), 'courseType fehlt.'),
    checkOk('didactic-fit', 'Didaktik Fit Score', didacticFit.score >= 50, `Didaktik Fit Score ${didacticFit.score} (${didacticFit.level}) liegt unter 50 und muss manuell bestaetigt werden.`, 'warning'),
    checkOk('artifact-mode', 'Artefaktmodus', Boolean(profileContext.containerProfile.artifactMode), 'artifactMode fehlt.'),
    checkOk('java-beginner-no-maven', 'Java Einsteiger ohne Maven', !(profileContext.containerProfile.courseType === 'java-maven' && ['none', 'basic'].includes(targetAudience.priorKnowledge)), 'Java-Maven ist fuer Einsteiger nicht als Default geeignet.', 'warning'),
    checkOk('sql-no-auto-db', 'SQL ohne automatische DB-Aktion', profileContext.containerProfile.allowDatabaseActions !== true, 'Automatische Datenbankaktionen sind aktiviert.', 'error'),
    checkOk('artifact-suggestions', 'Artefaktvorschlaege', suggestions.length > 0, 'Keine Artefaktvorschlaege vorhanden.', 'warning'),
    checkOk('solution-targets', 'Loesungsschutz Artefakte', targets.every((target) => !(target.solutionOnly && /^teilnehmer\//i.test(target.targetPath || ''))), 'solutionOnly Artefakt liegt im Teilnehmerbereich.'),
    checkOk('no-executables', 'Keine EXE/Skripte', [...(input.uploads || []), ...targets].every((item) => !/\.(exe|bat|cmd|ps1)$/i.test(item.name || item.path || item.targetPath || '')), 'Ausfuehrbare Datei oder Skript im Exportpfad erkannt.'),
    checkOk('no-participant-solutions', 'Teilnehmer loesungsfrei', JSON.stringify(input.dayResults || []).match(/teilnehmer.*(loesung|lösung|solution)/i) === null, 'Moegliche Loesung im Teilnehmerbereich.'),
    checkOpenAi(providerMode, aiStatus),
    checkPromptScore(input.promptQuality || input.promptEvaluation || null),
    checkCostEstimate(input.costEstimate),
    checkOk('reference-export', 'Referenzexport', !(input.referenceUsage?.exportReferences), 'Referenzliteratur darf nicht exportiert werden.'),
    checkOk('no-reference-paths', 'Keine reference-library Pfade', !JSON.stringify(referencePaths).match(/reference-library|chunks\.json|extracted\.json/i), 'Rohdaten-/Referenzpfade erkannt.')
  ];
  const status = statusFromChecks(checks);
  const errors = checks.filter((check) => check.status === 'error').map((check) => check.message);
  const warnings = checks.filter((check) => check.status === 'warning').map((check) => check.message);
  return {
    status,
    score: scoreFromChecks(checks),
    errors,
    warnings,
    recommendations: createRecommendations(checks),
    checks,
    profileContext,
    didacticFit
  };
}

function checkPromptScore(promptQuality = null) {
  if (!promptQuality) return { id: 'prompt-score', label: 'Prompt Score', status: 'ok', message: 'Prompt Score wird spaetestens beim KI-Lauf geprueft.' };
  const score = Number(promptQuality.totalScore ?? promptQuality.promptScore ?? promptQuality.score ?? 0);
  return {
    id: 'prompt-score',
    label: 'Prompt Score',
    status: score < 70 ? 'warning' : 'ok',
    message: score < 70 ? `Prompt Score ${score} liegt unter 70 und sollte vor Provider-Nutzung verbessert werden.` : `Prompt Score ${score}.`
  };
}

function checkOpenAi(aiMode, aiStatus = {}) {
  if (!String(aiMode || 'local').startsWith('openai')) {
    return { id: 'ai-local', label: 'KI-Modus', status: 'ok', message: 'LocalHeuristicProvider aktiv.' };
  }
  const configured = aiStatus.providers?.openai?.configured === true;
  const connectionFailed = ['failed', 'warning'].includes(aiStatus.providers?.openai?.connectionTestStatus);
  return {
    id: 'ai-openai',
    label: 'OpenAI',
    status: configured && !connectionFailed ? 'ok' : 'warning',
    message: !configured
      ? 'OpenAI gewaehlt, aber kein API-Key gefunden. Local/Fallback wird genutzt.'
      : connectionFailed
        ? 'OpenAI ist konfiguriert, aber der letzte Verbindungstest war nicht erfolgreich. Local/Fallback bleibt verfuegbar.'
        : 'OpenAI ist konfiguriert.'
  };
}

function checkCostEstimate(costEstimate = null) {
  if (!costEstimate) return { id: 'cost-estimate', label: 'Kostenabschaetzung', status: 'ok', message: 'Keine externe Kostenabschaetzung erforderlich.' };
  return {
    id: 'cost-estimate',
    label: 'Kostenabschaetzung',
    status: costEstimate.warning ? 'warning' : 'ok',
    message: costEstimate.warning
      ? `Geschaetzte Kosten ${costEstimate.estimatedCostUsd} USD liegen ueber Limit ${costEstimate.warningLimitUsd} USD.`
      : `Geschaetzte Kosten ${costEstimate.estimatedCostUsd} USD.`
  };
}

function createRecommendations(checks) {
  return checks.filter((check) => check.status !== 'ok').map((check) => check.message);
}

module.exports = {
  runPreflight
};
