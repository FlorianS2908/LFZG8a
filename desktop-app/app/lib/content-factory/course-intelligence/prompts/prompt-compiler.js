'use strict';

function compilePrompt(contract, input) {
  const payload = {
    promptId: contract.id,
    promptVersion: contract.version,
    schema: contract.schemaName,
    rules: [...contract.rules],
    input: clone(input)
  };
  return Object.freeze({
    promptId: contract.id,
    promptVersion: contract.version,
    schemaName: contract.schemaName,
    messages: Object.freeze([
      Object.freeze({ role: 'system', content: contract.system }),
      Object.freeze({ role: 'user', content: JSON.stringify(payload) })
    ])
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

module.exports = { compilePrompt };
