const path = require('path');
const crypto = require('crypto');
const { defaultReferencePolicy } = require('./reference-types');

function createReferenceId(originalFilename) {
  const base = path.basename(String(originalFilename || 'reference')).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'reference';
  return `ref-${base}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function createReferenceMetadata(fileInput, referenceId, sourcePath, now = new Date()) {
  const originalFilename = fileInput.originalFilename || fileInput.name || path.basename(fileInput.path || sourcePath || '');
  const extension = path.extname(originalFilename).slice(1).toLowerCase();
  return {
    id: referenceId,
    title: fileInput.title || path.basename(originalFilename, path.extname(originalFilename)),
    author: fileInput.author || '',
    publisher: fileInput.publisher || '',
    year: fileInput.year || '',
    format: extension,
    originalFilename,
    sourcePath,
    ...defaultReferencePolicy,
    licenseNotes: fileInput.licenseNotes || '',
    containsWatermark: false,
    containsPersonalData: false,
    searchable: false,
    warnings: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

function publicReferenceMetadata(metadata) {
  if (!metadata) return null;
  const { sourcePath, ...safe } = metadata;
  return safe;
}

module.exports = {
  createReferenceId,
  createReferenceMetadata,
  publicReferenceMetadata
};
