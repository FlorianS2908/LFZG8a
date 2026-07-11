function normalizeCourseName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeCourseId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kurs';
}

module.exports = {
  normalizeCourseName,
  normalizeCourseId
};
