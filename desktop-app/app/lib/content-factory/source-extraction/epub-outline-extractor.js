const path = require('path');
const { createOutline, trimPreview } = require('./source-outline-types');
const { readZipTextEntries, xmlText } = require('./zip-xml-reader');

function extractEpubOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'buch.epub');
  const warnings = ['EPUB wird nur als analysis/reference-only Quelle genutzt.'];
  let entries = [];
  try {
    entries = readZipTextEntries(filePath, '.*\\.(xhtml|html|htm)$');
  } catch (error) {
    warnings.push(`EPUB konnte nicht vollstaendig gelesen werden: ${error.message}`);
  }
  const ranges = options.ranges || [];
  const sections = entries.slice(0, 80).map((entry, index) => {
    const chapter = index + 1;
    const html = entry.Text || '';
    const heading = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html)?.[1];
    const title = xmlText(heading || path.basename(entry.FullName, path.extname(entry.FullName)));
    const text = xmlText(html);
    return {
      id: `chapter-${chapter}`,
      title: title || `Kapitel ${chapter}`,
      summary: `Eigenformulierte Zusammenfassung zu Kapitel ${chapter}.`,
      pageNumber: chapter,
      chapter: String(chapter),
      textPreview: trimPreview(text),
      sourceRef: `epub:${sourceFile}:Kapitel ${chapter}`,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      warnings: []
    };
  }).filter((section) => !ranges.length || ranges.some((range) => section.pageNumber >= range.from && section.pageNumber <= range.to));
  if (!sections.length) warnings.push('Keine lesbaren EPUB-Kapitel im gewaehlten Bereich gefunden.');
  return createOutline({
    sourceFile,
    format: 'epub',
    title: path.basename(sourceFile, '.epub').replace(/[_-]+/g, ' '),
    sections,
    warnings,
    searchable: sections.length > 0
  });
}

module.exports = {
  extractEpubOutline
};
