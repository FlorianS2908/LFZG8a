const path = require('path');
const { createOutline, trimPreview, createQuality, isIgnoredHeading } = require('./source-outline-types');
const { readZipTextEntries, xmlText } = require('./zip-xml-reader');

function extractEpubOutline(filePath, options = {}) {
  const sourceFile = path.basename(filePath || options.fileName || 'buch.epub');
  const warnings = ['EPUB wird nur als analysis/reference-only Quelle genutzt.'];
  let entries = [];
  try {
    entries = readZipTextEntries(filePath, '.*\\.(opf|xhtml|html|htm|xml)$');
  } catch (error) {
    warnings.push(`EPUB konnte nicht vollstaendig gelesen werden: ${error.message}`);
  }
  const chapterEntries = orderEpubEntries(entries);
  const ranges = normalizeRanges(options.ranges || []);
  const sections = chapterEntries.slice(0, 120).map((entry, index) => {
    const chapter = index + 1;
    const html = entry.Text || '';
    const heading = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html)?.[1];
    const title = cleanTitle(xmlText(heading || path.basename(entry.FullName, path.extname(entry.FullName)))) || `Kapitel ${chapter}`;
    const text = xmlText(html);
    return {
      id: `chapter-${chapter}`,
      title,
      summary: `Eigenformulierte Zusammenfassung zu Kapitel ${chapter}: ${title}.`,
      pageNumber: chapter,
      chapter: String(chapter),
      textPreview: trimPreview(text),
      sourceRef: `epub:${sourceFile}:Kapitel ${chapter}`,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      warnings: isIgnoredHeading(title) ? ['Kapitelueberschrift ist vermutlich nicht fachlich.'] : []
    };
  }).filter((section) => !isIgnoredHeading(section.title))
    .filter((section) => !ranges.length || ranges.some((range) => section.pageNumber >= range.from && section.pageNumber <= range.to));
  if (!sections.length) warnings.push('Keine lesbaren EPUB-Kapitel im gewaehlten Bereich gefunden.');
  return createOutline({
    sourceFile,
    format: 'epub',
    title: path.basename(sourceFile, '.epub').replace(/[_-]+/g, ' '),
    sections,
    warnings,
    searchable: sections.length > 0,
    quality: createQuality(sections, warnings, {
      usedFallback: !sections.length,
      extractedCharacters: sections.reduce((sum, section) => sum + String(section.textPreview || '').length, 0),
      reason: sections.length >= 2 ? 'Kapitelstruktur aus EPUB erkannt.' : 'EPUB-Struktur nur teilweise erkannt.'
    })
  });
}

function orderEpubEntries(entries) {
  const byName = new Map(entries.map((entry) => [entry.FullName, entry]));
  const container = entries.find((entry) => /META-INF\/container\.xml$/i.test(entry.FullName));
  const opfPath = /full-path="([^"]+)"/i.exec(container?.Text || '')?.[1];
  const opf = opfPath ? byName.get(opfPath) : entries.find((entry) => /\.opf$/i.test(entry.FullName));
  if (!opf) return htmlEntries(entries);
  const manifest = new Map(Array.from(String(opf.Text || '').matchAll(/<item\b[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*>/gi))
    .map((match) => [match[1], resolveEpubPath(opf.FullName, match[2])]));
  const ordered = Array.from(String(opf.Text || '').matchAll(/<itemref\b[^>]*idref="([^"]+)"[^>]*>/gi))
    .map((match) => manifest.get(match[1]))
    .map((name) => byName.get(name))
    .filter(Boolean)
    .filter((entry) => /\.(xhtml|html|htm)$/i.test(entry.FullName));
  return ordered.length ? ordered : htmlEntries(entries);
}

function htmlEntries(entries) {
  return entries.filter((entry) => /\.(xhtml|html|htm)$/i.test(entry.FullName)).sort((a, b) => a.FullName.localeCompare(b.FullName));
}

function resolveEpubPath(opfPath, href) {
  const base = path.posix.dirname(opfPath.replace(/\\/g, '/'));
  return path.posix.normalize(path.posix.join(base, href)).replace(/^\.\//, '');
}

function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeRanges(ranges) {
  return (ranges || []).map((range) => ({
    from: Math.max(1, Number(range.from || 1)),
    to: Math.max(Number(range.from || 1), Number(range.to || range.from || 1))
  }));
}

module.exports = {
  extractEpubOutline,
  orderEpubEntries
};
