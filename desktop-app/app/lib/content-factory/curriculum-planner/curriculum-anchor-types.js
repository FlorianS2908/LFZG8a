const anchorTypes = new Set(['course-plan', 'book-or-presentation', 'text-document']);

const anchorAccept = {
  'course-plan': ['.xls', '.xlsx', '.xlsm'],
  'book-or-presentation': ['.pdf', '.epub', '.ppt', '.pptx'],
  'text-document': ['.doc', '.docx', '.txt', '.md', '.html', '.htm']
};

function normalizeAnchorTypes(input = {}) {
  const values = Array.isArray(input.types) ? input.types : [input.type].filter(Boolean);
  const valid = values.filter((type, index) => anchorTypes.has(type) && values.indexOf(type) === index);
  if (!valid.length) throw new Error('Mindestens eine Art der Hauptquelle ist Pflicht.');
  return valid;
}

function assertAnchorType(type) {
  if (!anchorTypes.has(type)) {
    throw new Error('Ungueltiger Curriculum Anchor.');
  }
}

module.exports = {
  anchorTypes,
  anchorAccept,
  assertAnchorType,
  normalizeAnchorTypes
};
