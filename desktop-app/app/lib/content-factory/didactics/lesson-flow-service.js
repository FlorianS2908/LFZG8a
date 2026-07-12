const phaseLabels = {
  activation: 'Aktivierung',
  theory: 'Erklaerung',
  demo: 'Demo',
  'guided-practice': 'Gefuehrte Uebung',
  'release-task': 'Aufgabe freigeben',
  reflection: 'Reflexion',
  'problem-case': 'Problemfall',
  hypothesis: 'Vermutungen',
  'error-demo': 'Fehler-Demo',
  analysis: 'Analyse',
  'correction-task': 'Korrekturaufgabe',
  systematization: 'Systematisierung',
  'project-goal': 'Projektziel',
  'daily-building-block': 'Tagesbaustein',
  'project-task': 'Projektaufgabe',
  'progress-check': 'Fortschrittscheck',
  'worked-example': 'Musterbeispiel',
  'guided-task': 'Gefuehrte Aufgabe',
  'completion-task': 'Lueckenaufgabe',
  'free-task': 'Freie Aufgabe',
  'exam-impulse': 'Pruefungsimpuls',
  'model-case': 'Musterfall',
  'timed-task': 'Zeitaufgabe',
  evaluation: 'Auswertung',
  'mini-test': 'Mini-Test',
  'station-basics': 'Station 1 Grundlagen',
  'station-application': 'Station 2 Anwendung',
  'station-transfer': 'Station 3 Transfer',
  'station-challenge': 'Station 4 Challenge',
  'self-check': 'Selbstcheck',
  preparation: 'Vorbereitung',
  'entry-check': 'Einstiegscheck',
  'practice-phase': 'Praxisphase',
  debrief: 'Besprechung',
  'live-coding': 'Live-Coding',
  'code-along': 'Mitmachen',
  'micro-task': 'Zwischenaufgabe',
  'extension-task': 'Erweiterungsaufgabe'
};

function buildDidacticFlow(profile = {}, day = {}) {
  return (profile.lessonFlow || []).map((phase, index) => ({
    phase,
    title: phaseLabels[phase] || phase,
    description: descriptionForPhase(phase, day),
    teacherAction: teacherActionForPhase(phase, profile),
    participantAction: participantActionForPhase(phase),
    releaseHint: releaseHintForPhase(phase, profile, index)
  }));
}

function buildReleasePlan(profile = {}, dayResults = []) {
  return dayResults.flatMap((day) => {
    const dayNumber = Number(day.dayNumber || 1);
    const taskItems = (day.tasks || []).map((task) => ({
      itemType: 'task',
      itemId: task.id,
      dayNumber,
      releaseStrategy: profile.releaseStrategy || 'manual-by-teacher',
      releaseHint: releaseHint(profile)
    }));
    const quizItems = (day.quiz || []).slice(0, 1).map((quiz) => ({
      itemType: 'quiz',
      itemId: quiz.id,
      dayNumber,
      releaseStrategy: profile.id === 'exam-training' ? 'after-quiz' : profile.releaseStrategy || 'manual-by-teacher',
      releaseHint: profile.id === 'exam-training' ? 'Nach Pruefungsimpuls nutzen.' : 'Quiz passend zum Unterrichtsfluss einsetzen.'
    }));
    return [...taskItems, ...quizItems];
  });
}

function releaseHint(profile = {}) {
  if (profile.releaseStrategy === 'after-quiz') return 'Nach Einstiegsquiz freigeben.';
  if (profile.releaseStrategy === 'station-wise') return 'Stationen einzeln freigeben.';
  if (profile.releaseStrategy === 'after-previous-task') return 'Nach vorheriger Aufgabe freigeben.';
  return 'Nach der Demo Aufgabe ueber Freigabezentrum freigeben.';
}

function descriptionForPhase(phase, day) {
  return `${phaseLabels[phase] || phase} zu ${day.title || day.mainTopic || 'diesem Kurstag'}.`;
}

function teacherActionForPhase(phase, profile) {
  if (/demo|coding|example/.test(phase)) return `Demo nach Strategie ${profile.demoStrategy || 'teacher-demo'} zeigen.`;
  if (/release|task|station/.test(phase)) return releaseHint(profile);
  if (/evaluation|mini-test|entry-check/.test(phase)) return `Assessment-Modus ${profile.assessmentMode || 'quiz-and-review'} nutzen.`;
  return 'Kurz anleiten und fachlich sichern.';
}

function participantActionForPhase(phase) {
  if (/reflection|debrief/.test(phase)) return 'Erkenntnisse und offene Fragen notieren.';
  if (/task|practice|station|coding/.test(phase)) return 'Aufgabe bearbeiten und Vorgehen dokumentieren.';
  if (/quiz|check|test/.test(phase)) return 'Kurztest oder Selbstcheck bearbeiten.';
  return 'Zuhören, beobachten und Rueckfragen sammeln.';
}

function releaseHintForPhase(phase, profile, index) {
  if (/release|task|station/.test(phase) || index === 0 && profile.releaseStrategy === 'after-quiz') return releaseHint(profile);
  return '';
}

module.exports = {
  buildDidacticFlow,
  buildReleasePlan
};
