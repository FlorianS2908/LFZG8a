'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGenerationPipeline } = require('../app/lib/content-factory/course-intelligence/orchestration/generation-pipeline');
const { createCourseGenerationService } = require('../app/lib/content-factory/course-intelligence/application/course-generation-service');
const { ProviderTimeoutError } = require('../app/lib/content-factory/course-intelligence/errors/course-forge-errors');
const { OpenAIProvider } = require('../app/lib/content-factory/ai/openai-provider');

test('Unterrichtsplanung nutzt den fachneutralen Providervertrag und verändert Eingaben nicht', async () => {
  const original = { course: { title: 'Test' }, ueScaffold: [{ id: 'u1' }] };
  const snapshot = structuredClone(original);
  let captured;
  const provider = { name: 'fake', model: 'fake-model', async execute(request) {
    captured = request;
    request.metadata.input.course.title = 'Provider-Mutation';
    return { summary: 'Plan', days: [] };
  } };
  const pipeline = createGenerationPipeline({ provider, clock: sequenceClock(), idGenerator: (prefix) => `${prefix}-fixed`, logger: { info() {} } });
  const envelope = await createCourseGenerationService({ pipeline }).generateCoursePlan(original, { timeoutMs: 1234 });
  assert.deepEqual(original, snapshot);
  assert.equal(envelope.result.summary, 'Plan');
  assert.equal(captured.operationId, 'operation-fixed');
  assert.equal(captured.requestId, 'request-fixed');
  assert.equal(captured.timeout, 1234);
  assert.equal(captured.metadata.promptId, 'course-plan');
  assert.equal(captured.metadata.promptVersion, '2.0.0');
  assert.match(captured.messages[1].content, /ueScaffold/);
  assert.equal(envelope.audit.promptId, 'course-plan');
  assert.equal(envelope.audit.provider, 'fake');
});

test('AbortSignal wird unverändert an den Provider weitergereicht', async () => {
  const controller = new AbortController();
  let receivedSignal;
  const pipeline = createGenerationPipeline({ provider: { name: 'fake', async execute(request) { receivedSignal = request.abortSignal; return {}; } }, logger: { info() {} } });
  await createCourseGenerationService({ pipeline }).generateCoursePlan({}, { signal: controller.signal });
  assert.equal(receivedSignal, controller.signal);
});

test('Providerfehler werden typisiert und mit Korrelations-IDs versehen', async () => {
  const timeout = Object.assign(new Error('secret provider detail'), { code: 'OPENAI_TIMEOUT' });
  const pipeline = createGenerationPipeline({ provider: { name: 'fake', async execute() { throw timeout; } }, idGenerator: (prefix) => `${prefix}-42`, logger: { info() {} } });
  await assert.rejects(createCourseGenerationService({ pipeline }).generateCoursePlan({}), (error) =>
    error instanceof ProviderTimeoutError && error.operationId === 'operation-42' && error.requestId === 'request-42'
    && error.safeMessage === 'Die KI-Anfrage konnte nicht abgeschlossen werden.');
});

test('OpenAI execute versendet ausschließlich den kompilierten technischen Request', async () => {
  const provider = new OpenAIProvider({ apiKey: 'test', model: 'test-model', maxRetries: 0 });
  let body;
  provider.performRequest = async (captured) => { body = JSON.parse(captured); return { ok: true }; };
  await provider.execute({ messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'payload' }], responseSchema: { name: 'Example' } });
  assert.deepEqual(body.messages, [{ role: 'system', content: 'system' }, { role: 'user', content: 'payload' }]);
  assert.equal(body.model, 'test-model');
  assert.equal(body.response_format.type, 'json_object');
  assert.doesNotMatch(JSON.stringify(body), /apiKey|localPath|OPENAI_API_KEY/);
});

function sequenceClock() {
  const values = [new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T00:00:01.000Z')];
  return () => values.shift() || new Date('2026-01-01T00:00:01.000Z');
}
