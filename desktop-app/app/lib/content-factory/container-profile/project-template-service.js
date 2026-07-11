function packageNameFromCourseId(courseId = '') {
  const clean = String(courseId || 'kurs').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'kurs';
  return `de.ploglan.${clean}`.replace(/\.+/g, '.');
}

function javaClassName(value = 'Aufgabe') {
  const clean = String(value || 'Aufgabe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  return (clean.split(/\s+/).slice(0, 3).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'Aufgabe').replace(/^[0-9]+/, 'Aufgabe');
}

module.exports = {
  packageNameFromCourseId,
  javaClassName
};
