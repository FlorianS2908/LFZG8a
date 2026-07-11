const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('../../json-store');

function createCurriculumReviewStore(rootDir) {
  const indexPath = path.join(rootDir, 'index.json');

  function ensureStore() {
    ensureDir(rootDir);
    if (!readJson(indexPath, null)) writeJson(indexPath, []);
  }

  function listDrafts() {
    ensureStore();
    return readJson(indexPath, []);
  }

  function saveDraft(draft, artifacts = {}) {
    ensureStore();
    const draftDir = path.join(rootDir, draft.id);
    ensureDir(draftDir);
    writeJson(path.join(draftDir, 'anchor.json'), draft.anchor);
    writeJson(path.join(draftDir, 'extracted-outline.json'), artifacts.outline || []);
    writeJson(path.join(draftDir, 'curriculum-plan.json'), draft);
    writeJson(path.join(draftDir, 'analysis-report.json'), artifacts.analysisReport || {});
    if (!fs.existsSync(path.join(draftDir, 'review-history.json'))) writeJson(path.join(draftDir, 'review-history.json'), []);
    writeJson(indexPath, [
      summarizeDraft(draft, draftDir),
      ...listDrafts().filter((entry) => entry.id !== draft.id)
    ]);
    return draft;
  }

  function getDraft(draftId) {
    ensureStore();
    return readJson(path.join(rootDir, draftId, 'curriculum-plan.json'), null);
  }

  function appendHistory(draftId, entry) {
    const historyPath = path.join(rootDir, draftId, 'review-history.json');
    const history = readJson(historyPath, []);
    writeJson(historyPath, [{ ...entry, createdAt: new Date().toISOString() }, ...history]);
  }

  function removeDraft(draftId) {
    ensureStore();
    const draftDir = path.join(rootDir, draftId);
    if (fs.existsSync(draftDir)) fs.rmSync(draftDir, { recursive: true, force: true });
    writeJson(indexPath, listDrafts().filter((entry) => entry.id !== draftId));
    return { removed: true, draftId };
  }

  return {
    rootDir,
    ensureStore,
    listDrafts,
    saveDraft,
    getDraft,
    appendHistory,
    removeDraft
  };
}

function summarizeDraft(draft, draftDir) {
  return {
    id: draft.id,
    courseName: draft.course?.courseName || '',
    courseId: draft.course?.courseId || '',
    anchorType: draft.anchor?.type || '',
    status: draft.status,
    dayCount: draft.days?.length || 0,
    updatedAt: new Date().toISOString(),
    storagePath: draftDir
  };
}

module.exports = {
  createCurriculumReviewStore
};
