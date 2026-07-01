const path = require('path');
const fs = require('fs');
const { ensureDir, readJson, writeJson } = require('./json-store');

const defaultSettings = {
  configured: false,
  monitorIndex: 1,
  openTeacherOnSecondMonitor: true,
  saveLocalTestReports: true,
  includeDeviceNetworkData: false
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugDate(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function createTestReportHtml(report) {
  const checks = report.results.checks.map((check) => (
    `<tr><td>${escapeHtml(check.name)}</td><td>${escapeHtml(check.status)}</td><td>${escapeHtml(check.details || '')}</td></tr>`
  )).join('');
  const networkRows = report.device.network.length
    ? report.device.network.map((item) => (
      `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.address || '-')}</td><td>${escapeHtml(item.mac || '-')}</td></tr>`
    )).join('')
    : '<tr><td colspan="3">Nicht im Bericht enthalten.</td></tr>';

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>LFZQ8a Testprotokoll ${escapeHtml(report.createdAt)}</title>
  <style>
    body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#173248;background:#f3f8fb;line-height:1.5}
    header{background:#003964;color:#fff;padding:1.5rem}
    main{padding:1.5rem;display:grid;gap:1rem}
    section{background:#fff;border:1px solid #d8e8ee;border-radius:8px;padding:1rem}
    h1,h2{margin:.1rem 0 .6rem}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #d8e8ee;padding:.55rem;text-align:left;vertical-align:top}
    th{color:#003964}
    .status{display:inline-block;padding:.25rem .5rem;border-radius:999px;background:#e8fbff;color:#003964;font-weight:800}
    code{background:#eef8fb;padding:.15rem .35rem;border-radius:4px}
  </style>
</head>
<body>
  <header>
    <h1>LFZQ8a Testprotokoll</h1>
    <p>Erstellt am ${escapeHtml(report.createdAt)} - Status <span class="status">${escapeHtml(report.results.status)}</span></p>
  </header>
  <main>
    <section>
      <h2>Referenzen</h2>
      <p>JSON-Datei: <code>${escapeHtml(report.files.json)}</code></p>
      <p>HTML-Datei: <code>${escapeHtml(report.files.html)}</code></p>
    </section>
    <section>
      <h2>Testergebnisse</h2>
      <table><thead><tr><th>Pruefung</th><th>Status</th><th>Details</th></tr></thead><tbody>${checks}</tbody></table>
    </section>
    <section>
      <h2>Geraete- und Netzwerkdaten</h2>
      <p>Rechnername: ${escapeHtml(report.device.hostname)}</p>
      <table><thead><tr><th>Adapter</th><th>IP-Adresse</th><th>MAC-Adresse</th></tr></thead><tbody>${networkRows}</tbody></table>
    </section>
  </main>
</body>
</html>`;
}

function createAppData(baseDir, options = {}) {
  const disableHistory = options.disableHistory === true;
  const dataDir = path.join(baseDir, 'data');
  const settingsPath = path.join(dataDir, 'settings.json');
  const historyPath = path.join(dataDir, 'history.json');
  const testReportsDir = path.join(dataDir, 'testprotokolle');

  function ensureDataFiles() {
    ensureDir(dataDir);
    if (!readJson(settingsPath, null)) {
      writeJson(settingsPath, defaultSettings);
    }
    if (!disableHistory && !readJson(historyPath, null)) {
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
    if (disableHistory) {
      return [];
    }
    return readJson(historyPath, []);
  }

  function addHistoryEntry(entry, now = new Date()) {
    ensureDataFiles();
    if (disableHistory) {
      return [];
    }
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
    if (disableHistory) {
      return [];
    }
    writeJson(historyPath, []);
    return [];
  }

  function saveTestReport(reportInput, now = new Date()) {
    ensureDataFiles();
    ensureDir(testReportsDir);

    const id = `testlauf-${slugDate(now)}`;
    const jsonFileName = `${id}.json`;
    const htmlFileName = `${id}.html`;
    const settings = getSettings();
    const report = {
      id,
      createdAt: now.toISOString(),
      files: {
        json: jsonFileName,
        html: htmlFileName
      },
      device: {
        hostname: reportInput.device?.hostname || 'Nicht erfasst',
        network: settings.includeDeviceNetworkData ? (reportInput.device?.network || []) : []
      },
      results: {
        status: reportInput.results?.status || 'ok',
        checks: reportInput.results?.checks || []
      }
    };

    const jsonPath = path.join(testReportsDir, jsonFileName);
    const htmlPath = path.join(testReportsDir, htmlFileName);
    writeJson(jsonPath, report);
    fs.writeFileSync(htmlPath, createTestReportHtml(report), 'utf8');

    return {
      ...report,
      paths: {
        json: jsonPath,
        html: htmlPath
      }
    };
  }

  function listTestReports() {
    ensureDataFiles();
    ensureDir(testReportsDir);
    return fs.readdirSync(testReportsDir)
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => readJson(path.join(testReportsDir, fileName), null))
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  return {
    dataDir,
    settingsPath,
    historyPath,
    testReportsDir,
    ensureDataFiles,
    getSettings,
    saveSettings,
    listHistory,
    addHistoryEntry,
    resetHistory,
    saveTestReport,
    listTestReports
  };
}

module.exports = {
  createAppData,
  defaultSettings
};
