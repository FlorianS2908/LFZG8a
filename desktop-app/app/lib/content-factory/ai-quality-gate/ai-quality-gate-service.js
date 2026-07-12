const crypto = require('crypto');
const { PROMPT_VERSION } = require('./prompt-quality-types');
const legacyLinter = require('./prompt-linter');
const { runPromptReviews } = require('./prompt-review-service');
const contractPromptBuilder = require('../ai/prompts/prompt-builder');
const contractPromptLinter = require('../ai/prompts/prompt-linter');
const { evaluatePrompt } = require('../ai/prompts/prompt-evaluation-service');

function buildPrompt(purpose, input = {}) {
  return contractPromptBuilder.buildPrompt(purpose, input);
}

function runPromptQualityGate(input = {}) {
  const promptId = input.promptId || input.prompt?.promptId || stablePromptId(input);
  const promptVersion = input.promptVersion || input.prompt?.promptVersion || PROMPT_VERSION;
  const contractLint = contractPromptLinter.lintPrompt({ ...input, promptId, promptVersion });
  const legacyLint = legacyLinter.lintPrompt({ ...input, promptId, promptVersion });
  const lintResult = mergeLintResults(contractLint, legacyLint);
  const evaluation = evaluatePrompt({ ...input, promptId, promptVersion }, lintResult);
  const reviews = runPromptReviews({ ...input, promptId, promptVersion }, lintResult);
  const reviewErrors = reviews.filter((review) => review.status === 'failed').map((review) => review.message);
  const reviewWarnings = reviews.filter((review) => review.status === 'warning').map((review) => review.message);
  const errors = Array.from(new Set([...(lintResult.errors || []), ...reviewErrors]));
  const warnings = Array.from(new Set([...(lintResult.warnings || []), ...reviewWarnings]));
  const status = errors.length ? 'failed' : warnings.length ? 'warning' : 'passed';
  return {
    status,
    score: Math.max(0, lintResult.score - reviewErrors.length * 10 - reviewWarnings.length * 4),
    promptId,
    promptVersion,
    checks: lintResult.checks,
    evaluation,
    completenessScore: evaluation.completenessScore,
    didacticScore: evaluation.didacticScore,
    safetyScore: evaluation.safetyScore,
    schemaScore: evaluation.schemaScore,
    artifactScore: evaluation.artifactScore,
    totalScore: evaluation.totalScore,
    level: evaluation.level,
    reviews,
    warnings,
    errors,
    recommendations: Array.from(new Set([...(lintResult.recommendations || []), ...warnings])),
    maySendToProvider: errors.length === 0
  };
}

function createAiMeta({ provider, model = '', purpose, promptQuality, fallbackUsed = false, qualityGateBlockedProvider = false, reviewUsed = false, repairUsed = false, schemaValid = true, outputReview = null, warnings = [] }) {
  return {
    provider,
    model,
    purpose,
    promptId: promptQuality?.promptId || stablePromptId({ purpose }),
    promptVersion: promptQuality?.promptVersion || PROMPT_VERSION,
    promptScore: promptQuality?.totalScore ?? promptQuality?.score ?? 0,
    promptStatus: promptQuality?.status || 'failed',
    promptQualityStatus: promptQuality?.status || 'failed',
    promptQualityScore: promptQuality?.score || 0,
    promptEvaluation: promptQuality?.evaluation || null,
    qualityGateBlockedProvider,
    fallbackUsed,
    reviewUsed,
    repairUsed,
    schemaValid,
    outputReviewStatus: outputReview?.status || 'warning',
    outputReviewScore: outputReview?.score || 0,
    warnings: Array.from(new Set([...(promptQuality?.warnings || []), ...(outputReview?.warnings || []), ...warnings].filter(Boolean)))
  };
}

function mergeLintResults(primary, secondary) {
  const checks = [...(primary.checks || []), ...(secondary.checks || [])];
  const errors = Array.from(new Set([...(primary.errors || []), ...(secondary.errors || [])]));
  const warnings = Array.from(new Set([...(primary.warnings || []), ...(secondary.warnings || [])]));
  return {
    status: errors.length ? 'failed' : warnings.length ? 'warning' : 'passed',
    score: Math.min(primary.score ?? 0, secondary.score ?? 0),
    checks,
    errors,
    warnings,
    recommendations: Array.from(new Set([...(primary.recommendations || []), ...(secondary.recommendations || [])])),
    maySendToProvider: errors.length === 0
  };
}

function schemaForPurpose(purpose) {
  if (purpose === 'generateCurriculumPlan') return 'CurriculumPlanDraftPartial';
  if (purpose === 'generateArtifactSuggestions') return 'ArtifactSuggestions';
  if (purpose === 'generateArtifactContent') return 'ArtifactContent';
  if (purpose === 'repairInvalidJson') return 'ValidJsonObject';
  return 'DayGenerationResult';
}

function safeObject(value) {
  return JSON.parse(JSON.stringify(value || {}, (key, item) => {
    if (/apiKey|secret|token/i.test(key)) return undefined;
    if (/rawText|textPreview|chunk|original/i.test(key)) return undefined;
    if (typeof item === 'string' && item.length > 600) return `${item.slice(0, 600)}...`;
    return item;
  }));
}

function stablePromptId(input = {}) {
  const purpose = input.purpose || 'unknown';
  return `${purpose}-${crypto.createHash('sha1').update(purpose).digest('hex').slice(0, 8)}`;
}

module.exports = {
  buildPrompt,
  runPromptQualityGate,
  createAiMeta,
  schemaForPurpose,
  safeObject
};
