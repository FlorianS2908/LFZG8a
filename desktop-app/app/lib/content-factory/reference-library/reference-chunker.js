function createChunks(extraction, metadata, options = {}) {
  const maxLength = options.maxLength || 900;
  const chunks = [];
  const sections = extraction.sections?.length ? extraction.sections : [{ sectionTitle: 'Dokument', text: extraction.text || '' }];

  sections.forEach((section, sectionIndex) => {
    const words = String(section.text || '').split(/\s+/).filter(Boolean);
    let buffer = [];
    words.forEach((word) => {
      buffer.push(word);
      if (buffer.join(' ').length >= maxLength) {
        chunks.push(createChunk(metadata, section, sectionIndex, chunks.length, buffer.join(' ')));
        buffer = [];
      }
    });
    if (buffer.length) {
      chunks.push(createChunk(metadata, section, sectionIndex, chunks.length, buffer.join(' ')));
    }
  });

  return chunks;
}

function createChunk(metadata, section, sectionIndex, chunkIndex, text) {
  return {
    id: `${metadata.id}-chunk-${chunkIndex + 1}`,
    referenceId: metadata.id,
    title: metadata.title,
    author: metadata.author,
    sectionTitle: section.sectionTitle || `Abschnitt ${sectionIndex + 1}`,
    pageNumber: section.pageNumber ?? null,
    text,
    sourceRef: `${metadata.title}${section.sectionTitle ? `, ${section.sectionTitle}` : ''}${section.pageNumber ? `, Seite ${section.pageNumber}` : ''}`,
    exportable: false
  };
}

module.exports = {
  createChunks
};
