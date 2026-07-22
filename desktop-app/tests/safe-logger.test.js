const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createSafeLogger, installBrokenPipeGuards } = require('../app/lib/safe-logger');

test('EPIPE in der Konsole unterbricht die Fachlogik nicht', () => {
  const logger = createSafeLogger({ consoleRef: { info() { const error = new Error('pipe closed'); error.code = 'EPIPE'; throw error; } } });
  let continued = false;
  assert.doesNotThrow(() => { logger.info('analysis_progress', { documentId: 'd1' }); continued = true; });
  assert.equal(continued, true);
});

test('Dateilogging entfernt Secrets und lange Dokumentinhalte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-log-')); const logPath = path.join(root, 'analysis.jsonl');
  createSafeLogger({ logPath, consoleRef: { info() {} } }).info('analysis', { apiKey: 'sk-secret', extractedContent: 'fachtext', status: 'ok' });
  const logged = fs.readFileSync(logPath, 'utf8');
  assert.match(logged, /"status":"ok"/); assert.doesNotMatch(logged, /sk-secret|fachtext/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Broken-Pipe-Guard fängt EPIPE auf Streams ab', () => {
  const stream = new EventEmitter(); installBrokenPipeGuards([stream]);
  assert.doesNotThrow(() => stream.emit('error', Object.assign(new Error('closed'), { code: 'EPIPE' })));
});
