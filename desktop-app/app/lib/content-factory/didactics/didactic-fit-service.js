const { listDidacticProfiles, getDidacticProfile, normalizeDidacticProfile } = require('./didactic-profile-service');
const { profileSignals, fitCriteria, codeCoursePattern, scoreLevel } = require('./didactic-fit-rules');

function evaluateDidacticFit(profileInput = {}, input = {}) {
  const profile = normalizeDidacticProfile(profileInput);
  const targetAudience = input.targetAudience || input.curriculumPlan?.targetAudience || {};
  const containerProfile = input.containerProfile || {};
  const courseType = String(input.courseType || containerProfile.courseType || '').toLowerCase();
  const text = textSignals(input);
  const reasons = [];
  const warnings = [];
  const risks = [];
  const recommendedAdjustments = [];
  const criteria = {};

  criteria.targetAudienceFit = targetAudience.priorKnowledge || targetAudience.learningLevel ? 8 : 5;
  criteria.priorKnowledgeFit = priorKnowledgeScore(profile, targetAudience, reasons, warnings);
  criteria.ageRangeFit = ageRangeScore(profile, targetAudience, reasons);
  criteria.courseTypeFit = courseTypeScore(profile, courseType, text, reasons);
  criteria.examFit = examScore(profile, targetAudience, input, reasons, warnings);
  criteria.projectFit = projectScore(profile, targetAudience, input, reasons, warnings, recommendedAdjustments);
  criteria.demoFit = demoScore(profile, courseType, text, reasons, warnings);
  criteria.releaseFit = profile.releaseStrategy ? 8 : 3;
  criteria.taskProgressionFit = profile.taskProgression ? 8 : 3;
  criteria.assessmentFit = assessmentScore(profile, targetAudience, reasons);
  criteria.reflectionFit = profile.reflectionMode ? 8 : 4;
  criteria.safetyFit = safetyScore(profile, containerProfile, warnings, risks);

  const score = Math.max(0, Math.min(100, Math.round(
    fitCriteria.reduce((sum, key) => sum + Number(criteria[key] || 0), 0) / (fitCriteria.length * 10) * 100
  )));
  addProfileReason(profile, reasons);
  if (score < 50) risks.push('Didaktisches Profil passt schwach zu den aktuellen Kursdaten und sollte manuell bestaetigt werden.');
  if (targetAudience.projectOrientation && ['none', 'basic'].includes(targetAudience.priorKnowledge) && profile.projectMode) {
    warnings.push('Projektmodus fuer Einsteiger benoetigt starke Fuehrung und kleine Zwischenschritte.');
    recommendedAdjustments.push('supportLevel auf step-by-step oder guided setzen.');
  }
  return {
    profileId: profile.id,
    profile,
    score,
    level: scoreLevel(score),
    criteria,
    reasons: Array.from(new Set(reasons)),
    warnings: Array.from(new Set(warnings)),
    risks: Array.from(new Set(risks)),
    recommendedAdjustments: Array.from(new Set(recommendedAdjustments))
  };
}

function evaluateAllDidacticFits(input = {}) {
  return listDidacticProfiles()
    .map((profile) => evaluateDidacticFit(profile, input))
    .sort((a, b) => b.score - a.score || a.profileId.localeCompare(b.profileId));
}

function textSignals(input = {}) {
  return [
    input.topic,
    input.courseGoal,
    input.expectedOutcome,
    input.title,
    input.day?.title,
    input.day?.mainTopic,
    input.curriculumPlan?.courseGoal,
    input.curriculumPlan?.expectedOutcome,
    ...(input.day?.topics || []).map((topic) => topic.title || topic.summary || '')
  ].join(' ').toLowerCase();
}

function priorKnowledgeScore(profile, audience, reasons, warnings) {
  const prior = audience.priorKnowledge || '';
  if (!prior) return 5;
  if (['none', 'basic'].includes(prior) && ['worked-example-fading', 'explain-demo-practice', 'guided-coding'].includes(profile.id)) {
    reasons.push('Passt zu Einsteigern durch Fuehrung, Beispiele und kleinere Schritte.');
    return profile.id === 'worked-example-fading' ? 10 : 8;
  }
  if (['none', 'basic'].includes(prior) && profile.id === 'project-based') {
    warnings.push('Projektprofil kann fuer Einsteiger zu offen sein.');
    return 5;
  }
  if (['intermediate', 'advanced'].includes(prior) && ['project-based', 'problem-first', 'exam-training'].includes(profile.id)) return 8;
  return 6;
}

function ageRangeScore(profile, audience, reasons) {
  if (!audience.ageRange || ['mixed', 'unknown'].includes(String(audience.ageRange).toLowerCase())) return 7;
  if (audience.ageRange === '16-20' && ['worked-example-fading', 'station-learning', 'guided-coding'].includes(profile.id)) {
    reasons.push('Alterssignal passt zu sichtbaren Schritten und aktivierenden Phasen.');
    return 8;
  }
  if (audience.ageRange === '30+' && ['project-based', 'problem-first', 'explain-demo-practice'].includes(profile.id)) return 8;
  return 7;
}

function courseTypeScore(profile, courseType, text, reasons) {
  if (profile.id === 'guided-coding' && codeCoursePattern.test(courseType)) {
    reasons.push('Kurstyp ist code-nah; Guided Coding ist als starke Option geeignet.');
    return 10;
  }
  if (profile.id === 'problem-first' && /debug|fehler|korrektur/.test(text)) return 10;
  if (profile.id === 'station-learning' && /heterogen|unterschiedlich|gemischt/.test(text)) return 9;
  if (profile.id === 'flipped-classroom' && /wiederholung|vorbereitung|selbstlern|vorab/.test(text)) return 9;
  const signals = profileSignals[profile.id] || {};
  if ((signals.courseTypes || []).includes(courseType)) return 8;
  return codeCoursePattern.test(courseType) && profile.id === 'worked-example-fading' ? 8 : 6;
}

function examScore(profile, audience, input, reasons, warnings) {
  const exam = audience.examOrientation || input.examOrientation;
  if (!exam) return profile.id === 'exam-training' ? 6 : 7;
  if (profile.id === 'exam-training') {
    reasons.push('Pruefungsorientierung priorisiert Zeitaufgabe, Auswertung und Mini-Test.');
    return 10;
  }
  warnings.push('Pruefungsorientierung ist aktiv; exam-training sollte als Alternative geprueft werden.');
  return profile.assessmentMode ? 6 : 4;
}

function projectScore(profile, audience, input, reasons, warnings) {
  const project = audience.projectOrientation || input.projectOrientation;
  if (!project) return profile.projectMode ? 6 : 8;
  if (profile.id === 'project-based') {
    reasons.push('Projektorientierung passt zu Projektziel, Tagesbaustein und Fortschrittscheck.');
    return 10;
  }
  if (profile.id === 'guided-coding' || profile.id === 'worked-example-fading') return 8;
  warnings.push('Projektorientierung ist aktiv; project-based sollte als Alternative sichtbar bleiben.');
  return 5;
}

function demoScore(profile, courseType, text, reasons, warnings) {
  if (profile.defaultDemoEnabled === false || profile.demoStrategy === 'none') return 7;
  if (profile.id === 'guided-coding' && profile.demoStrategy === 'live-coding') return 10;
  if (profile.id === 'problem-first' && profile.demoStrategy === 'error-demo') return 10;
  if (profile.id === 'worked-example-fading' && profile.demoStrategy === 'worked-example') return 10;
  if (/sql|database/.test(courseType + text) && profile.demoStrategy === 'teacher-demo') return 8;
  if (!profile.demoStrategy) warnings.push('DemoStrategy fehlt.');
  else reasons.push(`DemoStrategy ${profile.demoStrategy} ist dokumentiert.`);
  return profile.demoStrategy ? 8 : 4;
}

function assessmentScore(profile, audience, reasons) {
  if (audience.examOrientation && /rubric|mini-test|quiz|bewertung/i.test(profile.assessmentMode || '')) return 10;
  if (profile.assessmentMode) {
    reasons.push(`AssessmentMode ${profile.assessmentMode} ist gesetzt.`);
    return 8;
  }
  return 4;
}

function safetyScore(profile, containerProfile, warnings, risks) {
  let score = 10;
  if (containerProfile.allowExecutableTools === true) {
    warnings.push('Externe Tools sind im Containerprofil erlaubt; Export-Schutz muss greifen.');
    score -= 2;
  }
  if (containerProfile.allowDatabaseActions === true) {
    risks.push('SQL-/DB-Aktionen duerfen nicht automatisch ausgefuehrt werden.');
    score -= 3;
  }
  if (profile.defaultParticipantDemoVisible === true) {
    warnings.push('Teilnehmer-Demos sind sichtbar; Demo-Inhalte muessen loesungsfrei bleiben.');
    score -= 1;
  }
  return Math.max(0, score);
}

function addProfileReason(profile, reasons) {
  (profileSignals[profile.id]?.reasons || []).forEach((reason) => reasons.push(reason));
}

module.exports = {
  evaluateDidacticFit,
  evaluateAllDidacticFits,
  scoreLevel,
  getDidacticProfile
};
