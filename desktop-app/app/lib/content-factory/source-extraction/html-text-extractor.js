const fs = require('fs');
const path = require('path');
const { createOutline, trimPreview } = require('./source-outline-types');

function extractHtmlOutline(filePath) {
  const sourceFile = path.basename(filePath || 'quelle.html');
  const warnings = [];
  let html = '';
  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warnings.push(`HTML konnte nicht gelesen werden: ${error.message}`);
  }
  const headingMatches = Array.from(html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi));
  const sections = headingMatches.slice(0, 40).map((match, index) => {
    const title = stripTags(match[1]);
    return {
      id: `section-${index + 1}`,
      title,
      summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
      textPreview: '',
      sourceRef: `html:${sourceFile}:Abschnitt ${index + 1}`,
      wordCount: 0,
      warnings: []
    };
  }).filter((section) => section.title.length > 2);
  const text = stripTags(html);
  return createOutline({
    sourceFile,
    format: 'html',
    title: path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' '),
    sections: sections.length ? sections : [{
      id: 'section-1',
      title: path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' '),
      summary: 'Eigenformulierte Zusammenfassung aus HTML-Quelle.',
      textPreview: trimPreview(text),
      sourceRef: `html:${sourceFile}:Abschnitt 1`,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      warnings: ['Keine HTML-Ueberschriften erkannt.']
    }],
    warnings,
    searchable: Boolean(text)
  });
}

function stripTags(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = {
  extractHtmlOutline,
  stripTags
};
