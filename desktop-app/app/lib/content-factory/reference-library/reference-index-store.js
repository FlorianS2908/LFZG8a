const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function createReferenceIndexStore(rootDir) {
  const indexPath = path.join(rootDir, 'index.json');

  function ensureStore() {
    ensureDir(path.join(rootDir, 'sources'));
    ensureDir(path.join(rootDir, 'reports'));
    if (!fs.existsSync(indexPath)) writeJson(indexPath, { version: 1, sources: [] });
  }

  function readIndex() {
    ensureStore();
    return readJson(indexPath, { version: 1, sources: [] });
  }

  function saveSource(metadata) {
    const index = readIndex();
    index.sources = [metadata, ...index.sources.filter((source) => source.id !== metadata.id)];
    writeJson(indexPath, index);
    return metadata;
  }

  function removeSource(referenceId) {
    const index = readIndex();
    index.sources = index.sources.filter((source) => source.id !== referenceId);
    writeJson(indexPath, index);
  }

  return {
    rootDir,
    ensureStore,
    readIndex,
    saveSource,
    removeSource,
    readJson,
    writeJson
  };
}

module.exports = {
  createReferenceIndexStore,
  ensureDir,
  readJson,
  writeJson
};
