const path = require('path');
const { detectFormat, createOutline } = require('./source-outline-types');
const { extractPdfOutline } = require('./pdf-outline-extractor');
const { extractPptxOutline } = require('./pptx-outline-extractor');
const { extractDocxOutline } = require('./docx-outline-extractor');
const { extractEpubOutline } = require('./epub-outline-extractor');
const { extractHtmlOutline } = require('./html-text-extractor');
const { extractTextOutline } = require('./text-outline-extractor');

function extractSourceOutline(fileInput = {}, options = {}) {
  const filePath = fileInput.path || fileInput.sourcePath || '';
  const sourceFile = fileInput.name || fileInput.originalFilename || path.basename(filePath || 'quelle');
  const format = detectFormat(sourceFile || filePath);
  try {
    if (format === 'pdf') return extractPdfOutline(filePath, { ...options, fileName: sourceFile });
    if (format === 'pptx') return extractPptxOutline(filePath, { ...options, fileName: sourceFile });
    if (format === 'docx') return extractDocxOutline(filePath, { ...options, fileName: sourceFile });
    if (format === 'epub') return extractEpubOutline(filePath, { ...options, fileName: sourceFile });
    if (format === 'html') return extractHtmlOutline(filePath, { ...options, fileName: sourceFile });
    if (['txt', 'md'].includes(format)) return extractTextOutline(filePath, { ...options, fileName: sourceFile, format });
  } catch (error) {
    return fallbackOutline(sourceFile, format, error.message);
  }
  return fallbackOutline(sourceFile, format, 'Format wird nur ueber Dateiname analysiert.');
}

function extractSourceOutlines(files = [], options = {}) {
  return files.map((file) => extractSourceOutline(file, options));
}

function fallbackOutline(sourceFile, format, warning) {
  const title = path.basename(sourceFile || 'Quelle', path.extname(sourceFile || '')).replace(/[_-]+/g, ' ');
  return createOutline({
    sourceFile,
    format,
    title,
    sections: [{
      id: 'section-fallback-1',
      title,
      summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
      textPreview: '',
      sourceRef: `${format}:${sourceFile}:Fallback`,
      wordCount: 0,
      warnings: [warning]
    }],
    warnings: [warning],
    searchable: false
  });
}

module.exports = {
  extractSourceOutline,
  extractSourceOutlines
};
