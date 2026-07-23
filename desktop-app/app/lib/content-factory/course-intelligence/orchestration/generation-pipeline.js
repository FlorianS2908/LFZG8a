'use strict';

const { assertProvider } = require('../providers/provider-contract');
const { toCourseForgeError } = require('../errors/course-forge-errors');
const { createGenerationAudit } = require('../observability/generation-audit');

function createGenerationPipeline({ provider, clock = () => new Date(), idGenerator = defaultId, logger = console } = {}) {
  assertProvider(provider);
  return Object.freeze({
    async execute(command = {}) {
      const operationId = command.operationId || idGenerator('operation');
      const requestId = idGenerator('request');
      const startedAt = clock().toISOString();
      const request = {
        operationId,
        requestId,
        model: command.model || provider.model || '',
        messages: command.compiledPrompt.messages,
        responseSchema: command.responseSchema || { name: command.compiledPrompt.schemaName },
        timeout: command.timeout,
        abortSignal: command.abortSignal,
        metadata: { ...(command.metadata || {}), promptId: command.compiledPrompt.promptId, promptVersion: command.compiledPrompt.promptVersion }
      };
      try {
        const result = await provider.execute(request);
        const audit = createGenerationAudit({
          operationId,
          requestId,
          promptId: command.compiledPrompt.promptId,
          promptVersion: command.compiledPrompt.promptVersion,
          schemaVersion: request.responseSchema.version || '',
          provider: provider.name,
          model: request.model,
          startedAt,
          completedAt: clock().toISOString(),
          tokenUsage: result?.usage
        });
        logger.info?.('[GenerationPipeline]', { event: 'completed', ...audit, tokenUsage: undefined });
        return { result: result?.value ?? result, audit };
      } catch (error) {
        throw toCourseForgeError(error, { operationId, requestId });
      }
    }
  });
}

function defaultId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = { createGenerationPipeline };
