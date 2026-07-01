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
      openTeacherOnSecondMonitor: false,
      saveLocalTestReports: true,
      includeDeviceNetworkData: false
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
      openTeacherOnSecondMonitor: true,
      saveLocalTestReports: true,
      includeDeviceNetworkData: false
    });
  } finally {
    cleanup();
  }
});

test('app data saves referenced json and html test reports', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ includeDeviceNetworkData: true });
    const report = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-01',
        network: [{ name: 'Ethernet', address: '192.168.1.10', mac: 'aa:bb:cc:dd:ee:ff' }]
      },
      results: {
        status: 'ok',
        checks: [{ name: 'Start', status: 'ok', details: 'Workshop geprueft' }]
      }
    }, new Date('2026-07-01T12:30:00.000Z'));

    assert.equal(fs.existsSync(report.paths.json), true);
    assert.equal(fs.existsSync(report.paths.html), true);

    const json = JSON.parse(fs.readFileSync(report.paths.json, 'utf8'));
    const html = fs.readFileSync(report.paths.html, 'utf8');

    assert.equal(json.files.json, path.basename(report.paths.json));
    assert.equal(json.files.html, path.basename(report.paths.html));
    assert.match(html, new RegExp(path.basename(report.paths.json)));
    assert.match(html, new RegExp(path.basename(report.paths.html)));
    assert.equal(json.device.network[0].mac, 'aa:bb:cc:dd:ee:ff');
    assert.equal(appData.listTestReports().length, 1);
  } finally {
    cleanup();
  }
});

test('app data omits network identifiers from test reports unless enabled', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const report = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-02',
        network: [{ name: 'WLAN', address: '10.0.0.15', mac: '11:22:33:44:55:66' }]
      },
      results: {
        status: 'ok',
        checks: []
      }
    }, new Date('2026-07-01T12:35:00.000Z'));

    const json = JSON.parse(fs.readFileSync(report.paths.json, 'utf8'));

    assert.deepEqual(json.device.network, []);
  } finally {
    cleanup();
  }
});

test('app data sorts test reports newest first and escapes html content', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ includeDeviceNetworkData: true });
    appData.saveTestReport({
      device: {
        hostname: 'CLIENT <A> & "B"',
        network: [{ name: 'LAN <1>', address: '10.0.0.1', mac: 'aa:bb' }]
      },
      results: {
        status: 'ok',
        checks: [{ name: 'Check <1>', status: 'ok', details: 'A & B "C"' }]
      }
    }, new Date('2026-07-01T12:00:00.000Z'));
    const newer = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-NEW',
        network: [{ name: 'LAN 2', address: '10.0.0.2', mac: 'cc:dd' }]
      },
      results: {
        status: 'warnung',
        checks: [{ name: 'Neu', status: 'warnung', details: 'Spaeter erstellt' }]
      }
    }, new Date('2026-07-01T13:00:00.000Z'));

    const reports = appData.listTestReports();
    const oldHtml = fs.readFileSync(path.join(appData.testReportsDir, reports[1].files.html), 'utf8');

    assert.equal(reports.length, 2);
    assert.equal(reports[0].id, newer.id);
    assert.match(oldHtml, /CLIENT &lt;A&gt; &amp; &quot;B&quot;/);
    assert.match(oldHtml, /Check &lt;1&gt;/);
    assert.match(oldHtml, /A &amp; B &quot;C&quot;/);
  } finally {
    cleanup();
  }
});

test('app data creates a minimal test report with fallback values', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const report = appData.saveTestReport({}, new Date('2026-07-01T14:00:00.000Z'));
    const json = JSON.parse(fs.readFileSync(report.paths.json, 'utf8'));
    const html = fs.readFileSync(report.paths.html, 'utf8');

    assert.equal(json.device.hostname, 'Nicht erfasst');
    assert.deepEqual(json.device.network, []);
    assert.equal(json.results.status, 'ok');
    assert.deepEqual(json.results.checks, []);
    assert.match(html, /Nicht im Bericht enthalten/);
  } finally {
    cleanup();
  }
});
