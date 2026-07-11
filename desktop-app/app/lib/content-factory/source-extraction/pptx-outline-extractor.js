const path = require('path');
const { createOutline, trimPreview } = require('./source-outline-types');
const { readZipTextEntries, xmlTextRuns } = require('./zip-xml-reader');

function extractPptxOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'praesentation.pptx');
  const warnings = [];
  let entries = [];
  try {
    entries = readZipTextEntries(filePath, '^ppt/slides/slide[0-9]+\\.xml$');
  } catch (error) {
    warnings.push(`PPTX konnte nicht gelesen werden: ${error.message}`);
  }
  const ranges = options.ranges || [];
  const sections = entries
    .map((entry) => {
      const slideNumber = Number(/slide(\d+)\.xml$/i.exec(entry.FullName)?.[1] || 0);
      return { entry, slideNumber };
    })
    .filter(({ slideNumber }) => !ranges.length || ranges.some((range) => slideNumber >= range.from && slideNumber <= range.to))
    .sort((a, b) => a.slideNumber - b.slideNumber)
    .map(({ entry, slideNumber }, index) => {
      const runs = xmlTextRuns(entry.Text);
      const title = pickTitle(runs) || `Folie ${slideNumber}`;
      const body = runs.slice(1).join(' ');
      return {
        id: `slide-${slideNumber}`,
        title,
        summary: `Eigenformulierte Zusammenfassung zu Folie ${slideNumber}: ${title}.`,
        slideNumber,
        textPreview: trimPreview(body),
        sourceRef: `pptx:${sourceFile}:Folie ${slideNumber}`,
        wordCount: body.split(/\s+/).filter(Boolean).length,
        warnings: index === 0 && !runs.length ? ['Folie enthaelt keinen lesbaren Text.'] : []
      };
    });
  if (!sections.length) warnings.push('Keine lesbaren Folien im gewaehlten Bereich gefunden.');
  return createOutline({
    sourceFile,
    format: 'pptx',
    title: path.basename(sourceFile, '.pptx').replace(/[_-]+/g, ' '),
    sections,
    warnings,
    searchable: sections.length > 0
  });
}

function pickTitle(runs) {
  return (runs || []).find((run) => run.length > 2 && run.length < 90);
}

module.exports = {
  extractPptxOutline
};
