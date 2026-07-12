const { normalizeDidacticProfile } = require('./didactic-profile-service');
const { buildDidacticFlow, buildReleasePlan } = require('./lesson-flow-service');

function createDidacticPreview({ didacticProfile, courseType = '', targetAudience = {}, duration = {}, courseGoal = '' } = {}) {
  const profile = normalizeDidacticProfile(didacticProfile);
  const sampleDay = {
    dayNumber: 1,
    title: courseGoal || `${profile.label} Beispieltag`,
    mainTopic: courseGoal || courseType || 'Kurstag'
  };
  const flow = buildDidacticFlow(profile, sampleDay);
  const releasePlan = buildReleasePlan(profile, [{
    dayNumber: 1,
    tasks: [{ id: 'preview-task-1', title: 'Preview Aufgabe' }],
    quiz: [{ id: 'preview-quiz-1', title: 'Preview Quiz' }]
  }]);
  return {
    profileId: profile.id,
    title: profile.label,
    expectedDayFlow: flow.map((phase, index) => ({ order: index + 1, phase: phase.phase, title: phase.title, description: phase.description })),
    webvariantStructure: webvariantStructure(profile),
    demoType: profile.defaultDemoEnabled === false ? 'Keine Demo' : profile.demoStrategy,
    taskTypes: taskTypes(profile, targetAudience),
    releasePlan,
    assessment: profile.assessmentMode || 'quiz-and-review',
    reflection: { mode: profile.reflectionMode || 'end-of-day', questions: reflectionQuestions(profile) },
    risks: previewRisks(profile, targetAudience)
  };
}

function webvariantStructure(profile) {
  return [
    'Lernweg',
    ...(profile.lessonFlow || []).map((phase) => phase),
    profile.requiresTeacherNotes ? 'Dozentenhinweise' : '',
    profile.requiresReflection ? 'Reflexion' : ''
  ].filter(Boolean);
}

function taskTypes(profile, targetAudience) {
  if (profile.id === 'worked-example-fading') return ['Musterbeispiel', 'Gefuehrte Aufgabe', 'Lueckenaufgabe', 'Freie Aufgabe'];
  if (profile.id === 'station-learning') return ['Station Grundlagen', 'Station Anwendung', 'Station Transfer', 'Station Challenge'];
  if (profile.id === 'guided-coding') return ['Code-Along', 'Microtask', 'Erweiterungsaufgabe', 'Code-Review'];
  if (profile.id === 'exam-training') return ['Zeitaufgabe', 'Bewertungskriterien', 'Typische Fehler', 'Mini-Test'];
  if (profile.id === 'problem-first') return ['Problemfall', 'Hypothese', 'Analyse', 'Korrekturaufgabe'];
  if (profile.id === 'project-based') return ['Projektziel', 'Tagesbaustein', 'Projektaufgabe', 'Fortschrittscheck'];
  return targetAudience.needsStepByStep ? ['Gefuehrte Uebung', 'Anwendungsaufgabe'] : ['Uebungsaufgabe', 'Transferaufgabe'];
}

function reflectionQuestions(profile) {
  if (profile.id === 'project-based') return ['Welcher Projektfortschritt ist sichtbar?', 'Welche Risiken bleiben offen?'];
  if (profile.id === 'exam-training') return ['Welche Bewertungskriterien wurden sicher erfuellt?', 'Welche typischen Fehler muessen vermieden werden?'];
  return ['Was war der wichtigste Lernschritt?', 'Welche Frage ist offen geblieben?'];
}

function previewRisks(profile, targetAudience) {
  const risks = [];
  if (profile.projectMode && ['none', 'basic'].includes(targetAudience.priorKnowledge)) risks.push('Projektmodus braucht fuer Einsteiger klare Zwischenschritte.');
  if (profile.defaultParticipantDemoVisible === true) risks.push('Teilnehmer-Demos muessen loesungsfrei bleiben.');
  if (profile.id === 'flipped-classroom') risks.push('Vorbereitung muss realistisch und kurz bleiben.');
  return risks;
}

module.exports = {
  createDidacticPreview
};
