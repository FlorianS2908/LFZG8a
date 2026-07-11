const fs = require('fs');
const path = require('path');
const { supportedReferenceExtensions } = require('./reference-types');
const { createReferenceId, createReferenceMetadata, publicReferenceMetadata } = require('./reference-metadata-service');
const { extractText } = require('./reference-extractor');
const { createChunks } = require('./reference-chunker');
const { createSafetyReport } = require('./reference-safety-service');
const { ensureDir } = require('./reference-index-store');

function importReferenceSource(store, fileInput, options = {}, now = new Date()) {
  if (options.confirmReferenceOnly !== true) {
    throw new Error('Import blockiert: Bitte bestaetigen Sie die interne reference-only Nutzung.');
  }

  const originalFilename = fileInput.originalFilename || fileInput.name || path.basename(fileInput.path || '');
  const extension = path.extname(originalFilename).toLowerCase();
  if (!supportedReferenceExtensions.has(extension)) {
    throw new Error(`Dateityp fuer Referenzbibliothek nicht unterstuetzt: ${extension || 'ohne Erweiterung'}`);
  }

  store.ensureStore();
  const referenceId = createReferenceId(originalFilename);
  const sourceDir = path.join(store.rootDir, 'sources', referenceId);
  const originalDir = path.join(sourceDir, 'original');
  ensureDir(originalDir);

  const storedOriginalPath = path.join(originalDir, originalFilename);
  if (fileInput.path && fs.existsSync(fileInput.path)) {
    fs.copyFileSync(fileInput.path, storedOriginalPath);
  } else {
    fs.writeFileSync(storedOriginalPath, '', 'utf8');
  }

  const metadata = createReferenceMetadata(fileInput, referenceId, storedOriginalPath, now);
  const extraction = extractText(storedOriginalPath, metadata.format);
  const chunks = createChunks(extraction, metadata);
  const safetyReport = createSafetyReport(metadata, extraction, chunks);
  const updatedMetadata = {
    ...metadata,
    searchable: extraction.searchable && chunks.length > 0,
    containsWatermark: safetyReport.personalWatermarkDetected,
    containsPersonalData: safetyReport.personalWatermarkDetected,
    warnings: [...metadata.warnings, ...extraction.warnings, ...safetyReport.warnings],
    updatedAt: now.toISOString()
  };

  store.writeJson(path.join(sourceDir, 'metadata.json'), updatedMetadata);
  store.writeJson(path.join(sourceDir, 'extracted.json'), {
    searchable: updatedMetadata.searchable,
    textLength: extraction.text.length,
    sections: extraction.sections.map((section) => ({
      sectionTitle: section.sectionTitle,
      pageNumber: section.pageNumber ?? null,
      textLength: String(section.text || '').length
    })),
    warnings: extraction.warnings
  });
  store.writeJson(path.join(sourceDir, 'chunks.json'), chunks);
  store.writeJson(path.join(sourceDir, 'safety-report.json'), safetyReport);
  store.saveSource(updatedMetadata);

  return {
    metadata: publicReferenceMetadata(updatedMetadata),
    safetyReport,
    chunkCount: chunks.length
  };
}

module.exports = {
  importReferenceSource
};
