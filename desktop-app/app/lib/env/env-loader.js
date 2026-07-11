const fs = require('fs');
const path = require('path');

function loadAppEnv(projectRoot = process.cwd()) {
  const dotenvPath = path.join(projectRoot, '.env');
  const dotenv = fs.existsSync(dotenvPath) ? parseEnvFile(fs.readFileSync(dotenvPath, 'utf8')) : {};
  const read = (key, fallback = '') => {
    if (process.env[key] !== undefined && process.env[key] !== '') return { value: process.env[key], source: 'env' };
    if (dotenv[key] !== undefined && dotenv[key] !== '') return { value: dotenv[key], source: 'dotenv' };
    return { value: fallback, source: 'missing' };
  };
  const provider = read('AI_PROVIDER', 'local');
  const apiKey = read('OPENAI_API_KEY', '');
  const model = read('OPENAI_MODEL', 'gpt-5.4-mini');
  const timeout = read('OPENAI_TIMEOUT_MS', '30000');
  const maxPrompt = read('OPENAI_MAX_PROMPT_CHARS', '40000');
  const costWarning = read('CONTENT_FACTORY_COST_WARNING_USD', '1.00');
  const review = read('CONTENT_FACTORY_AI_REVIEW', 'false');
  return {
    aiProvider: normalizeProvider(provider.value),
    openAiConfigured: Boolean(apiKey.value),
    openAiModel: model.value || 'gpt-5.4-mini',
    timeoutMs: numberOr(timeout.value, 30000),
    maxPromptChars: numberOr(maxPrompt.value, 40000),
    costWarningUsd: numberOr(costWarning.value, 1),
    aiReview: /^true$/i.test(String(review.value || 'false')),
    keySource: apiKey.value ? apiKey.source : 'missing'
  };
}

function applyAppEnv(projectRoot = process.cwd()) {
  const dotenvPath = path.join(projectRoot, '.env');
  const dotenv = fs.existsSync(dotenvPath) ? parseEnvFile(fs.readFileSync(dotenvPath, 'utf8')) : {};
  Object.entries(dotenv).forEach(([key, value]) => {
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value;
  });
  return loadAppEnv(projectRoot);
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
  parseEnvFile
};
