const fs = require('fs');
const path = require('path');
const { publicReferenceMetadata } = require('./reference-metadata-service');
const { createReferenceIndexStore } = require('./reference-index-store');
const { importReferenceSource } = require('./reference-ingest-service');
const { searchReferences } = require('./reference-search-service');

function createReferenceLibraryService({ appData }) {
  const rootDir = path.join(appData.dataDir, 'content-factory', 'reference-library');
  const store = createReferenceIndexStore(rootDir);

  function ensureLibrary() {
    appData.ensureDataFiles();
    store.ensureStore();
  }

  function listReferenceSources() {
    ensureLibrary();
    return store.readIndex().sources.map(publicReferenceMetadata);
  }

  function getReferenceSource(referenceId) {
    ensureLibrary();
    const metadataPath = path.join(rootDir, 'sources', referenceId, 'metadata.json');
    return publicReferenceMetadata(store.readJson(metadataPath, null));
  }

  function importReferenceSources(input = {}) {
    ensureLibrary();
    return (input.files || []).map((file) => importReferenceSource(store, file, {
      confirmReferenceOnly: input.confirmReferenceOnly === true
    }));
  }

  function removeReferenceSource(referenceId) {
    ensureLibrary();
    const sourceDir = path.join(rootDir, 'sources', referenceId);
    if (fs.existsSync(sourceDir)) fs.rmSync(sourceDir, { recursive: true, force: true });
    store.removeSource(referenceId);
    return { removed: true, referenceId };
  }

  function getReferenceSafetyReport(referenceId) {
    ensureLibrary();
    return store.readJson(path.join(rootDir, 'sources', referenceId, 'safety-report.json'), null);
  }

  return {
    rootDir,
    ensureLibrary,
    listReferenceSources,
    getReferenceSource,
    importReferenceSources,
    removeReferenceSource,
    searchReferences: (query) => {
      ensureLibrary();
      return searchReferences(store, query);
    },
    getReferenceSafetyReport
  };
}

module.exports = {
  createReferenceLibraryService
};
