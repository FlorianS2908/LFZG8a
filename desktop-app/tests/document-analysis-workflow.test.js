const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizeRetryDocumentId,
  createDocumentAnalysisPayload,
  calculateAnalysisProgress,
  bindDocumentAnalysisControls,
  createSingleFlightAnalysisStarter,
  pollAnalysisUntilTerminal
} = require('../app/renderer/tool-center/document-analysis-workflow');
const { DOCUMENT_ANALYSIS_CHANNELS } = require('../app/lib/content-factory/course-planning/analysis-ipc-contract');

function fakeButton(dataset = {}) {
  return { dataset, addEventListener(name, handler) { this[name] = handler; } };
}

test('normaler Analyseklick übergibt kein MouseEvent und Retry nur die Dokument-ID', async () => {
  const normal = fakeButton();
  const retry = fakeButton({ retryDocument: ' doc-2 ' });
  const calls = [];
  const root = { querySelector: () => normal, querySelectorAll: () => [retry] };
  bindDocumentAnalysisControls(root, (...args) => calls.push(args));
  normal.click({ type: 'click', target: normal });
  retry.click({ type: 'click', target: retry });
  assert.deepEqual(calls, [[], ['doc-2']]);
  const payload = createDocumentAnalysisPayload({ project: { id: 'kurs' }, documents: [{ id: 'doc-1' }], retryDocumentId: { type: 'click' } });
  assert.equal(payload.retryDocumentId, '');
  assert.doesNotThrow(() => structuredClone(payload));
});

test('Single-Flight-Sperre verhindert einen parallelen Doppelklick', async () => {
  let release;
  let calls = 0;
  const guarded = createSingleFlightAnalysisStarter(() => { calls += 1; return new Promise((resolve) => { release = resolve; }); });
  const first = guarded();
  const second = guarded();
  assert.equal(calls, 1);
  assert.equal(await second, undefined);
  release('fertig');
  assert.equal(await first, 'fertig');
});

test('Fortschritt zählt Erfolge Warnungen und Fehler genau einmal', () => {
  assert.deepEqual(calculateAnalysisProgress({ total: 4, completed: 1, warningCount: 1, failed: 1 }), { total: 4, processed: 3 });
});

test('Polling endet terminal, toleriert einen temporären Fehler und läuft in Timeout', async () => {
  const states = [new Error('temporär'), { status: 'running' }, { status: 'completed' }];
  const completed = await pollAnalysisUntilTerminal({ operationId: 'op-1', getProgress: async () => { const value = states.shift(); if (value instanceof Error) throw value; return value; }, sleep: async () => {}, timeoutMs: 1000 });
  assert.equal(completed.status, 'completed');
  for (const status of ['failed', 'cancelled']) {
    const terminal = await pollAnalysisUntilTerminal({ operationId: 'op', getProgress: async () => ({ status }), sleep: async () => {} });
    assert.equal(terminal.status, status);
  }
  let now = 0;
  const originalNow = Date.now;
  Date.now = () => (now += 10);
  try {
    await assert.rejects(() => pollAnalysisUntilTerminal({ operationId: 'timeout-op', getProgress: async () => ({ status: 'running' }), sleep: async () => {}, timeoutMs: 15 }), /Zeitlimit.*timeout-op/);
  } finally { Date.now = originalNow; }
  await assert.rejects(() => pollAnalysisUntilTerminal({ operationId: 'broken', getProgress: async () => { throw new Error('dauerhaft'); }, sleep: async () => {}, maxConsecutiveErrors: 2 }), /dauerhaft/);
});

test('Nicht-String-Retrywerte werden defensiv verworfen', () => {
  [{}, [], 7, null, undefined].forEach((value) => assert.equal(normalizeRetryDocumentId(value), ''));
  assert.equal(normalizeRetryDocumentId(' doc-1 '), 'doc-1');
});

test('IPC-Vertrag verwendet eindeutige serialisierbare Kanäle und Payloads', () => {
  assert.deepEqual(DOCUMENT_ANALYSIS_CHANNELS, { start: 'factory:start-document-analysis', progress: 'factory:get-analysis-progress', cancel: 'factory:cancel-ai-operation', generatePlan: 'factory:generate-structured-course-plan' });
  const payload = createDocumentAnalysisPayload({ project: { id: 'kurs', structureFrame: { valid: true } }, documents: [{ id: 'd1', storedFilePath: 'C:\\fixture.xlsm' }], retryDocumentId: '' });
  assert.deepEqual(structuredClone(payload), payload);
  assert.equal(Object.values(DOCUMENT_ANALYSIS_CHANNELS).length, new Set(Object.values(DOCUMENT_ANALYSIS_CHANNELS)).size);
  const preload = fs.readFileSync(path.join(__dirname, '..', 'app', 'preload.js'), 'utf8');
  for (const channel of Object.values(DOCUMENT_ANALYSIS_CHANNELS)) assert.ok(preload.includes(channel), channel);
});
