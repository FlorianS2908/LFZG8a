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
  const participantText = JSON.stringify(result.webvariant?.participantHtmlSections || []);
  if (/loesung|lösung|solution/i.test(participantText)) errors.push('Teilnehmerbereich enthaelt Loesungshinweise.');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  dayGenerationStatus,
  validateDayGenerationResult
};
