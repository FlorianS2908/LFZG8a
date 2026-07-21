function normalizeDayGenerationResult(input = {}) {
  const dayNumber = Number(input.dayNumber || 1);
  const title = input.title || `Tag ${dayNumber}`;
  const sourceRefs = Array.from(new Set([...(input.sourceRefs || []), `course-plan-day-${dayNumber}`]));
  const normalized = {
    dayNumber,
    title,
    status: input.status || 'draft',
    webvariant: {
      teacherHtmlSections: normalizeSections(input.webvariant?.teacherHtmlSections, sourceRefs),
      participantHtmlSections: normalizeSections(input.webvariant?.participantHtmlSections, sourceRefs)
    },
    tasks: normalizeItems(input.tasks, sourceRefs).map((task) => ({ ...task, text: stripParticipantSolutions(task.text) })),
    solutions: normalizeItems(input.solutions, sourceRefs),
    quiz: normalizeQuiz(input.quiz, sourceRefs),
    artifacts: normalizeArtifacts(input.artifacts, sourceRefs),
    demos: normalizeDemos(input.demos, sourceRefs),
    didacticFlow: normalizeDidacticFlow(input.didacticFlow),
    releasePlan: normalizeReleasePlan(input.releasePlan),
    reflection: normalizeReflection(input.reflection),
    teacherRunbook: normalizeTeacherRunbook(input.teacherRunbook, {
      dayNumber,
      title,
      didacticFlow: input.didacticFlow,
      demos: input.demos,
      tasks: input.tasks,
      quiz: input.quiz,
      releasePlan: input.releasePlan,
      reflection: input.reflection
    }),
    projectContext: input.projectContext || '',
    sourceRefs,
    warnings: input.warnings || [],
    aiAdditions: input.aiAdditions || []
  };
  normalized.webvariant.participantHtmlSections = normalized.webvariant.participantHtmlSections.map((section) => ({
    ...section,
    content: stripParticipantSolutions(section.content)
  }));
  if (JSON.stringify(input.webvariant?.participantHtmlSections || input.tasks || '').match(/loesung|lösung|solution/i)) {
    normalized.warnings = [...normalized.warnings, 'Loesungshinweise wurden aus Teilnehmerinhalten entfernt.'];
  }
  if (!input.teacherRunbook) {
    normalized.warnings = [...normalized.warnings, 'teacherRunbook wurde aus didacticFlow abgeleitet.'];
  }
  return normalized;
}

function normalizeArtifacts(items = [], sourceRefs = []) {
  return (items || []).map((item, index) => ({
    id: item.id || `artifact-${index + 1}`,
    title: item.title || `Artefakt ${index + 1}`,
    kind: item.kind || 'readme',
    format: item.format || 'md',
    role: item.role || 'participant',
    path: item.path || '',
    solutionOnly: item.solutionOnly === true || item.role === 'teacher' || item.kind === 'solution',
    description: item.description || '',
    reason: item.reason || '',
    targetAudienceImpact: item.targetAudienceImpact || '',
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs,
    warnings: item.warnings || []
  }));
}

function normalizeDemos(items = [], sourceRefs = []) {
  return (items || []).map((item, index) => ({
    id: item.id || `demo-${index + 1}`,
    title: item.title || `Demo ${index + 1}`,
    tool: item.tool || 'default',
    description: item.description || 'Kurze Dozenten-Demo zum Thema.',
    suggestedFileName: item.suggestedFileName || item.fileName || '',
    buttonLabel: item.buttonLabel || 'Demo oeffnen',
    phaseRef: item.phaseRef || '',
    demoStrategy: item.demoStrategy || '',
    teacherOnly: item.teacherOnly === true || item.visibleForParticipants !== true,
    visibleForParticipants: item.visibleForParticipants === true,
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs
  }));
}

function normalizeDidacticFlow(items = []) {
  return (items || []).map((item, index) => ({
    phase: item.phase || `phase-${index + 1}`,
    title: item.title || item.phase || `Phase ${index + 1}`,
    description: item.description || '',
    teacherAction: item.teacherAction || '',
    participantAction: item.participantAction || '',
    releaseHint: item.releaseHint || ''
  }));
}

function normalizeReleasePlan(items = []) {
  return (items || []).map((item, index) => ({
    id: item.id || `release-item-${index + 1}`,
    dayNumber: Number(item.dayNumber || 1),
    phase: item.phase || '',
    title: item.title || item.itemId || `Freigabe ${index + 1}`,
    itemType: item.itemType || 'task',
    itemId: item.itemId || `release-item-${index + 1}`,
    releaseStrategy: item.releaseStrategy || 'manual-by-teacher',
    defaultReleased: item.defaultReleased === true,
    dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn.map(String) : [],
    releaseHint: item.releaseHint || '',
    visibleForRoles: Array.isArray(item.visibleForRoles) && item.visibleForRoles.length ? item.visibleForRoles.map(String) : ['teacher'],
    participantVisibleAfterRelease: item.participantVisibleAfterRelease !== false
  }));
}

function normalizeReflection(reflection = {}) {
  return {
    mode: reflection.mode || '',
    questions: Array.isArray(reflection.questions) ? reflection.questions.map(String) : [],
    expectedEvidence: Array.isArray(reflection.expectedEvidence) ? reflection.expectedEvidence.map(String) : []
  };
}

function normalizeTeacherRunbook(runbook = {}, context = {}) {
  const dayNumber = Number(runbook.dayNumber || context.dayNumber || 1);
  const title = runbook.title || context.title || `Tag ${dayNumber}`;
  const phases = Array.isArray(runbook.phases) && runbook.phases.length
    ? runbook.phases
    : deriveTeacherRunbookPhases(context);
  const normalizedPhases = phases.map((phase, index) => ({
    phase: phase.phase || `phase-${index + 1}`,
    title: phase.title || phase.phase || `Phase ${index + 1}`,
    estimatedMinutes: Number(phase.estimatedMinutes || 15),
    teacherAction: phase.teacherAction || 'Dozent fuehrt die Phase an und klaert offene Fragen.',
    participantAction: phase.participantAction || 'Teilnehmende bearbeiten den naechsten Lernschritt.',
    moderationQuestions: Array.isArray(phase.moderationQuestions) ? phase.moderationQuestions.map(String) : [],
    demoId: phase.demoId || '',
    releaseActions: Array.isArray(phase.releaseActions) ? phase.releaseActions.map(String) : [],
    checkpoint: phase.checkpoint || '',
    typicalProblems: Array.isArray(phase.typicalProblems) ? phase.typicalProblems.map(String) : [],
    differentiation: {
      supportWeak: phase.differentiation?.supportWeak || 'Schrittfolge sichtbar machen und ein Beispiel gemeinsam starten.',
      challengeStrong: phase.differentiation?.challengeStrong || 'Transferfrage oder Erweiterungsaufgabe geben.'
    }
  }));
  return {
    dayNumber,
    title,
    estimatedTotalMinutes: Number(runbook.estimatedTotalMinutes || normalizedPhases.reduce((sum, phase) => sum + Number(phase.estimatedMinutes || 0), 0) || 360),
    phases: normalizedPhases,
    teacherChecklist: Array.isArray(runbook.teacherChecklist) ? runbook.teacherChecklist.map(String) : ['Lernziel sichtbar machen', 'Freigaben pruefen', 'Ergebnisse sichern'],
    materialChecklist: Array.isArray(runbook.materialChecklist) ? runbook.materialChecklist.map(String) : ['Webvariante', 'Aufgaben', 'Quiz'],
    demoChecklist: Array.isArray(runbook.demoChecklist) ? runbook.demoChecklist.map(String) : (context.demos || []).map((demo) => demo.title || demo.id || 'Demo pruefen'),
    releaseChecklist: Array.isArray(runbook.releaseChecklist) ? runbook.releaseChecklist.map(String) : (context.releasePlan || []).map((item) => item.releaseHint || item.title || 'Freigabe pruefen'),
    assessmentChecklist: Array.isArray(runbook.assessmentChecklist) ? runbook.assessmentChecklist.map(String) : ['Quiz auswerten', 'Aufgabenstichprobe pruefen'],
    fallbackPlan: runbook.fallbackPlan || 'Falls Demo oder Tool nicht funktioniert: Beispiel als Screenshot oder Codeauszug zeigen und Aufgaben manuell freigeben.'
  };
}

function deriveTeacherRunbookPhases(context = {}) {
  const flow = normalizeDidacticFlow(context.didacticFlow || []);
  const demos = normalizeDemos(context.demos || []);
  const releasePlan = normalizeReleasePlan(context.releasePlan || []);
  const tasks = normalizeItems(context.tasks || []);
  const quiz = normalizeQuiz(context.quiz || []);
  const phases = flow.length ? flow : [
    { phase: 'activation', title: 'Einstieg', teacherAction: 'Vorwissen aktivieren.', participantAction: 'Vorwissen nennen.' },
    { phase: 'practice', title: 'Arbeitsphase', teacherAction: 'Aufgabe freigeben und begleiten.', participantAction: 'Aufgabe bearbeiten.' },
    { phase: 'reflection', title: 'Sicherung', teacherAction: 'Ergebnisse sichern.', participantAction: 'Ergebnisse reflektieren.' }
  ];
  return phases.map((item, index) => {
    const demo = demos[index] || demos.find((candidate) => candidate.phaseRef === item.phase);
    const releases = releasePlan.filter((release) => !release.phase || release.phase === item.phase);
    const task = tasks[index] || tasks.find((candidate) => candidate.phaseRef === item.phase);
    return {
      phase: item.phase,
      title: item.title,
      estimatedMinutes: task?.estimatedMinutes || 20,
      teacherAction: item.teacherAction || item.description || 'Phase moderieren.',
      participantAction: item.participantAction || 'Aktiv mitarbeiten und Ergebnis notieren.',
      moderationQuestions: [`Woran erkennen wir, dass ${context.title || 'das Thema'} verstanden wurde?`],
      demoId: demo?.id || '',
      releaseActions: releases.map((release) => release.releaseHint || release.title).filter(Boolean),
      checkpoint: quiz.length ? 'Kurzer Quiz- oder Ergebnischeck.' : 'Stichprobe im Plenum sichern.',
      typicalProblems: ['Begriffe werden verwechselt', 'Schritte werden zu schnell uebersprungen'],
      differentiation: {
        supportWeak: 'Teilaufgabe vormachen und Hilfekarte anbieten.',
        challengeStrong: 'Zusatzfrage mit Transfer oder Begruendung stellen.'
      }
    };
  });
}

function normalizeSections(items = [], sourceRefs = []) {
  return (items || []).map((item, index) => ({
    id: item.id || `section-${index + 1}`,
    title: item.title || 'Abschnitt',
    content: item.content || '',
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs,
    aiGenerated: item.aiGenerated === true
  }));
}

function normalizeItems(items = [], sourceRefs = []) {
  return (items || []).map((item, index) => ({
    id: item.id || `item-${index + 1}`,
    title: item.title || `Eintrag ${index + 1}`,
    text: item.text || item.content || '',
    difficulty: normalizeDifficulty(item.difficulty),
    phaseRef: item.phaseRef || '',
    progressionLevel: item.progressionLevel || '',
    socialForm: item.socialForm || '',
    estimatedMinutes: Number(item.estimatedMinutes || 0),
    releaseHint: item.releaseHint || '',
    assessmentCriteria: Array.isArray(item.assessmentCriteria) ? item.assessmentCriteria.map(String) : [],
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs,
    aiGenerated: item.aiGenerated === true
  }));
}

function normalizeQuiz(items = [], sourceRefs = []) {
  return (items || []).map((item, index) => {
    const options = item.options?.length ? item.options.map(String) : ['Antwort A', 'Antwort B'];
    return {
      id: item.id || `q-${index + 1}`,
      type: item.type || 'single-choice',
      topic: item.topic || '',
      difficulty: normalizeDifficulty(item.difficulty, 'easy'),
      text: item.text || 'Frage fachlich pruefen.',
      options,
      correct: normalizeCorrect(item.correct, options.length),
      sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs,
      aiGenerated: item.aiGenerated === true
    };
  });
}

function stripParticipantSolutions(value) {
  return String(value || '')
    .replace(/loesungsweg/gi, 'Vorgehen')
    .replace(/lösungsweg/gi, 'Vorgehen')
    .replace(/loesungshinweis/gi, 'Hinweis')
    .replace(/lösungshinweis/gi, 'Hinweis')
    .replace(/loesung/gi, 'Hinweis')
    .replace(/lösung/gi, 'Hinweis')
    .replace(/solution/gi, 'Hinweis');
}

function normalizeCorrect(correct, optionCount) {
  const values = Array.isArray(correct) ? correct : [correct ?? 0];
  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value < optionCount);
  return normalized.length ? Array.from(new Set(normalized)) : [0];
}

module.exports = {
  normalizeDayGenerationResult,
  stripParticipantSolutions,
  normalizeCorrect,
  normalizeArtifacts,
  normalizeDemos,
  normalizeDidacticFlow,
  normalizeReleasePlan,
  normalizeReflection,
  normalizeTeacherRunbook
};
const { normalizeDifficulty } = require('../difficulty-levels');
