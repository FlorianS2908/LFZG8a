const os = require('os');
const path = require('path');
const { ensureDir, writeJson } = require('./json-store');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCpuSnapshot() {
  return os.cpus().map((cpu) => ({ ...cpu.times }));
}

function calculateCpuUsage(start, end) {
  const usages = end.map((current, index) => {
    const previous = start[index] || current;
    const idle = current.idle - previous.idle;
    const total = Object.keys(current).reduce((sum, key) => sum + (current[key] - previous[key]), 0);
    return total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
  });

  return Math.round(usages.reduce((sum, value) => sum + value, 0) / Math.max(usages.length, 1));
}

function renderSparkline(values) {
  const bars = ['_', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  if (!values.length) {
    return '';
  }

  return values.map((value) => {
    const index = Math.max(0, Math.min(bars.length - 1, Math.round((value / 100) * (bars.length - 1))));
    return bars[index];
  }).join('');
}

function collectNetworkInterfaces() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, entries]) => (
    (entries || [])
      .filter((entry) => !entry.internal)
      .map((entry) => ({
        name,
        family: entry.family,
        address: entry.address,
        mac: entry.mac,
        cidr: entry.cidr
      }))
  ));
}

async function collectSystemSamples(options = {}) {
  const sampleCount = options.sampleCount || 8;
  const intervalMs = options.intervalMs || 250;
  const samples = [];

  let previousCpu = getCpuSnapshot();
  for (let index = 0; index < sampleCount; index += 1) {
    await sleep(intervalMs);
    const nextCpu = getCpuSnapshot();
    const cpuPercent = calculateCpuUsage(previousCpu, nextCpu);
    previousCpu = nextCpu;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    samples.push({
      second: Number(((index + 1) * intervalMs / 1000).toFixed(2)),
      cpuPercent,
      memoryPercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
    });
  }

  return samples;
}

function createReportSummary(report) {
  const cpuValues = report.samples.map((sample) => sample.cpuPercent);
  const memoryValues = report.samples.map((sample) => sample.memoryPercent);
  const cpuPeak = Math.max(...cpuValues, 0);
  const memoryPeak = Math.max(...memoryValues, 0);
  const macs = report.network.map((entry) => entry.mac).filter(Boolean);
  const ips = report.network.map((entry) => entry.address).filter(Boolean);

  return [
    `Testprotokoll: ${report.id}`,
    `Zeitpunkt: ${report.createdAt}`,
    `App-Version: ${report.appVersion}`,
    `Hostname: ${report.system.hostname}`,
    `Plattform: ${report.system.platform} ${report.system.release} (${report.system.arch})`,
    `CPU: ${report.system.cpuModel}`,
    `RAM gesamt: ${report.system.totalMemoryGb} GB`,
    `Monitore: ${report.displays.length}`,
    `MAC-Adresse(n): ${macs.join(', ') || 'nicht gefunden'}`,
    `IP-Adresse(n): ${ips.join(', ') || 'nicht gefunden'}`,
    `CPU-Verlauf: ${renderSparkline(cpuValues)} Peak ${cpuPeak}%`,
    `RAM-Verlauf: ${renderSparkline(memoryValues)} Peak ${memoryPeak}%`,
    `Status: ${report.status}`
  ].join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderReportHtml(report) {
  const summary = createReportSummary(report);
  const cpuValues = report.samples.map((sample) => sample.cpuPercent);
  const memoryValues = report.samples.map((sample) => sample.memoryPercent);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>LFZQ8a Testprotokoll ${escapeHtml(report.id)}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:2rem;color:#173248;background:#f3f8fb}
    main{max-width:980px;margin:auto;background:#fff;border:1px solid #d8e8ee;border-radius:8px;padding:1.5rem}
    h1,h2{color:#003964}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
    .card{border:1px solid #d8e8ee;border-radius:8px;padding:1rem;background:#fbfdfe}
    .spark{font-family:Consolas,monospace;font-size:2rem;color:#003964;letter-spacing:.08em}
    table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #d8e8ee;text-align:left;padding:.45rem}
    code,pre{background:#0b1725;color:#e8fbff;border-radius:6px;padding:.75rem;display:block;white-space:pre-wrap}
  </style>
</head>
<body>
  <main>
    <h1>LFZQ8a Testprotokoll</h1>
    <p><strong>Status:</strong> ${escapeHtml(report.status)} | <strong>Zeitpunkt:</strong> ${escapeHtml(report.createdAt)}</p>
    <section class="grid">
      <article class="card"><h2>CPU-Verlauf</h2><div class="spark">${escapeHtml(renderSparkline(cpuValues))}</div><p>Peak: ${Math.max(...cpuValues, 0)}%</p></article>
      <article class="card"><h2>RAM-Verlauf</h2><div class="spark">${escapeHtml(renderSparkline(memoryValues))}</div><p>Peak: ${Math.max(...memoryValues, 0)}%</p></article>
    </section>
    <h2>System</h2>
    <table>
      <tr><th>Hostname</th><td>${escapeHtml(report.system.hostname)}</td></tr>
      <tr><th>Plattform</th><td>${escapeHtml(report.system.platform)} ${escapeHtml(report.system.release)} (${escapeHtml(report.system.arch)})</td></tr>
      <tr><th>CPU</th><td>${escapeHtml(report.system.cpuModel)}</td></tr>
      <tr><th>RAM</th><td>${escapeHtml(report.system.totalMemoryGb)} GB</td></tr>
      <tr><th>Monitore</th><td>${escapeHtml(report.displays.length)}</td></tr>
    </table>
    <h2>Netzwerk</h2>
    <table><tr><th>Adapter</th><th>IP</th><th>MAC</th><th>Typ</th></tr>
      ${report.network.map((entry) => `<tr><td>${escapeHtml(entry.name)}</td><td>${escapeHtml(entry.address)}</td><td>${escapeHtml(entry.mac)}</td><td>${escapeHtml(entry.family)}</td></tr>`).join('')}
    </table>
    <h2>Mail-Zusammenfassung</h2>
    <pre>${escapeHtml(summary)}</pre>
  </main>
</body>
</html>`;
}

async function createDiagnosticReport({ appVersion, displays, reportsDir, sampleOptions } = {}) {
  const samples = await collectSystemSamples(sampleOptions);
  const report = {
    id: `lfzq8a-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    createdAt: new Date().toISOString(),
    appVersion,
    status: 'OK',
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpuModel: os.cpus()[0] ? os.cpus()[0].model : 'unbekannt',
      cpuCores: os.cpus().length,
      totalMemoryGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2))
    },
    network: collectNetworkInterfaces(),
    displays: displays || [],
    samples
  };

  report.summary = createReportSummary(report);
  report.cpuSparkline = renderSparkline(samples.map((sample) => sample.cpuPercent));
  report.memorySparkline = renderSparkline(samples.map((sample) => sample.memoryPercent));

  if (reportsDir) {
    ensureDir(reportsDir);
    report.jsonPath = path.join(reportsDir, `${report.id}.json`);
    report.htmlPath = path.join(reportsDir, `${report.id}.html`);
    writeJson(report.jsonPath, report);
    require('fs').writeFileSync(report.htmlPath, renderReportHtml(report), 'utf8');
  }

  return report;
}

module.exports = {
  calculateCpuUsage,
  collectNetworkInterfaces,
  createDiagnosticReport,
  createReportSummary,
  renderReportHtml,
  renderSparkline
};
