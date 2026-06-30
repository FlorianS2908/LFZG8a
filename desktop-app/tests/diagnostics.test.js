const assert = require('node:assert/strict');
const {
  calculateCpuUsage,
  createReportSummary,
  renderReportHtml,
  renderSparkline
} = require('../app/lib/diagnostics');

test('diagnostics render readable sparklines', () => {
  assert.equal(renderSparkline([0, 25, 50, 75, 100]), '_▂▄▆█');
});

test('diagnostics calculate average cpu usage from snapshots', () => {
  const start = [
    { user: 100, nice: 0, sys: 100, idle: 800, irq: 0 },
    { user: 200, nice: 0, sys: 100, idle: 700, irq: 0 }
  ];
  const end = [
    { user: 150, nice: 0, sys: 150, idle: 900, irq: 0 },
    { user: 260, nice: 0, sys: 140, idle: 800, irq: 0 }
  ];

  assert.equal(calculateCpuUsage(start, end), 50);
});

test('diagnostics summary contains network, device and peak values', () => {
  const report = {
    id: 'lfzq8a-test',
    createdAt: '2026-06-30T12:00:00.000Z',
    appVersion: '0.1.0',
    status: 'OK',
    system: {
      hostname: 'client-01',
      platform: 'win32',
      release: '10.0',
      arch: 'x64',
      cpuModel: 'Test CPU',
      totalMemoryGb: 16
    },
    network: [
      { name: 'Ethernet', address: '192.168.1.50', mac: 'aa:bb:cc:dd:ee:ff', family: 'IPv4' }
    ],
    displays: [{ id: 1 }, { id: 2 }],
    samples: [
      { cpuPercent: 10, memoryPercent: 40 },
      { cpuPercent: 80, memoryPercent: 55 }
    ]
  };

  const summary = createReportSummary(report);
  assert.match(summary, /MAC-Adresse\(n\): aa:bb:cc:dd:ee:ff/);
  assert.match(summary, /IP-Adresse\(n\): 192.168.1.50/);
  assert.match(summary, /CPU-Verlauf: .*Peak 80%/);
  assert.match(summary, /RAM-Verlauf: .*Peak 55%/);
});

test('diagnostics html report contains escaped report content', () => {
  const html = renderReportHtml({
    id: '<test>',
    createdAt: '2026-06-30T12:00:00.000Z',
    status: 'OK',
    system: {
      hostname: '<client>',
      platform: 'win32',
      release: '10.0',
      arch: 'x64',
      cpuModel: 'Test CPU',
      totalMemoryGb: 16
    },
    network: [],
    displays: [],
    samples: [{ cpuPercent: 10, memoryPercent: 20 }]
  });

  assert.match(html, /&lt;test&gt;/);
  assert.match(html, /&lt;client&gt;/);
});
