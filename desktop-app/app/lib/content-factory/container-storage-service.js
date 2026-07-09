const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('../json-store');
const { targetAreaFolders } = require('./target-areas');
const { createSlug } = require('./manifest-service');

const containerSubdirectories = [
  'webvariants',
  'tasks',
  'solutions',
  'quizzes',
  'projects',
  'materials',
  'trainer-info',
  'participant-materials',
  'classbook',
  'reports',
  'assets',
  'styles',
  'scripts',
  'documentation',
  'other'
];

function createContainerStorageService({ dataDir, staticContainers = [] }) {
  const generatedRoot = path.join(dataDir, 'containers');
  const indexPath = path.join(generatedRoot, 'index.json');

  function ensureStorage() {
    ensureDir(generatedRoot);
    if (!readJson(indexPath, null)) {
      writeJson(indexPath, []);
    }
  }

  function listGeneratedContainers() {
    ensureStorage();
    return readJson(indexPath, []);
  }

  function listContainers() {
    return [
      ...staticContainers,
      ...listGeneratedContainers()
    ];
  }

  function loadContainer(id) {
    return listContainers().find((container) => container.id === id || container.manifest?.id === id) || null;
  }

  function routeExists(route, ignoreId = '') {
    return listContainers().some((container) => container.manifest?.id !== ignoreId && container.manifest?.route === route);
  }

  function ensureUniqueContainerId(baseValue) {
    const base = createSlug(baseValue);
    const existingIds = new Set(listContainers().map((container) => container.manifest?.id || container.id));
    if (!existingIds.has(base)) {
      return base;
    }
    let index = 1;
    let candidate = `${base}-kopie-${String(index).padStart(3, '0')}`;
    while (existingIds.has(candidate)) {
      index += 1;
      candidate = `${base}-kopie-${String(index).padStart(3, '0')}`;
    }
    return candidate;
  }

  function ensureUniqueRoute(route, ignoreId = '') {
    if (routeExists(route, ignoreId)) {
      throw new Error(`Route existiert bereits: ${route}`);
    }
    return route;
  }

  function createContainerDirectories(containerId) {
    const containerDir = path.join(generatedRoot, containerId);
    ensureDir(containerDir);
    containerSubdirectories.forEach((dirName) => ensureDir(path.join(containerDir, dirName)));
    return containerDir;
  }

  function saveContainer(container) {
    ensureStorage();
    const id = container.manifest.id;
    ensureUniqueRoute(container.manifest.route, id);
    const containerDir = createContainerDirectories(id);
    const generated = {
      ...container,
      id,
      storagePath: containerDir,
      generated: true
    };
    writeJson(path.join(containerDir, 'manifest.json'), generated.manifest);
    writeJson(path.join(containerDir, 'container.json'), generated);
    writeJson(indexPath, [
      generated,
      ...listGeneratedContainers().filter((entry) => entry.manifest.id !== id)
    ]);
    return generated;
  }

  function copyImportedFile(file, containerId) {
    const folderName = targetAreaFolders[file.selectedTarget] || 'other';
    const containerDir = createContainerDirectories(containerId);
    const targetDir = path.join(containerDir, folderName);
    const targetPath = path.join(targetDir, path.basename(file.originalFilename || file.filename));
    if (file.sourcePath && fs.existsSync(file.sourcePath)) {
      fs.copyFileSync(file.sourcePath, targetPath);
      return targetPath;
    }
    return file.sourcePath || '';
  }

  function updateContainerStatus(containerId, status, now = new Date()) {
    const generated = listGeneratedContainers();
    const container = generated.find((entry) => entry.manifest.id === containerId);
    if (!container) {
      throw new Error('Container wurde nicht gefunden oder ist geschuetzt.');
    }
    const updated = {
      ...container,
      status,
      manifest: {
        ...container.manifest,
        status,
        updatedAt: now.toISOString()
      }
    };
    writeJson(path.join(updated.storagePath, 'manifest.json'), updated.manifest);
    writeJson(path.join(updated.storagePath, 'container.json'), updated);
    writeJson(indexPath, [
      updated,
      ...generated.filter((entry) => entry.manifest.id !== containerId)
    ]);
    return updated;
  }

  return {
    generatedRoot,
    indexPath,
    ensureStorage,
    listContainers,
    listGeneratedContainers,
    loadContainer,
    routeExists,
    saveContainer,
    copyImportedFile,
    updateContainerStatus,
    ensureUniqueContainerId,
    ensureUniqueRoute
  };
}

module.exports = {
  containerSubdirectories,
  createContainerStorageService
};
