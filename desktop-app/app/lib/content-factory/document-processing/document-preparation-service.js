const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDocumentFormatStrategy } = require('./document-format-strategy');
const { readZipPackage, writeZipPackage } = require('./safe-zip-package');
const { extractSourceOutline } = require('../source-extraction/source-extractor-service');

const ZIP_FORMATS = new Set(['.xlsx', '.xlsm', '.pptx', '.docx', '.epub']);
const OLE_FORMATS = new Set(['.xls', '.ppt', '.doc']);

function prepareDocument(document = {}, options = {}) {
  const startedAt = Date.now();
  const filePath = path.resolve(document.storedFilePath || '');
  const strategy = getDocumentFormatStrategy(document.originalFileName || filePath, document.mimeType);
  if (strategy.strategy === 'unsupported') throw coded('SOURCE_TYPE_UNSUPPORTED', 'Dieses Dateiformat wird nicht unterstützt.');
  validateSignature(filePath, strategy.extension);
  const warnings = [...strategy.warnings];
  const securityActions = ['Quelldatei ausschließlich lesend geöffnet.', 'Dokumentinhalte werden als nicht vertrauenswürdige Eingabe behandelt.'];
  const providerFiles = [];
  let conversionStatus = 'not_required';
  let status = strategy.status;
  let hasMacros = false;

  if (strategy.extension === '.xlsm') {
    const converted = createMacroFreeXlsx(filePath);
    providerFiles.push({ purpose: 'sanitized-copy', localPath: converted.path, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', temporary: true, sha256: sha256(converted.path) });
    hasMacros = converted.hasMacros;
    conversionStatus = 'completed';
    warnings.push('Makros wurden aus Sicherheitsgründen nicht ausgeführt und aus der KI-Arbeitskopie entfernt.');
    status = 'ready_with_warnings';
    securityActions.push('VBA- und ActiveX-Bestandteile aus der separaten XLSX-Arbeitskopie entfernt.');
  } else if (['.html', '.htm'].includes(strategy.extension)) {
    const sanitizedPath = path.join(path.dirname(filePath), `${path.basename(filePath, strategy.extension)}.ai-safe-${crypto.randomBytes(4).toString('hex')}.html`);
    const sanitized = fs.readFileSync(filePath, 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/<(?:iframe|object|embed)\b[\s\S]*?<\/(?:iframe|object|embed)>/gi, '');
    fs.writeFileSync(sanitizedPath, sanitized, 'utf8');
    providerFiles.push({ purpose: 'converted-content', localPath: sanitizedPath, mimeType: 'text/html', temporary: true, sha256: sha256(sanitizedPath) });
    conversionStatus = 'completed'; securityActions.push('Aktive HTML-Inhalte und Eventhandler aus der KI-Arbeitskopie entfernt.');
  } else if (strategy.extension === '.epub') {
    const outline = extractSourceOutline({ name: document.originalFileName, path: filePath });
    if (!outline.searchable) throw coded('EXTRACTION_EMPTY', 'Aus dem EPUB konnten keine lesbaren Kapitel extrahiert werden.');
    const markdownPath = path.join(path.dirname(filePath), `${path.basename(filePath, '.epub')}.ai-safe-${crypto.randomBytes(4).toString('hex')}.md`);
    fs.writeFileSync(markdownPath, (outline.sections || []).map((section) => `## ${section.title}\n\n${section.textPreview || ''}`).join('\n\n'), 'utf8');
    providerFiles.push({ purpose: 'converted-content', localPath: markdownPath, mimeType: 'text/markdown', temporary: true, sha256: sha256(markdownPath) });
    conversionStatus = 'completed'; securityActions.push('EPUB-Spine extrahiert und als bereinigtes Markdown für die KI vorbereitet.');
  } else if (strategy.providerDirect) {
    providerFiles.push({ purpose: 'original', localPath: filePath, mimeType: strategy.canonicalMimeType, temporary: false, sha256: document.checksum || sha256(filePath) });
  }

  if (strategy.visualPdfUseful && strategy.extension !== '.pdf') {
    warnings.push('Keine sichere Office-zu-PDF-Konvertierungsengine verfügbar; eingebettete Bilder und Diagramme werden möglicherweise nicht vollständig ausgewertet.');
    conversionStatus = conversionStatus === 'completed' ? conversionStatus : 'unavailable';
    status = 'ready_with_warnings';
  }
  if (strategy.extension === '.epub') securityActions.push('EPUB nur als Archiv gelesen; aktive Inhalte werden nicht ausgeführt.');
  if (['.html', '.htm'].includes(strategy.extension)) securityActions.push('HTML-Skripte und Eventhandler werden nicht ausgeführt.');

  return {
    documentId: document.id || document.documentId,
    detectedFormat: strategy.format,
    strategy: strategy.strategy,
    status,
    conversionStatus,
    hasMacros,
    originalFile: { name: document.originalFileName, mimeType: strategy.canonicalMimeType || document.mimeType, size: Number(document.fileSize || fs.statSync(filePath).size), sha256: document.checksum || sha256(filePath) },
    providerFiles,
    warnings,
    securityActions,
    preparedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    strategyVersion: 1
  };
}

function createMacroFreeXlsx(sourcePath) {
  const entries = readZipPackage(sourcePath);
  if (!entries.some((entry) => entry.name === 'xl/workbook.xml')) throw coded('DOCUMENT_CORRUPT', 'Die XLSM-Datei enthält keine gültige Excel-Arbeitsmappe.');
  const hasMacros = entries.some((entry) => /(^|\/)(vbaProject\.bin|activeX\/|ctrlProps\/|customUI\/)/i.test(entry.name));
  const cleaned = entries.filter((entry) => !/(^|\/)(vbaProject\.bin|activeX\/|ctrlProps\/|customUI\/)/i.test(entry.name)).map((entry) => {
    if (entry.name === '[Content_Types].xml') {
      const text = entry.data.toString('utf8')
        .replace(/application\/vnd\.ms-excel\.sheet\.macroEnabled\.main\+xml/g, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml')
        .replace(/<Override[^>]+PartName="\/(?:xl\/vbaProject\.bin|xl\/activeX\/[^\"]+|customUI\/[^\"]+)"[^>]*\/>/gi, '');
      return { ...entry, data: Buffer.from(text, 'utf8') };
    }
    if (/\.rels$/i.test(entry.name)) return { ...entry, data: Buffer.from(entry.data.toString('utf8').replace(/<Relationship\b[^>]+(?:vbaProject|activeX|ctrlProp|customUI)[^>]*\/>/gi, ''), 'utf8') };
    return entry;
  });
  const targetPath = path.join(path.dirname(sourcePath), `${path.basename(sourcePath, path.extname(sourcePath))}.ai-safe-${crypto.randomBytes(4).toString('hex')}.xlsx`);
  const temporaryPath = `${targetPath}.tmp`;
  writeZipPackage(temporaryPath, cleaned);
  fs.renameSync(temporaryPath, targetPath);
  const validation = readZipPackage(targetPath);
  if (!validation.some((entry) => entry.name === 'xl/workbook.xml') || validation.some((entry) => /vbaProject\.bin/i.test(entry.name))) {
    fs.rmSync(targetPath, { force: true });
    throw coded('CONVERSION_FAILED', 'Die makrofreie XLSX-Arbeitskopie konnte nicht validiert werden.');
  }
  return { path: targetPath, hasMacros };
}

function validateSignature(filePath, extension) {
  const header = fs.readFileSync(filePath).subarray(0, 8);
  if (ZIP_FORMATS.has(extension) && !(header[0] === 0x50 && header[1] === 0x4b)) throw coded('DOCUMENT_FORMAT_MISMATCH', 'Dateiendung und tatsächlicher ZIP-/Office-Inhalt stimmen nicht überein.');
  if (OLE_FORMATS.has(extension) && !header.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) throw coded('DOCUMENT_FORMAT_MISMATCH', 'Dateiendung und tatsächlicher Office-Inhalt stimmen nicht überein.');
  if (extension === '.pdf' && header.subarray(0, 5).toString('ascii') !== '%PDF-') throw coded('DOCUMENT_FORMAT_MISMATCH', 'Dateiendung und PDF-Signatur stimmen nicht überein.');
  if (['.txt', '.md', '.html', '.htm', '.json', '.xml'].includes(extension) && header.includes(0)) throw coded('DOCUMENT_FORMAT_MISMATCH', 'Die Textdatei enthält Binärdaten.');
  if (ZIP_FORMATS.has(extension)) readZipPackage(filePath);
}

function cleanupPreparedFiles(preparation = {}) {
  for (const file of preparation.providerFiles || []) if (file.temporary && file.localPath) fs.rmSync(file.localPath, { force: true });
}
function sha256(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { prepareDocument, createMacroFreeXlsx, cleanupPreparedFiles, validateSignature };
