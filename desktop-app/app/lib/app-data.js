const path = require('path');
const { ensureDir, readJson, writeJson } = require('./json-store');

const defaultSettings = {
  configured: false,
  monitorIndex: 1,
  openTeacherOnSecondMonitor: true
};

function createAppData(baseDir) {
  const dataDir = path.join(baseDir, 'data');
  const settingsPath = path.join(dataDir, 'settings.json');
  const historyPath = path.join(dataDir, 'history.json');

  function ensureDataFiles() {
    ensureDir(dataDir);
    if (!readJson(settingsPath, null)) {
      writeJson(settingsPath, defaultSettings);
    }
    if (!readJson(historyPath, null)) {
      writeJson(historyPath, []);
    }
  }

  function getSettings() {
    ensureDataFiles();
    return readJson(settingsPath, defaultSettings);
  }

  function saveSettings(nextSettings) {
    const merged = {
      ...getSettings(),
      ...nextSettings,
      configured: true
    };
    writeJson(settingsPath, merged);
    return merged;
  }

  function listHistory() {
    ensureDataFiles();
    return readJson(historyPath, []);
  }

  function addHistoryEntry(entry, now = new Date()) {
    ensureDataFiles();
    const history = listHistory();
    const nextHistory = [{
      id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
      createdAt: now.toISOString(),
      ...entry
    }, ...history].slice(0, 500);
    writeJson(historyPath, nextHistory);
    return nextHistory;
  }

  function resetHistory() {
    ensureDataFiles();
    writeJson(historyPath, []);
    return [];
  }

  return {
    dataDir,
    settingsPath,
    historyPath,
    ensureDataFiles,
    getSettings,
    saveSettings,
    listHistory,
    addHistoryEntry,
    resetHistory
  };
}

module.exports = {
  createAppData,
  defaultSettings
};
