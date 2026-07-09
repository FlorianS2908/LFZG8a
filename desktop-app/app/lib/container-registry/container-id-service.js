function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'container';
}

function buildContainerId({ courseId, courseName, department } = {}) {
  const base = slugify(courseId || courseName || 'container');
  const departmentPart = department && department !== 'ALLGEMEIN' ? `-${slugify(department)}` : '';
  return `${base}${departmentPart}`;
}

function suggestUniqueContainerId(input, exists) {
  const base = buildContainerId(input);
  if (!exists(base)) {
    return base;
  }
  let index = 2;
  while (exists(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

module.exports = {
  slugify,
  buildContainerId,
  suggestUniqueContainerId
};
