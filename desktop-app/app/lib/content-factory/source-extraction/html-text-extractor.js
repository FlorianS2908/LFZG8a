const fs = require('fs');
const path = require('path');
const { createOutline, trimPreview, createQuality, isIgnoredHeading } = require('./source-outline-types');

function extractHtmlOutline(filePath) {
  const sourceFile = path.basename(filePath || 'quelle.html');
  const warnings = [];
  let html = '';
  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warnings.push(`HTML konnte nicht gelesen werden: ${error.message}`);
  }
  const text = stripTags(html);
  const sections = sectionsFromHtml(html, sourceFile);
  if (!sections.length) warnings.push('Keine HTML-Ueberschriften erkannt. Fallback-Abschnitt erzeugt.');
  const usedFallback = !sections.length;
  const finalSections = sections.length ? sections : [{
    id: 'section-1',
    title: path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' '),
    summary: 'Eigenformulierte Zusammenfassung aus HTML-Quelle.',
    textPreview: trimPreview(text),
    sourceRef: `html:${sourceFile}:Abschnitt 1`,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    warnings: ['Keine HTML-Ueberschriften erkannt.']
  }];
  return createOutline({
    sourceFile,
    format: 'html',
    title: path.basename(sourceFile, path.extname(sourceFile)).replace(/[_-]+/g, ' '),
    sections: finalSections,
    warnings,
    searchable: Boolean(text),
    quality: createQuality(finalSections, warnings, { usedFallback, extractedCharacters: text.length })
  });
}

function sectionsFromHtml(html, sourceFile) {
  const headingMatches = Array.from(String(html || '').matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi));
  return headingMatches.slice(0, 60).map((match, index) => {
    const title = stripTags(match[2]);
    if (isIgnoredHeading(title)) return null;
    const start = match.index + match[0].length;
    const end = headingMatches[index + 1]?.index ?? String(html || '').length;
    const body = stripTags(String(html || '').slice(start, end));
    return {
      id: `section-${index + 1}`,
      title,
      summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
      textPreview: trimPreview(body),
      sourceRef: `html:${sourceFile}:Abschnitt ${index + 1}`,
      wordCount: body.split(/\s+/).filter(Boolean).length,
      warnings: []
    };
  }).filter(Boolean);
}

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  extractHtmlOutline,
  stripTags,
  sectionsFromHtml
};
