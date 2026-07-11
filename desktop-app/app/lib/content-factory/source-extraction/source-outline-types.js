const path = require('path');

function detectFormat(filePathOrName = '') {
  const extension = path.extname(String(filePathOrName)).toLowerCase();
  return {
    '.pdf': 'pdf',
    '.epub': 'epub',
    '.pptx': 'pptx',
    '.docx': 'docx',
    '.txt': 'txt',
    '.md': 'md',
    '.html': 'html',
    '.htm': 'html'
  }[extension] || 'unknown';
}

function createOutline({ sourceFile, format, title, sections = [], warnings = [], searchable = true }) {
  return {
    sourceFile,
    format,
    title,
    sections: sections.map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      title: section.title || `Abschnitt ${index + 1}`,
      summary: section.summary || `Eigene Kurzbeschreibung zu ${section.title || `Abschnitt ${index + 1}`}.`,
      pageNumber: section.pageNumber || null,
      slideNumber: section.slideNumber || null,
      chapter: section.chapter || '',
      textPreview: trimPreview(section.textPreview || ''),
      sourceRef: section.sourceRef || `${format}:${sourceFile}:Abschnitt ${index + 1}`,
      wordCount: Number(section.wordCount || 0),
      warnings: section.warnings || []
    })),
    warnings,
    searchable
  };
}

function trimPreview(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

module.exports = {
  detectFormat,
  createOutline,
  trimPreview
};
