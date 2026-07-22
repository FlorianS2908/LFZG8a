const path = require('path');
const fs = require('fs');
const { detectFormat, createOutline, createQuality } = require('./source-outline-types');
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
    if (format === 'ipynb') return extractNotebookOutline(filePath, sourceFile);
  } catch (error) {
    return fallbackOutline(sourceFile, format, error.message);
  }
  return fallbackOutline(sourceFile, format, 'Format wird nur ueber Dateiname analysiert.');
}

function extractNotebookOutline(filePath, sourceFile) { const size = fs.statSync(filePath).size; if (size > 5 * 1024 * 1024) return fallbackOutline(sourceFile, 'ipynb', 'Notebook ist für die sichere lokale Extraktion größer als 5 MB.'); const notebook = JSON.parse(fs.readFileSync(filePath, 'utf8')); const sections = (notebook.cells || []).filter((cell) => ['markdown', 'code'].includes(cell.cell_type)).slice(0, 500).map((cell, index) => { const text = (Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '')).slice(0, 20000); return { id: `cell-${index + 1}`, title: `${cell.cell_type === 'markdown' ? 'Markdown' : 'Code'}-Zelle ${index + 1}`, summary: text.slice(0, 240), textPreview: text, sourceRef: `ipynb:${sourceFile}:cell-${index + 1}`, wordCount: text.split(/\s+/).filter(Boolean).length, warnings: [] }; }); return createOutline({ sourceFile, format: 'ipynb', title: path.basename(sourceFile, path.extname(sourceFile)), sections, warnings: ['Notebook-Ausgaben und eingebettete Bilder wurden aus Sicherheitsgründen nicht übernommen.'], searchable: true, quality: createQuality(sections, [], { usedFallback: false, extractedCharacters: sections.reduce((sum, item) => sum + item.textPreview.length, 0) }) }); }

function extractSourceOutlines(files = [], options = {}) {
  return files.map((file) => extractSourceOutline(file, options));
}

function fallbackOutline(sourceFile, format, warning) {
  const title = path.basename(sourceFile || 'Quelle', path.extname(sourceFile || '')).replace(/[_-]+/g, ' ');
  const sections = [{
    id: 'section-fallback-1',
    title,
    summary: `Eigenformulierte Zusammenfassung zu ${title}.`,
    textPreview: '',
    sourceRef: `${format}:${sourceFile}:Fallback`,
    wordCount: 0,
    warnings: [warning]
  }];
  return createOutline({
    sourceFile,
    format,
    title,
    sections,
    warnings: [warning],
    searchable: false,
    quality: createQuality(sections, [warning], { usedFallback: true, extractedCharacters: 0, reason: 'Nur Dateiname/Fallback verfuegbar.' })
  });
}

module.exports = {
  extractSourceOutline,
  extractSourceOutlines
  ,extractNotebookOutline
};
