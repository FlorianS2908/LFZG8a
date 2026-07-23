'use strict';

function createGenerationAudit(input = {}) {
  return {
    operationId: input.operationId || '',
    requestId: input.requestId || '',
    promptId: input.promptId || '',
    promptVersion: input.promptVersion || '',
    schemaVersion: input.schemaVersion || '',
    provider: input.provider || '',
    model: input.model || '',
    validationCodes: [...(input.validationCodes || [])],
    repairAttempt: Number(input.repairAttempt || 0),
    timing: { startedAt: input.startedAt || '', completedAt: input.completedAt || '' },
    tokenUsage: input.tokenUsage || null
  };
}

module.exports = { createGenerationAudit };
