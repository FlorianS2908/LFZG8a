const path = require('path');

function detectFormat(filePathOrName = '') {
  const extension = path.extname(String(filePathOrName)).toLowerCase();
  return {
    '.pdf': 'pdf',
    '.epub': 'epub',
    '.pptx': 'pptx',
    '.docx': 'docx',
    '.txt': 'txt',
    '.md': 'md',
    '.html': 'html',
    '.htm': 'html'
    ,'.ipynb': 'ipynb'
  }[extension] || 'unknown';
}

function createOutline({ sourceFile, format, title, sections = [], warnings = [], searchable = true, quality = null, pageOrSlideCount = null }) {
  const normalizedSections = sections.map((section, index) => ({
    id: section.id || `section-${index + 1}`,
    title: section.title || `Abschnitt ${index + 1}`,
    summary: section.summary || `Eigene Kurzbeschreibung zu ${section.title || `Abschnitt ${index + 1}`}.`,
    pageNumber: section.pageNumber || null,
    slideNumber: section.slideNumber || null,
    chapter: section.chapter || '',
    textPreview: trimPreview(section.textPreview || ''),
    sourceRef: section.sourceRef || `${format}:${sourceFile}:Abschnitt ${index + 1}`,
    wordCount: Number(section.wordCount || 0),
    warnings: section.warnings || []
  }));
  return {
    sourceFile,
    format,
    title,
    sections: normalizedSections,
    warnings,
    searchable,
    pageOrSlideCount: pageOrSlideCount == null ? normalizedSections.length : Number(pageOrSlideCount),
    quality: quality || createQuality(normalizedSections, warnings)
  };
}

function trimPreview(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function createQuality(sections = [], warnings = [], options = {}) {
  const extractedCharacters = Number(options.extractedCharacters || sections.reduce((sum, section) => sum + String(section.textPreview || '').length, 0));
  const sectionCount = sections.length;
  const usedFallback = Boolean(options.usedFallback || warnings.some((warning) => /fallback|dateiname|nicht gelesen|kein lesbarer/i.test(String(warning))));
  const structuredCount = sections.filter((section) => (
    section.slideNumber || section.pageNumber || section.chapter || !/^Abschnitt \d+$/i.test(section.title || '')
  )).length;
  let score = 0.15;
  if (extractedCharacters > 120) score += 0.2;
  if (extractedCharacters > 800) score += 0.15;
  if (sectionCount > 1) score += 0.2;
  if (sectionCount > 4) score += 0.1;
  if (structuredCount >= Math.max(1, Math.ceil(sectionCount * 0.6))) score += 0.15;
  if (usedFallback) score -= 0.25;
  if (warnings.length) score -= Math.min(0.15, warnings.length * 0.03);
  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  const level = score >= 0.75 ? 'high' : score >= 0.45 ? 'medium' : 'low';
  const reason = options.reason || (
    usedFallback ? 'Fallback oder unsichere Struktur verwendet.'
      : level === 'high' ? 'Mehrere strukturierte Abschnitte erkannt.'
        : level === 'medium' ? 'Text erkannt, Struktur teilweise unsicher.'
          : 'Nur geringe Struktur oder wenig Text erkannt.'
  );
  return {
    score,
    level,
    reason,
    usedFallback,
    extractedCharacters,
    sectionCount
  };
}

function isIgnoredHeading(value) {
  const normalized = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return !normalized || ['inhalt', 'agenda', 'quellen', 'quelle', 'danke', 'uebung', 'ubung', 'loesung', 'losung', 'solution'].includes(normalized);
}

module.exports = {
  detectFormat,
  createOutline,
  trimPreview,
  createQuality,
  isIgnoredHeading
};
