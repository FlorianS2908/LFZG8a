const dayGenerationStatus = ['draft', 'needs-review', 'failed'];

function validateDayGenerationResult(result = {}) {
  const errors = [];
  if (!Number(result.dayNumber)) errors.push('dayNumber fehlt.');
  if (!result.title) errors.push('title fehlt.');
  if (!Array.isArray(result.webvariant?.teacherHtmlSections)) errors.push('teacherHtmlSections muss ein Array sein.');
  if (!Array.isArray(result.webvariant?.participantHtmlSections)) errors.push('participantHtmlSections muss ein Array sein.');
  if (!Array.isArray(result.tasks)) errors.push('tasks muss ein Array sein.');
  if (!Array.isArray(result.solutions)) errors.push('solutions muss ein Array sein.');
  if (!Array.isArray(result.quiz)) errors.push('quiz muss ein Array sein.');
  if (!Array.isArray(result.sourceRefs)) errors.push('sourceRefs muss ein Array sein.');
  if (!Array.isArray(result.warnings)) errors.push('warnings muss ein Array sein.');
  errors.push(...validateQuizQuestions(result.quiz).errors);
  errors.push(...validateNoParticipantSolutions(result).errors);
  return { valid: errors.length === 0, errors };
}

function validateCurriculumPlanPartial(result = {}) {
  const errors = [];
  if (result.days && !Array.isArray(result.days)) errors.push('days muss ein Array sein.');
  if (result.warnings && !Array.isArray(result.warnings)) errors.push('warnings muss ein Array sein.');
  return { valid: errors.length === 0, errors };
}

function validateQuizQuestions(quiz = []) {
  const errors = [];
  if (!Array.isArray(quiz)) return { valid: false, errors: ['quiz muss ein Array sein.'] };
  quiz.forEach((item, index) => {
    if (!item.text) errors.push(`Quiz ${index + 1}: text fehlt.`);
    if (!Array.isArray(item.options) || item.options.length < 2) errors.push(`Quiz ${index + 1}: mindestens zwei Optionen erforderlich.`);
    if (!Array.isArray(item.correct) || !item.correct.length) errors.push(`Quiz ${index + 1}: correct fehlt.`);
    if ((item.correct || []).some((value) => Number(value) >= (item.options || []).length || Number(value) < 0)) errors.push(`Quiz ${index + 1}: correct verweist auf ungueltige Option.`);
  });
  return { valid: errors.length === 0, errors };
}

function validateNoParticipantSolutions(result = {}) {
  const errors = [];
  const participantText = JSON.stringify({
    sections: result.webvariant?.participantHtmlSections || [],
    tasks: result.tasks || []
  });
  if (/loesung|lösung|loesungs|lösungs|solution/i.test(participantText)) errors.push('Teilnehmerbereich enthaelt Loesungshinweise.');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  dayGenerationStatus,
  validateDayGenerationResult,
  validateCurriculumPlanPartial,
  validateQuizQuestions,
  validateNoParticipantSolutions
};
