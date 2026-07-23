const fs = require('fs');
const path = require('path');

function loadAppEnv(projectRoot = process.cwd()) {
  const dotenv = loadDotEnvFile(projectRoot);
  const read = (key, fallback = '') => {
    if (process.env[key] !== undefined && process.env[key] !== '') return { value: process.env[key], source: 'process.env' };
    if (dotenv[key] !== undefined && dotenv[key] !== '') return { value: dotenv[key], source: 'dotenv' };
    return { value: fallback, source: 'missing' };
  };
  const provider = read('AI_PROVIDER', 'local');
  const apiKey = read('OPENAI_API_KEY', '');
  const model = read('OPENAI_MODEL', 'gpt-5.4-mini');
  const timeout = read('OPENAI_TIMEOUT_MS', '90000');
  const maxPrompt = read('OPENAI_MAX_PROMPT_CHARS', '40000');
  const costWarning = readWithLegacy(read, 'COURSEFORGE_COST_WARNING_USD', 'CONTENT_FACTORY_COST_WARNING_USD', '1.00');
  const review = readWithLegacy(read, 'COURSEFORGE_AI_REVIEW', 'CONTENT_FACTORY_AI_REVIEW', 'false');
  return {
    aiProvider: normalizeProvider(provider.value),
    openAiConfigured: Boolean(apiKey.value),
    openAiModel: model.value || 'gpt-5.4-mini',
    openAiKeySource: apiKey.value ? apiKey.source : 'missing',
    timeoutMs: numberOr(timeout.value, 90000),
    maxPromptChars: numberOr(maxPrompt.value, 40000),
    costWarningUsd: numberOr(costWarning.value, 1),
    aiReview: /^true$/i.test(String(review.value || 'false')),
    keySource: apiKey.value ? apiKey.source : 'missing'
  };
}

function readWithLegacy(read, primary, legacy, fallback) {
  const current = read(primary, '');
  return current.value !== '' ? current : read(legacy, fallback);
}

function applyAppEnv(projectRoot = process.cwd()) {
  const dotenv = loadDotEnvFile(projectRoot);
  Object.entries(dotenv).forEach(([key, value]) => {
    if ((process.env[key] === undefined || process.env[key] === '') && key !== 'OPENAI_API_KEY') process.env[key] = value;
  });
  return loadAppEnv(projectRoot);
}

function loadDotEnvFile(projectRoot = process.cwd()) {
  const dotenvPath = path.join(projectRoot, '.env');
  return fs.existsSync(dotenvPath) ? parseEnvFile(fs.readFileSync(dotenvPath, 'utf8')) : {};
}

function getOpenAiApiKey(projectRoot = process.cwd()) {
  if (process.env.OPENAI_API_KEY) return { value: process.env.OPENAI_API_KEY, source: 'process.env' };
  const dotenv = loadDotEnvFile(projectRoot);
  if (dotenv.OPENAI_API_KEY) return { value: dotenv.OPENAI_API_KEY, source: 'dotenv' };
  return { value: '', source: 'missing' };
}

function parseEnvFile(content = '') {
  return String(content).split(/\r?\n/).reduce((values, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return values;
    const index = trimmed.indexOf('=');
    if (index < 0) return values;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
    return values;
  }, {});
}

function normalizeProvider(value) {
  return String(value || 'local').toLowerCase().startsWith('openai') ? 'openai' : 'local';
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

module.exports = {
  loadAppEnv,
  applyAppEnv,
  loadDotEnvFile,
  getOpenAiApiKey,
  parseEnvFile
};
