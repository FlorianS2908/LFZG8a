const { getPromptContract } = require('./contracts');
const { normalizeDidacticProfile } = require('../../didactics/didactic-profile-service');
const { normalizeDifficulty, expandDifficulty } = require('../../difficulty-levels');

const maxStringLength = 1000;
const blockedKeyPattern = /apiKey|secret|token|OPENAI|rawText|originalText|original|chunk|chunks|textPreview/i;
const blockedPathPattern = /reference-library|chunks\.json|extracted\.json/i;

function buildPrompt(purpose, input = {}) {
  const contract = getPromptContract(purpose);
  const payload = buildUserPayload(contract, input);
  const didacticProfile = payload.didacticProfile || normalizeDidacticProfile(input.didacticProfile || input.curriculumPlan?.didacticProfile);
  return {
    purpose,
    promptId: contract.id,
    promptVersion: contract.version,
    expectedSchema: contract.expectedOutputSchema,
    contract: contractSummary(contract),
    systemPrompt: buildSystemPrompt(contract),
    developerRules: buildDeveloperRules(contract, input),
    userPayload: payload,
    prompt: {
      promptId: contract.id,
      promptVersion: contract.version,
      purpose,
      expectedSchema: contract.expectedOutputSchema,
      rules: [
        ...contract.mustIncludeRules,
        ...contract.mustNotIncludeRules,
        ...contract.didacticRules,
        ...contract.safetyRules,
        ...contract.artifactRules
      ],
      course: payload.course || {},
      targetAudience: payload.targetAudience || {},
      containerProfile: payload.containerProfile || {},
      didacticProfile,
      day: payload.day || {},
      payloadKeys: Object.keys(payload || {}),
      expectedOutput: contract.expectedOutputSchema,
      output: { format: 'json-only', schema: contract.expectedOutputSchema }
    },
    aiMode: input.aiMode || 'local'
  };
}

function buildSystemPrompt(contract) {
  return [
    'Du bist kein freier Textgenerator.',
    `Du arbeitest nach Prompt Contract ${contract.id} Version ${contract.version}.`,
    `Zweck: ${contract.purpose}.`,
    'Gib ausschliesslich valides JSON nach expectedOutputSchema zurueck.',
    'Erfinde keine Quellen, Fundstellen oder Originaltexte.'
  ].join('\n');
}

function buildDeveloperRules(contract, input = {}) {
  return {
    contractId: contract.id,
    contractVersion: contract.version,
    expectedSchema: contract.expectedOutputSchema,
    requiredInputs: contract.requiredInputs,
    mustIncludeRules: contract.mustIncludeRules,
    mustNotIncludeRules: contract.mustNotIncludeRules,
    didacticRules: contract.didacticRules,
    safetyRules: contract.safetyRules,
    artifactRules: contract.artifactRules,
    qualityRubric: contract.qualityRubric,
    targetAudienceSignals: sanitizePromptPayload(input.targetAudience || input.curriculumPlan?.targetAudience || {}),
    containerProfileSignals: sanitizePromptPayload(input.containerProfile || {}),
    didacticProfileSignals: sanitizePromptPayload(normalizeDidacticProfile(input.didacticProfile || input.curriculumPlan?.didacticProfile))
  };
}

function buildUserPayload(contract, input = {}) {
  const sanitized = sanitizePromptPayload(input);
  const targetAudience = sanitized.targetAudience || sanitized.curriculumPlan?.targetAudience || {};
  const difficultyMode = normalizeDifficulty(targetAudience.difficultyMode);
  return {
    contractId: contract.id,
    contractVersion: contract.version,
    purpose: contract.purpose,
    expectedOutputSchema: contract.expectedOutputSchema,
    course: sanitized.course || sanitized.curriculumPlan?.course || {},
    day: sanitized.day || {},
    learningGoals: sanitized.learningGoals || sanitized.day?.learningGoals || sanitized.curriculumPlan?.learningGoals || [],
    targetAudience: { ...targetAudience, difficultyMode, difficultyLevels: expandDifficulty(difficultyMode) },
    containerProfile: sanitized.containerProfile || {},
    didacticProfile: normalizeDidacticProfile(sanitized.didacticProfile || sanitized.curriculumPlan?.didacticProfile),
    artifactSuggestions: sanitized.artifactSuggestions || [],
    sourceRefs: sanitized.sourceRefs || sanitized.day?.sourceRefs || [],
    input: sanitized
  };
}

function sanitizePromptPayload(input) {
  return JSON.parse(JSON.stringify(input || {}, (key, value) => {
    if (blockedKeyPattern.test(key)) return undefined;
    if (typeof value === 'string') {
      if (blockedPathPattern.test(value)) return undefined;
      return value.length > maxStringLength ? `${value.slice(0, maxStringLength)}...` : value;
    }
    return value;
  }));
}

function contractSummary(contract) {
  return {
    id: contract.id,
    version: contract.version,
    purpose: contract.purpose,
    expectedOutputSchema: contract.expectedOutputSchema,
    requiredInputs: contract.requiredInputs,
    qualityRubric: contract.qualityRubric
  };
}

module.exports = {
  buildPrompt,
  buildSystemPrompt,
  buildDeveloperRules,
  buildUserPayload,
  sanitizePromptPayload
};
