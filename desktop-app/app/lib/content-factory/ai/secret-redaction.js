const SECRET_KEYS = /authorization|api[-_]?key|openai_api_key|secret|credential|encryptedOpenAiKey/i;
const BEARER = /Bearer\s+[A-Za-z0-9._~+\/-]+/gi;
const KEY_LIKE = /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/gi;

function redactSecrets(value) {
  if (value instanceof Error) return { name: value.name, message: redactText(value.message) };
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SECRET_KEYS.test(key) ? '[REDACTED]' : redactSecrets(entry)]));
  }
  return typeof value === 'string' ? redactText(value) : value;
}

function redactText(value) {
  return String(value || '').replace(BEARER, 'Bearer [REDACTED]').replace(KEY_LIKE, '[REDACTED]');
}

module.exports = { redactSecrets, redactText };
