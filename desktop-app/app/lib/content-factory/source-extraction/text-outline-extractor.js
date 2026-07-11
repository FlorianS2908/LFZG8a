const fs = require('fs');
const path = require('path');
const { createOutline, trimPreview, createQuality, isIgnoredHeading } = require('./source-outline-types');

function extractTextOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'textquelle.txt');
  const format = options.format || path.extname(sourceFile).slice(1) || 'txt';
  const warnings = [];
  let text = '';
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warnings.push(`Textquelle konnte nicht gelesen werden: ${error.message}`);
  }
  const sections = sectionsFromText(text, sourceFile, format);
  if (!sections.length) warnings.push('Keine klaren Ueberschriften erkannt. Fallback-Abschnitt erzeugt.');
  const usedFallback = !sections.length;
  const finalSections = sections.length ? sections : [fallbackSection(sourceFile, text, format)];
  return createOutline({
    sourceFile,
    format,
    title: path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' '),
    sections: finalSections,
    warnings,
    searchable: Boolean(text),
    quality: createQuality(finalSections, warnings, { usedFallback, extractedCharacters: text.length })
  });
}

function sectionsFromText(text, sourceFile, format) {
  const lines = String(text || '').split(/\r?\n/);
  const headingIndexes = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const heading = cleanHeading(trimmed);
    if (isHeadingLine(trimmed) && !isIgnoredHeading(heading)) headingIndexes.push(index);
  });
  if (!headingIndexes.length) return chunkPlainText(text, sourceFile, format);
  return headingIndexes.slice(0, 60).map((lineIndex, index) => {
    const next = headingIndexes[index + 1] || Math.min(lines.length, lineIndex + 16);
    const title = cleanHeading(lines[lineIndex]);
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

function isHeadingLine(trimmed) {
  return /^#{1,6}\s+\S/.test(trimmed)
    || /^(kapitel|lernfeld|modul|tag)\s+\d+/i.test(trimmed)
    || /^\d+(?:\.\d+)*\.?\s+\S/.test(trimmed)
    || /^[A-Z][\w\s/-]{4,90}:?$/.test(normalizeAscii(trimmed));
}

function cleanHeading(value) {
  return String(value || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\d+(?:\.\d+)*\.?\s+/, '')
    .replace(/:$/, '')
    .trim();
}

function chunkPlainText(text, sourceFile, format) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length < 80) return [];
  const chunks = [];
  for (let index = 0; index < words.length && chunks.length < 12; index += 180) {
    const chunk = words.slice(index, index + 180).join(' ');
    const firstWords = words.slice(index, index + 6).join(' ');
    chunks.push({
      id: `text-block-${chunks.length + 1}`,
      title: `Textblock ${chunks.length + 1}: ${firstWords}`,
      summary: `Eigenformulierte Zusammenfassung zu Textblock ${chunks.length + 1}.`,
      textPreview: trimPreview(chunk),
      sourceRef: `${format}:${sourceFile}:Textblock ${chunks.length + 1}`,
      wordCount: chunk.split(/\s+/).filter(Boolean).length,
      warnings: ['Struktur aus Textbloecken abgeleitet.']
    });
  }
  return chunks;
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

function normalizeAscii(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  extractTextOutline,
  sectionsFromText,
  isHeadingLine
};
