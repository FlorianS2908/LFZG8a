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
    tasks: normalizeItems(input.tasks, sourceRefs),
    solutions: normalizeItems(input.solutions, sourceRefs),
    quiz: normalizeQuiz(input.quiz, sourceRefs),
    projectContext: input.projectContext || '',
    sourceRefs,
    warnings: input.warnings || [],
    aiAdditions: input.aiAdditions || []
  };
  normalized.webvariant.participantHtmlSections = normalized.webvariant.participantHtmlSections.map((section) => ({
    ...section,
    content: stripParticipantSolutions(section.content)
  }));
  return normalized;
}

function normalizeSections(items = [], sourceRefs = []) {
  return (items || []).map((item) => ({
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
  return (items || []).map((item, index) => ({
    id: item.id || `q-${index + 1}`,
    type: item.type || 'single-choice',
    topic: item.topic || '',
    difficulty: item.difficulty || 'leicht',
    text: item.text || 'Frage noch ergaenzen.',
    options: item.options?.length ? item.options : ['Antwort A', 'Antwort B'],
    correct: Array.isArray(item.correct) ? item.correct : [0],
    sourceRefs: item.sourceRefs?.length ? item.sourceRefs : sourceRefs,
    aiGenerated: item.aiGenerated === true
  }));
}

function stripParticipantSolutions(value) {
  return String(value || '').replace(/loesung/gi, 'Hinweis').replace(/lösung/gi, 'Hinweis').replace(/solution/gi, 'Hinweis');
}

module.exports = {
  normalizeDayGenerationResult,
  stripParticipantSolutions
};
