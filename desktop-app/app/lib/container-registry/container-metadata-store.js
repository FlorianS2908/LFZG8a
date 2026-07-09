const path = require('path');
const { ensureDir, readJson, writeJson } = require('../json-store');

function createContainerMetadataStore(dataDir) {
  const registryDir = path.join(dataDir, 'containers');
  const indexPath = path.join(registryDir, 'container-index.json');
  const archivedPath = path.join(registryDir, 'archived-containers.json');

  function readIndex() {
    ensureDir(registryDir);
    return readJson(indexPath, []);
  }

  function writeIndex(containers) {
    ensureDir(registryDir);
    writeJson(indexPath, containers);
    return containers;
  }

  function readArchived() {
    ensureDir(registryDir);
    return readJson(archivedPath, []);
  }

  function writeArchived(containers) {
    ensureDir(registryDir);
    writeJson(archivedPath, containers);
    return containers;
  }

  return {
    registryDir,
    indexPath,
    archivedPath,
    readIndex,
    writeIndex,
    readArchived,
    writeArchived
  };
}

module.exports = {
  createContainerMetadataStore
};
