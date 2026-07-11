const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { detectFileKind, detectTargetArea, extractDayNumber, isSupportedExtension, textPreviewExtensions } = require('./file-type-rules');
const { createMappingSuggestion } = require('./mapping-service');

function createId(prefix = 'raw') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function readTextPreview(filePath, extension) {
  if (!filePath || !textPreviewExtensions.has(extension) || !fs.existsSync(filePath)) {
    return '';
  }
  const text = fs.readFileSync(filePath, 'utf8');
  return text.slice(0, 8000);
}

function createImportedRawFile(fileInput, now = new Date()) {
  const originalFilename = fileInput.originalFilename || fileInput.name || path.basename(fileInput.path || '');
  const extension = path.extname(String(originalFilename || '')).toLowerCase();
  const sourcePath = fileInput.path || fileInput.sourcePath || '';
  const warnings = [];
  const errors = [];
  let stat = null;
  let rawText = '';

  try {
    if (sourcePath && fs.existsSync(sourcePath)) {
      stat = fs.statSync(sourcePath);
      rawText = readTextPreview(sourcePath, extension);
    } else {
      warnings.push('Quelldatei konnte nicht direkt gelesen werden. Metadaten wurden uebernommen.');
    }
  } catch (error) {
    errors.push(error.message);
  }

  if (!isSupportedExtension(originalFilename)) {
    warnings.push('Dateityp ist noch nicht vollstaendig unterstuetzt und wird als Sonstiges behandelt.');
  }

  const imported = {
    id: createId(),
    originalFilename,
    filename: originalFilename,
    extension,
    mimeType: fileInput.type || '',
    size: Number(fileInput.size || stat?.size || 0),
    detectedType: detectTargetArea(originalFilename),
    fileKind: detectFileKind(originalFilename),
    rawText,
    structuredData: null,
    preview: rawText || (detectFileKind(originalFilename) === 'image' ? sourcePath : ''),
    sourcePath,
    importStatus: errors.length ? 'failed' : 'imported',
    suggestedTarget: detectTargetArea(originalFilename),
    selectedTarget: detectTargetArea(originalFilename),
    dayNumber: extractDayNumber(originalFilename),
    title: originalFilename,
    description: '',
    notes: '',
    warnings,
    errors,
    createdAt: now.toISOString(),
    mappingLocked: false
  };

  if (imported.selectedTarget === 'referenceLiterature') {
    imported.warnings.push('Referenzliteratur ist nur lokale interne Wissensquelle und wird nicht in Container exportiert.');
    imported.allowedForExport = false;
    imported.allowedForParticipant = false;
    imported.allowedForCloud = false;
    imported.usageMode = 'local-reference-only';
  }

  return {
    ...imported,
    ...createMappingSuggestion(imported)
  };
}

function importFiles(fileInputs, now = new Date()) {
  return (fileInputs || []).map((fileInput) => createImportedRawFile(fileInput, now));
}

module.exports = {
  createId,
  createImportedRawFile,
  importFiles
};
