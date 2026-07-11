const fs = require('fs');
const path = require('path');
const { createOutline, trimPreview } = require('./source-outline-types');

function extractPdfOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'quelle.pdf');
  const warnings = ['PDF-Extraktion nutzt sicheren Text-Fallback ohne OCR und ohne Bilder.'];
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'latin1');
  } catch (error) {
    warnings.push(`PDF konnte nicht gelesen werden: ${error.message}`);
  }
  const readable = raw
    .replace(/\(([^)]{3,160})\)/g, ' $1 ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/[^\x20-\x7EÄÖÜäöüß]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = path.basename(sourceFile, '.pdf').replace(/[_-]+/g, ' ');
  const ranges = options.ranges || [];
  const sections = (ranges.length ? ranges : [{ from: 1, to: 1 }]).map((range, index) => ({
    id: `pdf-range-${index + 1}`,
    title: `${title}${ranges.length ? ` Seiten ${range.from}-${range.to}` : ''}`,
    summary: `Eigenformulierte Zusammenfassung aus PDF-Quelle ${ranges.length ? `Seiten ${range.from}-${range.to}` : ''}.`,
    pageNumber: range.from || index + 1,
    textPreview: trimPreview(readable),
    sourceRef: `pdf:${sourceFile}:Seiten ${range.from || 1}-${range.to || range.from || 1}`,
    wordCount: readable.split(/\s+/).filter(Boolean).length,
    warnings: readable ? [] : ['Kein lesbarer PDF-Text erkannt.']
  }));
  return createOutline({
    sourceFile,
    format: 'pdf',
    title,
    sections,
    warnings,
    searchable: Boolean(readable)
  });
}

module.exports = {
  extractPdfOutline
};
