const path = require('path');
const { createOutline, trimPreview } = require('./source-outline-types');
const { readZipTextEntries, xmlTextRuns } = require('./zip-xml-reader');
const { sectionsFromText } = require('./text-outline-extractor');

function extractDocxOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'dokument.docx');
  const warnings = [];
  let text = '';
  try {
    const entry = readZipTextEntries(filePath, '^word/document\\.xml$')[0];
    text = xmlTextRuns(entry?.Text || '').join('\n');
  } catch (error) {
    warnings.push(`DOCX konnte nicht gelesen werden: ${error.message}`);
  }
  const sections = sectionsFromText(text, sourceFile, 'docx');
  if (!sections.length) warnings.push('Keine DOCX-Ueberschriften erkannt. Fallback-Abschnitt erzeugt.');
  return createOutline({
    sourceFile,
    format: 'docx',
    title: path.basename(sourceFile, '.docx').replace(/[_-]+/g, ' '),
    sections: sections.length ? sections : [{
      id: 'section-1',
      title: path.basename(sourceFile, '.docx').replace(/[_-]+/g, ' '),
      summary: 'Eigenformulierte Zusammenfassung aus DOCX.',
      textPreview: trimPreview(text),
      sourceRef: `docx:${sourceFile}:Abschnitt 1`,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      warnings: ['Fallback aus DOCX-Text.']
    }],
    warnings,
    searchable: Boolean(text)
  });
}

module.exports = {
  extractDocxOutline
};
