const crypto = require('crypto');

const OPERATION_STATUSES = Object.freeze(['queued', 'running', 'waiting-for-user', 'retrying', 'cancelling', 'cancelled', 'completed', 'completed-with-warnings', 'failed', 'interrupted']);
const TERMINAL_STATUSES = new Set(['cancelled', 'completed', 'completed-with-warnings', 'failed', 'interrupted']);
const TRANSITIONS = Object.freeze({
  queued: ['running', 'cancelling', 'cancelled', 'failed', 'interrupted'],
  running: ['waiting-for-user', 'retrying', 'cancelling', 'completed', 'completed-with-warnings', 'failed', 'interrupted'],
  'waiting-for-user': ['running', 'cancelling', 'cancelled', 'failed', 'interrupted'],
  retrying: ['running', 'cancelling', 'failed', 'interrupted'],
  cancelling: ['cancelled', 'failed', 'interrupted'],
  interrupted: ['queued', 'retrying', 'cancelled'],
  cancelled: [], completed: [], 'completed-with-warnings': [], failed: ['queued', 'retrying']
});

function createOperationEngine({ load = () => [], persist = () => {}, now = () => new Date().toISOString() } = {}) {
  const operations = new Map();
  const idempotency = new Map();
  for (const stored of load() || []) restore(stored);

  function restore(value) {
    const operation = normalize(value);
    if (!TERMINAL_STATUSES.has(operation.status)) {
      operation.status = operation.resumable ? 'interrupted' : 'failed';
      operation.error = operation.resumable ? null : { code: 'OPERATION_NOT_RESUMABLE', message: 'Der unterbrochene Vorgang kann erneut gestartet werden.' };
      operation.finishedAt = operation.resumable ? null : now();
    }
    operations.set(operation.operationId, operation);
    if (operation.idempotencyKey && !TERMINAL_STATUSES.has(operation.status)) idempotency.set(operation.idempotencyKey, operation.operationId);
    return clone(operation);
  }

  function create(input = {}) {
    if (!input.operationType || !input.courseProjectId) throw operationError('OPERATION_INPUT_INVALID', 'Operationstyp und Kursprojekt sind erforderlich.');
    const key = input.idempotencyKey || stableKey(input);
    const existingId = idempotency.get(key);
    const existing = existingId && operations.get(existingId);
    if (existing && !TERMINAL_STATUSES.has(existing.status)) return { operation: clone(existing), reused: true };
    const timestamp = now();
    const operation = normalize({ ...input, operationId: input.operationId || crypto.randomUUID(), idempotencyKey: key, status: 'queued', createdAt: timestamp, lastActivityAt: timestamp });
    operations.set(operation.operationId, operation); idempotency.set(key, operation.operationId); flush(operation);
    return { operation: clone(operation), reused: false };
  }

  function transition(operationId, status, patch = {}) {
    const operation = requireOperation(operationId);
    if (!OPERATION_STATUSES.includes(status)) throw operationError('OPERATION_STATUS_INVALID', `Unbekannter Operationsstatus: ${status}`);
    if (operation.status !== status && !TRANSITIONS[operation.status].includes(status)) throw operationError('OPERATION_TRANSITION_INVALID', `Übergang ${operation.status} → ${status} ist nicht erlaubt.`);
    const timestamp = now();
    Object.assign(operation, patch, { status, lastActivityAt: timestamp });
    if (status === 'running' && !operation.startedAt) operation.startedAt = timestamp;
    if (TERMINAL_STATUSES.has(status)) { operation.finishedAt = timestamp; idempotency.delete(operation.idempotencyKey); }
    flush(operation); return clone(operation);
  }

  function checkpoint(operationId, value, progress = undefined) {
    const operation = requireOperation(operationId);
    if (TERMINAL_STATUSES.has(operation.status)) throw operationError('OPERATION_TERMINAL', 'Ein abgeschlossener Vorgang kann nicht mehr aktualisiert werden.');
    operation.checkpoint = clone(value); if (progress !== undefined) operation.progress = Math.max(0, Math.min(100, Number(progress) || 0));
    operation.lastActivityAt = now(); flush(operation); return clone(operation);
  }
  function get(operationId) { const value = operations.get(operationId); return value ? clone(value) : null; }
  function list(courseProjectId) { return [...operations.values()].filter((item) => !courseProjectId || item.courseProjectId === courseProjectId).map(clone); }
  function flush(operation) { persist(clone(operation)); }
  function requireOperation(id) { const value = operations.get(id); if (!value) throw operationError('OPERATION_NOT_FOUND', 'Der Vorgang wurde nicht gefunden.'); return value; }
  return { create, transition, checkpoint, get, list, restore };
}

function normalize(value = {}) { return { operationId: '', operationType: '', courseProjectId: '', parentOperationId: null, targetType: null, targetId: null, phase: 'queued', status: 'queued', progress: 0, currentItem: 0, totalItems: 0, message: '', createdAt: '', startedAt: null, lastActivityAt: '', finishedAt: null, retryCount: 0, maxRetries: 2, checkpoint: null, resumable: false, cancellable: true, metrics: {}, error: null, ...clone(value) }; }
function stableKey(value) { return crypto.createHash('sha256').update(JSON.stringify([value.operationType, value.courseProjectId, value.targetType || '', value.targetId || '', value.inputSignature || ''])).digest('hex'); }
function operationError(code, message) { const error = new Error(message); error.code = code; return error; }
function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }

module.exports = { createOperationEngine, OPERATION_STATUSES, TERMINAL_STATUSES, TRANSITIONS, stableKey };
