const fs = require('fs');
const path = require('path');
const { buildPrompt } = require('../prompt-builder');
const { lintPrompt } = require('../prompt-linter');

const fixtureDir = path.join(__dirname, 'fixtures');
const expectedDir = path.join(__dirname, 'expected');

function runGoldenPromptTests() {
  return fs.readdirSync(fixtureDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => runGoldenPromptTest(file.replace(/\.json$/, '')));
}

function runGoldenPromptTest(name) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, `${name}.json`), 'utf8'));
  const expected = JSON.parse(fs.readFileSync(path.join(expectedDir, `${name}.expected.json`), 'utf8'));
  const prompt = buildPrompt('generateDayDraft', fixture);
  const lint = lintPrompt(prompt);
  const serialized = JSON.stringify(prompt);
  const payloadSerialized = JSON.stringify(prompt.userPayload || {});
  const missing = (expected.mustContain || []).filter((needle) => !new RegExp(escapeRegExp(needle), 'i').test(serialized));
  const forbidden = (expected.mustNotContain || []).filter((needle) => new RegExp(escapeRegExp(needle), 'i').test(payloadSerialized));
  const passed = lint.status !== 'failed' && missing.length === 0 && forbidden.length === 0;
  return {
    name,
    status: passed ? 'passed' : 'failed',
    promptId: prompt.promptId,
    promptVersion: prompt.promptVersion,
    score: lint.score,
    missing,
    forbidden,
    warnings: lint.warnings
  };
}

function summarizeGoldenPromptTests(results = runGoldenPromptTests()) {
  return {
    status: results.every((item) => item.status === 'passed') ? 'passed' : 'failed',
    passed: results.filter((item) => item.status === 'passed').length,
    total: results.length,
    results
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  runGoldenPromptTests,
  runGoldenPromptTest,
  summarizeGoldenPromptTests
};
