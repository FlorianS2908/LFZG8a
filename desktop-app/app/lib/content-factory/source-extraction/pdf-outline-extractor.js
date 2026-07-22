const fs = require('fs');
const path = require('path');
const { createOutline, trimPreview, createQuality, isIgnoredHeading } = require('./source-outline-types');
const { sectionsFromText } = require('./text-outline-extractor');

function extractPdfOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'quelle.pdf');
  const warnings = ['PDF-Extraktion nutzt sicheren Text-Fallback ohne OCR und ohne Bilder.'];
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'latin1');
  } catch (error) {
    warnings.push(`PDF konnte nicht gelesen werden: ${error.message}`);
  }
  const title = path.basename(sourceFile, '.pdf').replace(/[_-]+/g, ' ');
  const ranges = normalizeRanges(options.ranges || []);
  const readable = extractReadablePdfText(raw);
  const pages = splitPages(readable);
  const selectedPages = ranges.length
    ? pages.filter((page) => ranges.some((range) => page.pageNumber >= range.from && page.pageNumber <= range.to))
    : pages;
  const selectedText = selectedPages.map((page) => page.text).join('\n\n');
  let sections = sectionsFromText(selectedText, sourceFile, 'pdf').map((section, index) => ({
    ...section,
    id: `pdf-section-${index + 1}`,
    pageNumber: selectedPages[Math.min(index, Math.max(0, selectedPages.length - 1))]?.pageNumber || index + 1,
    sourceRef: `pdf:${sourceFile}:Abschnitt ${index + 1}`
  }));
  if (!sections.length) {
    sections = buildPdfBlocks(selectedPages, sourceFile, title, ranges);
  }
  if (!sections.length) {
    warnings.push('Kein lesbarer PDF-Text erkannt. Fallback aus Dateiname erzeugt.');
    sections = [{
      id: 'pdf-fallback-1',
      title,
      summary: `Eigenformulierte Zusammenfassung aus PDF-Quelle ${title}.`,
      pageNumber: ranges[0]?.from || 1,
      textPreview: '',
      sourceRef: `pdf:${sourceFile}:Fallback`,
      wordCount: 0,
      warnings: ['Kein lesbarer PDF-Text erkannt.']
    }];
  }
  const usedFallback = sections.some((section) => (section.warnings || []).some((warning) => /Fallback|kein lesbarer/i.test(warning)));
  return createOutline({
    sourceFile,
    format: 'pdf',
    title,
    sections,
    warnings,
    searchable: Boolean(selectedText),
    quality: createQuality(sections, warnings, { usedFallback, extractedCharacters: selectedText.length })
  });
}

function extractReadablePdfText(raw) {
  return String(raw || '')
    .replace(/\b\d+\s+\d+\s+obj\b[\s\S]*?\bendobj\b/g, (object) => Array.from(object.matchAll(/\(([^)]{3,240})\)\s*T[Jj]/g)).map((match) => match[1]).join('\n'))
    .replace(/BT|ET|Tf|Td|Tj|TJ|cm|q|Q/g, ' ')
    .replace(/\(([^)]{3,240})\)/g, ' $1\n')
    .replace(/<([0-9A-Fa-f]{6,})>/g, ' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/[^\x20-\x7EÄÖÜäöüß\n\f]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\b(?:obj|endobj|xref|stream|endstream|trailer)\b/gi, ' ')
    .trim();
}

function splitPages(text) {
  const parts = String(text || '').split(/\f|\/Type\s*\/Page\b/).map((item) => item.trim()).filter(Boolean);
  const pages = parts.length ? parts : [String(text || '').trim()].filter(Boolean);
  return pages.map((pageText, index) => ({ pageNumber: index + 1, text: pageText }));
}

function buildPdfBlocks(pages, sourceFile, title, ranges) {
  return pages.slice(0, 80).flatMap((page) => {
    const lines = page.text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const headingLines = lines.filter((line) => isPdfHeading(line)).slice(0, 4);
    const candidates = headingLines.length ? headingLines : [lines.slice(0, 8).join(' ')];
    return candidates.map((candidate, index) => {
      const sectionTitle = cleanPdfTitle(candidate) || `${title} Seite ${page.pageNumber}`;
      return {
        id: `pdf-page-${page.pageNumber}-${index + 1}`,
        title: sectionTitle,
        summary: `Eigenformulierte Zusammenfassung zu ${sectionTitle}.`,
        pageNumber: page.pageNumber,
        textPreview: trimPreview(page.text),
        sourceRef: `pdf:${sourceFile}:Seite ${page.pageNumber}`,
        wordCount: page.text.split(/\s+/).filter(Boolean).length,
        warnings: headingLines.length ? ['PDF-Struktur aus Textfragmenten abgeleitet.'] : ['Fallback aus PDF-Seitentext.']
      };
    });
  }).filter((section) => !ranges.length || ranges.some((range) => section.pageNumber >= range.from && section.pageNumber <= range.to));
}

function isPdfHeading(line) {
  const clean = cleanPdfTitle(line);
  return clean.length > 3
    && clean.length < 90
    && !isIgnoredHeading(clean)
    && (/^(kapitel|lernfeld|modul)\s+\d+/i.test(clean) || /^\d+(?:\.\d+)*\.?\s+\S/.test(clean) || /^[A-ZÄÖÜ]/.test(clean));
}

function cleanPdfTitle(value) {
  return String(value || '').replace(/^\d+(?:\.\d+)*\.?\s+/, '').replace(/\s+/g, ' ').trim();
}

function normalizeRanges(ranges) {
  return (ranges || []).map((range) => ({
    from: Math.max(1, Number(range.from || 1)),
    to: Math.max(Number(range.from || 1), Number(range.to || range.from || 1))
  }));
}

module.exports = {
  extractPdfOutline,
  extractReadablePdfText
};
