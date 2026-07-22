const path = require('path');

const STRATEGIES = Object.freeze({
  '.pdf': entry('pdf', 'direct_with_structured_extraction', 'application/pdf', true, true),
  '.xls': entry('spreadsheet', 'direct_with_structured_extraction', 'application/vnd.ms-excel', true),
  '.xlsx': entry('spreadsheet', 'direct_with_structured_extraction', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true),
  '.xlsm': entry('macro_spreadsheet', 'convert_then_analyze', 'application/vnd.ms-excel.sheet.macroEnabled.12', false),
  '.ppt': entry('presentation', 'direct_with_structured_extraction', 'application/vnd.ms-powerpoint', true, true),
  '.pptx': entry('presentation', 'direct_with_structured_extraction', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', true, true),
  '.doc': entry('word', 'direct_with_structured_extraction', 'application/msword', true, true),
  '.docx': entry('word', 'direct_with_structured_extraction', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true, true),
  '.epub': entry('epub', 'extract_then_analyze', 'application/epub+zip', false),
  '.md': entry('markdown', 'direct', 'text/markdown', true),
  '.txt': entry('text', 'direct', 'text/plain', true),
  '.html': entry('html', 'extract_then_analyze', 'text/html', true),
  '.htm': entry('html', 'extract_then_analyze', 'text/html', true),
  '.json': entry('text', 'direct', 'application/json', true),
  '.xml': entry('text', 'direct', 'text/xml', true),
  '.ipynb': entry('text', 'direct', 'application/json', false),
  '.png': entry('image', 'extract_then_analyze', 'image/png', false),
  '.jpg': entry('image', 'extract_then_analyze', 'image/jpeg', false),
  '.jpeg': entry('image', 'extract_then_analyze', 'image/jpeg', false)
});

function entry(format, strategy, canonicalMimeType, providerDirect, visualPdfUseful = false) {
  return Object.freeze({ format, strategy, canonicalMimeType, providerDirect, visualPdfUseful });
}

function getDocumentFormatStrategy(fileName = '', mimeType = '') {
  const extension = path.extname(String(fileName)).toLowerCase();
  const configured = STRATEGIES[extension];
  if (!configured) return { extension, format: 'unknown', strategy: 'unsupported', status: 'unsupported', canonicalMimeType: '', providerDirect: false, warnings: ['Format wird nicht unterstützt.'] };
  const warnings = [];
  if (mimeType && !mimeCompatible(extension, mimeType, configured.canonicalMimeType)) warnings.push(`Der gemeldete MIME-Type „${mimeType}“ passt nicht eindeutig zur Dateiendung ${extension}.`);
  return { extension, ...configured, status: warnings.length ? 'ready_with_warnings' : 'ready', warnings };
}

function mimeCompatible(extension, received, canonical) {
  const normalized = String(received).toLowerCase().split(';')[0].trim();
  if (!normalized || normalized === 'application/octet-stream') return true;
  if (normalized === canonical.toLowerCase()) return true;
  if (['.md', '.txt', '.html', '.htm', '.xml', '.json'].includes(extension) && /^(text\/|application\/(json|xml))/.test(normalized)) return true;
  return false;
}

module.exports = { STRATEGIES, getDocumentFormatStrategy, mimeCompatible };
