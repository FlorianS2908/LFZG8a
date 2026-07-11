const { detectLegacyNames } = require('./legacy-name-detector');
const { normalizeCourseName, normalizeCourseId } = require('./course-name-normalizer');

function runNamingConsistency(files = [], course = {}) {
  const courseName = normalizeCourseName(course.courseName);
  const courseId = normalizeCourseId(course.courseId);
  const visibleFiles = files.filter((file) => !/^source-map\.json$|^reports\//.test(file.path || ''));
  const violations = [];
  visibleFiles.forEach((file) => {
    const legacyNames = detectLegacyNames(file.content);
    if (legacyNames.length) {
      violations.push({ path: file.path, legacyNames });
    }
  });
  return {
    ok: violations.length === 0,
    courseName,
    courseId,
    violations,
    warnings: violations.map((item) => `${item.path}: Legacy-Namen sichtbar (${item.legacyNames.join(', ')})`)
  };
}

module.exports = {
  runNamingConsistency
};
