'use strict';

function assertProvider(provider) {
  if (!provider || typeof provider.execute !== 'function') {
    throw new TypeError('Ein Provider muss execute(request) implementieren.');
  }
  return provider;
}

function createLegacyProviderAdapter(provider) {
  if (provider?.execute) return provider;
  if (!provider || typeof provider.generateStructuredCoursePlan !== 'function') {
    return assertProvider(provider);
  }
  return {
    name: provider.name || 'legacy',
    model: provider.model || '',
    execute(request) {
      return provider.generateStructuredCoursePlan(request.metadata.input, {
        signal: request.abortSignal,
        timeoutMs: request.timeout
      });
    }
  };
}

module.exports = { assertProvider, createLegacyProviderAdapter };
