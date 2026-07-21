const { buildReviewPrompt } = require('./prompt-builder');
const { validateResult, evaluateResult } = require('../review-core');

function createReviewService({ provider, timeoutMs = 45000 }) {
  if (!provider?.review) throw new Error('Review-Provider fehlt.');
  let active = false;
  return {
    async run(input, options = {}) {
      if (active) throw new Error('Ein Review läuft bereits.');
      active = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const prompt = buildReviewPrompt(input);
        const raw = await provider.review({ ...input, prompt }, { signal: options.signal || controller.signal });
        const result = validateResult(raw, input.definition);
        return { result, evaluation: evaluateResult(result, input.definition), provider: provider.id || 'unknown' };
      } catch (error) {
        if (controller.signal.aborted) throw new Error('Review-Zeitüberschreitung. Erneut prüfen ist möglich.');
        throw error;
      } finally { clearTimeout(timer); active = false; }
    }
  };
}
module.exports = { createReviewService };
