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
    visibleForParticipants: item.visibleForParticipants === true,
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs
  }));
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
    difficulty: item.difficulty || 'mittel',
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
      difficulty: item.difficulty || 'leicht',
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
  normalizeDemos
};
