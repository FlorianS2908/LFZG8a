const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { createAppData, defaultSettings } = require('../app/lib/app-data');

function createTempAppData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-app-data-'));
  return {
    appData: createAppData(dir),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

test('app data creates default settings and empty history', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();

    assert.deepEqual(appData.getSettings(), defaultSettings);
    assert.deepEqual(appData.listHistory(), []);
  } finally {
    cleanup();
  }
});

test('app data can disable history file creation for wizard tests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-app-data-'));
  const appData = createAppData(dir, { disableHistory: true });

  try {
    appData.ensureDataFiles();

    assert.equal(fs.existsSync(appData.settingsPath), true);
    assert.equal(fs.existsSync(appData.historyPath), false);
    assert.deepEqual(appData.listHistory(), []);
    assert.deepEqual(appData.addHistoryEntry({ title: 'Test' }), []);
    assert.equal(fs.existsSync(appData.historyPath), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('app data saves setup without losing existing settings', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ monitorIndex: 2 });
    const settings = appData.saveSettings({ openTeacherOnSecondMonitor: false });

    assert.deepEqual(settings, {
      configured: true,
      monitorIndex: 2,
      openTeacherOnSecondMonitor: false
    });
  } finally {
    cleanup();
  }
});

test('app data adds newest history entries first and keeps a maximum of 500 entries', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    for (let index = 0; index < 505; index += 1) {
      appData.addHistoryEntry(
        { type: 'lesson', title: `Eintrag ${index}` },
        new Date(2026, 0, 1, 12, 0, index)
      );
    }

    const history = appData.listHistory();
    assert.equal(history.length, 500);
    assert.equal(history[0].title, 'Eintrag 504');
    assert.equal(history[499].title, 'Eintrag 5');
  } finally {
    cleanup();
  }
});

test('app data resets only history and keeps settings untouched', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ monitorIndex: 1 });
    appData.addHistoryEntry({ type: 'teacher-info', title: 'Dozenteninfo' });
    appData.resetHistory();

    assert.deepEqual(appData.listHistory(), []);
    assert.deepEqual(appData.getSettings(), {
      configured: true,
      monitorIndex: 1,
      openTeacherOnSecondMonitor: true
    });
  } finally {
    cleanup();
  }
});
