const path = require('path');
const { createOutline, trimPreview, createQuality, isIgnoredHeading } = require('./source-outline-types');
const { readZipTextEntries, xmlTextRuns } = require('./zip-xml-reader');

function extractPptxOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'praesentation.pptx');
  const warnings = [];
  let slideEntries = [];
  let noteEntries = [];
  try {
    slideEntries = readZipTextEntries(filePath, '^ppt/slides/slide[0-9]+\\.xml$');
    noteEntries = readZipTextEntries(filePath, '^ppt/notesSlides/notesSlide[0-9]+\\.xml$');
  } catch (error) {
    warnings.push(`PPTX konnte nicht gelesen werden: ${error.message}`);
  }
  const notesBySlide = new Map(noteEntries.map((entry) => [Number(/notesSlide(\d+)\.xml$/i.exec(entry.FullName)?.[1] || 0), xmlTextRuns(entry.Text).join(' ')]));
  const ranges = normalizeRanges(options.ranges || []);
  const sections = slideEntries
    .map((entry) => {
      const slideNumber = Number(/slide(\d+)\.xml$/i.exec(entry.FullName)?.[1] || 0);
      return { entry, slideNumber };
    })
    .filter(({ slideNumber }) => !ranges.length || ranges.some((range) => slideNumber >= range.from && slideNumber <= range.to))
    .sort((a, b) => a.slideNumber - b.slideNumber)
    .map(({ entry, slideNumber }) => sectionFromSlide(entry, slideNumber, notesBySlide.get(slideNumber), sourceFile))
    .filter((section) => !isIgnoredHeading(section.title));
  if (!sections.length) warnings.push('Keine lesbaren Folien im gewaehlten Bereich gefunden.');
  const lowTextCount = sections.filter((section) => section.wordCount < 4).length;
  if (lowTextCount) warnings.push(`${lowTextCount} Folie(n) enthalten sehr wenig Text.`);
  return createOutline({
    sourceFile,
    format: 'pptx',
    title: path.basename(sourceFile, '.pptx').replace(/[_-]+/g, ' '),
    sections,
    warnings,
    searchable: sections.length > 0,
    quality: createQuality(sections, warnings, {
      usedFallback: !sections.length,
      extractedCharacters: sections.reduce((sum, section) => sum + String(section.textPreview || '').length, 0),
      reason: sections.length >= 4 ? 'Folienstruktur und Titel erkannt.' : 'Wenige Folien oder wenig Text erkannt.'
    })
  });
}

function sectionFromSlide(entry, slideNumber, notes, sourceFile) {
  const runs = xmlTextRuns(entry.Text);
  const title = pickTitle(runs) || `Folie ${slideNumber}`;
  const bodyRuns = runs.filter((run) => run !== title);
  const body = [bodyRuns.join(' '), notes ? `Notizen: ${notes}` : ''].filter(Boolean).join(' ');
  return {
    id: `slide-${slideNumber}`,
    title,
    summary: `Eigenformulierte Zusammenfassung zu Folie ${slideNumber}: ${title}.`,
    slideNumber,
    textPreview: trimPreview(body),
    sourceRef: `pptx:${sourceFile}:Folie ${slideNumber}`,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    warnings: runs.length ? [] : ['Folie enthaelt keinen lesbaren Text.']
  };
}

function pickTitle(runs) {
  return (runs || []).find((run) => {
    const clean = String(run || '').trim();
    return clean.length > 2 && clean.length < 90 && !isIgnoredHeading(clean);
  });
}

function normalizeRanges(ranges) {
  return (ranges || []).map((range) => ({
    from: Math.max(1, Number(range.from || 1)),
    to: Math.max(Number(range.from || 1), Number(range.to || range.from || 1))
  }));
}

module.exports = {
  extractPptxOutline
};
