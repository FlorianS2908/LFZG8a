const fs = require('fs');
const path = require('path');
const { createOutline, trimPreview } = require('./source-outline-types');

function extractTextOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'textquelle.txt');
  const warnings = [];
  let text = '';
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warnings.push(`Textquelle konnte nicht gelesen werden: ${error.message}`);
  }
  const sections = sectionsFromText(text, sourceFile, options.format || path.extname(sourceFile).slice(1) || 'txt');
  if (!sections.length) warnings.push('Keine klaren Ueberschriften erkannt. Fallback-Abschnitt erzeugt.');
  return createOutline({
    sourceFile,
    format: options.format || path.extname(sourceFile).slice(1) || 'txt',
    title: path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' '),
    sections: sections.length ? sections : [fallbackSection(sourceFile, text, options.format || 'txt')],
    warnings,
    searchable: Boolean(text)
  });
}

function sectionsFromText(text, sourceFile, format) {
  const lines = String(text || '').split(/\r?\n/);
  const headingIndexes = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^#{1,4}\s+\S/.test(trimmed) || /^\d+(?:\.\d+)*\s+\S/.test(trimmed) || /^[A-ZÄÖÜ][\wÄÖÜäöüß\s/-]{4,80}:?$/.test(trimmed)) {
      headingIndexes.push(index);
    }
  });
  return headingIndexes.slice(0, 40).map((lineIndex, index) => {
    const next = headingIndexes[index + 1] || Math.min(lines.length, lineIndex + 12);
    const title = lines[lineIndex].replace(/^#{1,4}\s+/, '').replace(/:$/, '').trim();
    const body = lines.slice(lineIndex + 1, next).join(' ');
    return {
      id: `section-${index + 1}`,
      title,
      summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
      textPreview: trimPreview(body),
      sourceRef: `${format}:${sourceFile}:Abschnitt ${index + 1}`,
      wordCount: body.split(/\s+/).filter(Boolean).length,
      warnings: []
    };
  }).filter((section) => section.title.length > 2);
}

function fallbackSection(sourceFile, text, format) {
  const title = path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' ');
  return {
    id: 'section-1',
    title,
    summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
    textPreview: trimPreview(text),
    sourceRef: `${format}:${sourceFile}:Abschnitt 1`,
    wordCount: String(text || '').split(/\s+/).filter(Boolean).length,
    warnings: ['Fallback aus Textinhalt.']
  };
}

module.exports = {
  extractTextOutline,
  sectionsFromText
};
