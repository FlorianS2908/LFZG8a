const path = require('path');
const { createOutline, trimPreview, createQuality } = require('./source-outline-types');
const { readZipTextEntries, xmlText, xmlTextRuns } = require('./zip-xml-reader');
const { sectionsFromText } = require('./text-outline-extractor');

function extractDocxOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'dokument.docx');
  const warnings = [];
  let paragraphs = [];
  try {
    const entry = readZipTextEntries(filePath, '^word/document\\.xml$')[0];
    paragraphs = extractParagraphs(entry?.Text || '');
  } catch (error) {
    warnings.push(`DOCX konnte nicht gelesen werden: ${error.message}`);
  }
  const text = paragraphs.join('\n');
  let sections = sectionsFromText(text, sourceFile, 'docx');
  if (!sections.length && paragraphs.length) {
    sections = groupParagraphs(paragraphs, sourceFile);
    warnings.push('DOCX-Struktur aus Absatzbloecken abgeleitet.');
  }
  if (!sections.length) warnings.push('Keine DOCX-Ueberschriften erkannt. Fallback-Abschnitt erzeugt.');
  const usedFallback = !sections.length;
  const finalSections = sections.length ? sections : [{
    id: 'section-1',
    title: path.basename(sourceFile, '.docx').replace(/[_-]+/g, ' '),
    summary: 'Eigenformulierte Zusammenfassung aus DOCX.',
    textPreview: trimPreview(text),
    sourceRef: `docx:${sourceFile}:Abschnitt 1`,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    warnings: ['Fallback aus DOCX-Text.']
  }];
  return createOutline({
    sourceFile,
    format: 'docx',
    title: path.basename(sourceFile, '.docx').replace(/[_-]+/g, ' '),
    sections: finalSections,
    warnings,
    searchable: Boolean(text),
    quality: createQuality(finalSections, warnings, { usedFallback, extractedCharacters: text.length })
  });
}

function extractParagraphs(xml) {
  const paragraphs = Array.from(String(xml || '').matchAll(/<[^:>]*:?p\b[\s\S]*?<\/[^:>]*:?p>/g))
    .map((match) => xmlTextRuns(match[0]).join(' ').trim())
    .filter(Boolean);
  if (paragraphs.length) return paragraphs;
  return xmlText(xml).split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function groupParagraphs(paragraphs, sourceFile) {
  const groups = [];
  for (let index = 0; index < paragraphs.length && groups.length < 40; index += 5) {
    const chunk = paragraphs.slice(index, index + 5).join(' ');
    const title = paragraphs[index].length < 90 ? paragraphs[index] : `Abschnitt ${groups.length + 1}`;
    groups.push({
      id: `docx-block-${groups.length + 1}`,
      title,
      summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
      textPreview: trimPreview(chunk),
      sourceRef: `docx:${sourceFile}:Abschnitt ${groups.length + 1}`,
      wordCount: chunk.split(/\s+/).filter(Boolean).length,
      warnings: ['Abschnitt aus DOCX-Absaetzen abgeleitet.']
    });
  }
  return groups;
}

module.exports = {
  extractDocxOutline,
  extractParagraphs
};
