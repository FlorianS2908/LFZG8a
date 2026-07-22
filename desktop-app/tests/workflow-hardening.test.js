const test = require('node:test');
const assert = require('node:assert/strict');
const { createOperationEngine, OPERATION_STATUSES } = require('../app/lib/content-factory/operations/operation-engine');
const { normalizeCollaboration, buildAiUnderstanding, validateRanges, revisePlanTarget, diffPlans } = require('../app/lib/content-factory/course-planning/collaboration-model');
const { API_VERSION, DOCUMENT_ANALYSIS_CHANNELS, IPC_CONTRACTS } = require('../app/lib/content-factory/course-planning/analysis-ipc-contract');
const { resolveWorkflowFeatureFlags } = require('../app/lib/content-factory/course-planning/workflow-feature-flags');

test('operation engine validates transitions and persists terminal state', () => {
  const persisted = []; const engine = createOperationEngine({ persist: (value) => persisted.push(value) });
  const created = engine.create({ operationType: 'document-analysis', courseProjectId: 'course-1', targetType: 'document', targetId: 'doc-1' });
  assert.equal(created.operation.status, 'queued');
  assert.equal(engine.transition(created.operation.operationId, 'running').status, 'running');
  assert.equal(engine.checkpoint(created.operation.operationId, { segment: 2 }, 50).progress, 50);
  assert.equal(engine.transition(created.operation.operationId, 'completed').finishedAt !== null, true);
  assert.throws(() => engine.transition(created.operation.operationId, 'running'), (error) => error.code === 'OPERATION_TRANSITION_INVALID');
  assert.equal(persisted.at(-1).status, 'completed');
  assert.ok(OPERATION_STATUSES.includes('waiting-for-user'));
});

test('operation engine deduplicates active work and reconstructs interruptions', () => {
  const engine = createOperationEngine(); const input = { operationType: 'planning', courseProjectId: 'course-1', inputSignature: 'analysis-v1' };
  const first = engine.create(input); const second = engine.create(input);
  assert.equal(second.reused, true); assert.equal(second.operation.operationId, first.operation.operationId);
  const restored = createOperationEngine({ load: () => [{ ...first.operation, status: 'running', resumable: true }] });
  assert.equal(restored.get(first.operation.operationId).status, 'interrupted');
});

test('collaboration defaults to guided and exposes compact AI understanding', () => {
  const project = normalizeCollaboration({ id: 'course-1', structureFrame: { totalDays: 2, totalUnits: 16, unitsPerDay: 8, unitDurationMinutes: 45 }, uploadedDocuments: [{ id: 'doc-1', originalFileName: 'Plan.xlsm', declaredCategory: 'course-plan', bindingLevel: 'binding', selectedRanges: [] }], documentAnalyses: [{ topics: ['Netzwerke'], prerequisites: ['IPv4'], conflicts: [{ blocking: true }] }] });
  assert.equal(project.interactionMode, 'guided');
  const result = buildAiUnderstanding(project);
  assert.equal(result.courseDuration.totalDays, 2); assert.deepEqual(result.bindingSources, ['doc-1']); assert.equal(result.requiresConfirmation, true);
  assert.equal(JSON.stringify(result).includes('storedFilePath'), false);
});

test('ranges, locks, targeted revisions and plan diffs are deterministic', () => {
  assert.equal(validateRanges([{ type: 'pages', from: 2, to: 4 }], 10).valid, true);
  assert.equal(validateRanges([{ type: 'pages', from: 4, to: 2 }], 10).errors[0].code, 'DOCUMENT_RANGE_INVALID');
  const plan = { days: [{ dayNumber: 1, units: [{ id: 'ue-1', topic: 'Alt' }, { id: 'ue-2', topic: 'Fest' }] }] };
  const revised = revisePlanTarget(plan, { targetType: 'unit', targetId: 'ue-1', replacement: { topic: 'Neu' }, instruction: 'Praxisnäher' }, [{ targetType: 'unit', targetId: 'ue-2' }]);
  assert.equal(revised.days[0].units[0].topic, 'Neu'); assert.equal(revised.days[0].units[1].topic, 'Fest'); assert.equal(diffPlans(plan, revised).changedUnits, 1);
  assert.throws(() => revisePlanTarget(plan, { targetType: 'unit', targetId: 'ue-2', replacement: {} }, [{ targetType: 'unit', targetId: 'ue-2' }]), (error) => error.code === 'PLAN_TARGET_LOCKED');
});

test('versioned IPC registry defines every collaboration channel', () => {
  assert.equal(API_VERSION, 2);
  for (const name of ['aiUnderstanding', 'collaboration', 'reviseTarget', 'restoreVersion']) {
    assert.equal(IPC_CONTRACTS[name].channel, DOCUMENT_ANALYSIS_CHANNELS[name]); assert.equal(IPC_CONTRACTS[name].permission, 'admin');
  }
});

test('feature flags have safe project-local defaults', () => {
  const flags = resolveWorkflowFeatureFlags({ targetedRevision: false });
  assert.equal(flags.aiUnderstanding, true); assert.equal(flags.targetedRevision, false); assert.equal(flags.artifactPersistence, false);
});
