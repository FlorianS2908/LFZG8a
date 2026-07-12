const promptContractShape = {
  id: '',
  version: '',
  purpose: '',
  description: '',
  requiredInputs: [],
  expectedOutputSchema: '',
  mustIncludeRules: [],
  mustNotIncludeRules: [],
  didacticRules: [],
  safetyRules: [],
  artifactRules: [],
  qualityRubric: [],
  examples: [],
  antiExamples: []
};

function validatePromptContract(contract = {}) {
  const errors = [];
  ['id', 'version', 'purpose', 'expectedOutputSchema'].forEach((key) => {
    if (!contract[key]) errors.push(`Prompt Contract ${key} fehlt.`);
  });
  ['requiredInputs', 'mustIncludeRules', 'mustNotIncludeRules', 'didacticRules', 'safetyRules', 'artifactRules', 'qualityRubric', 'examples', 'antiExamples'].forEach((key) => {
    if (!Array.isArray(contract[key])) errors.push(`Prompt Contract ${key} muss eine Liste sein.`);
  });
  return { valid: errors.length === 0, errors };
}

module.exports = {
  promptContractShape,
  validatePromptContract
};
