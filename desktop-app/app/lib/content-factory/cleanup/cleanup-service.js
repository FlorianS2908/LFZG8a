const fs = require('fs');
const path = require('path');
const { readJson, writeJson, ensureDir } = require('../../json-store');
const { createCleanupReport } = require('./cleanup-report');

function createCleanupService({ factoryDir, storage }) {
  function deleteGeneratedDraft(containerId) {
    const generated = storage.listGeneratedContainers();
    const draft = generated.find((entry) => entry.id === containerId || entry.manifest?.id === containerId);
    if (!draft?.storagePath) return createCleanupReport('deleteGeneratedDraft', { status: 'warning', skipped: [containerId], warnings: ['Draft nicht gefunden.'] });
    if (!isInside(path.join(factoryDir, 'drafts'), draft.storagePath)) {
      return createCleanupReport('deleteGeneratedDraft', { status: 'warning', skipped: [draft.storagePath], warnings: ['Pfad liegt nicht im Draft-Verzeichnis.'] });
    }
    fs.rmSync(draft.storagePath, { recursive: true, force: true });
    writeJson(storage.indexPath, generated.filter((entry) => (entry.id !== containerId && entry.manifest?.id !== containerId)));
    return createCleanupReport('deleteGeneratedDraft', { deleted: [draft.storagePath] });
  }

  function deleteLastTestDraft() {
    const generated = storage.listGeneratedContainers();
    const draft = generated[0];
    if (!draft?.id && !draft?.manifest?.id) return createCleanupReport('deleteLastTestDraft', { status: 'warning', warnings: ['Kein generated Draft vorhanden.'] });
    return deleteGeneratedDraft(draft.id || draft.manifest.id);
  }

  function clearStaging() {
    const stagingDir = path.join(factoryDir, 'staging');
    ensureDir(stagingDir);
    const deleted = fs.readdirSync(stagingDir, { withFileTypes: true }).map((entry) => path.join(stagingDir, entry.name));
    deleted.forEach((target) => {
      if (isInside(stagingDir, target)) fs.rmSync(target, { recursive: true, force: true });
    });
    return createCleanupReport('clearStaging', { deleted });
  }

  function clearOldDrafts(days = 7) {
    const cutoff = Date.now() - Number(days || 7) * 24 * 60 * 60 * 1000;
    const generated = storage.listGeneratedContainers();
    const deleted = [];
    generated.forEach((entry) => {
      const stat = entry.storagePath && fs.existsSync(entry.storagePath) ? fs.statSync(entry.storagePath) : null;
      if (stat && stat.mtimeMs < cutoff) {
        const report = deleteGeneratedDraft(entry.id || entry.manifest?.id);
        deleted.push(...report.deleted);
      }
    });
    return createCleanupReport('clearOldDrafts', { deleted });
  }

  function listStorageUsage() {
    return {
      factoryDir,
      stagingBytes: dirSize(path.join(factoryDir, 'staging')),
      draftsBytes: dirSize(path.join(factoryDir, 'drafts')),
      referenceLibraryBytes: dirSize(path.join(factoryDir, 'reference-library')),
      warnings: ['Referenzbibliothek wird niemals automatisch geloescht.']
    };
  }

  return { deleteGeneratedDraft, deleteLastTestDraft, clearStaging, clearOldDrafts, listStorageUsage };
}

function isInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = path.join(dir, entry.name);
    return sum + (entry.isDirectory() ? dirSize(full) : fs.statSync(full).size);
  }, 0);
}

module.exports = {
  createCleanupService
};
