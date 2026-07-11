const anchorTypes = new Set(['course-plan', 'book-or-presentation', 'text-document']);

const anchorAccept = {
  'course-plan': ['.xlsx', '.xlsm'],
  'book-or-presentation': ['.pdf', '.epub', '.pptx'],
  'text-document': ['.docx', '.txt', '.md', '.html']
};

function assertAnchorType(type) {
  if (!anchorTypes.has(type)) {
    throw new Error('Ungueltiger Curriculum Anchor.');
  }
}

module.exports = {
  anchorTypes,
  anchorAccept,
  assertAnchorType
};
