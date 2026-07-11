const crypto = require('crypto');
const { PROMPT_VERSION } = require('./prompt-quality-types');
const { lintPrompt } = require('./prompt-linter');
const { runPromptReviews } = require('./prompt-review-service');

function buildPrompt(purpose, input = {}) {
  const promptId = `${purpose.replace(/([A-Z])/g, '-$1').toLowerCase()}-v1`;
  const expectedSchema = schemaForPurpose(purpose);
  const targetAudience = input.targetAudience || input.curriculumPlan?.targetAudience || {};
  const containerProfile = input.containerProfile || {};
  const prompt = {
    promptId,
    promptVersion: PROMPT_VERSION,
    purpose,
    expectedSchema,
    rules: [
      'Antworte ausschliesslich als JSON.',
      'Pflichtfelder gemaess expectedSchema befuellen.',
      'Teilnehmerbereich enthaelt keine Loesungen.',
      'Loesungen nur in solutions/dozent/teacher.',
      'Keine Originaltexte, rawText, textPreview oder Referenzchunks uebernehmen.',
      'Keine Secrets, API-Keys oder Tokens verwenden.',
      'EXE/BAT/CMD/PS1 ausschliessen und SQL nie automatisch ausfuehren.',
      'Java-Einsteiger nicht automatisch auf Maven zwingen.',
      'Draw.io fuer Diagramme bevorzugen.',
      'ageRange/Zielgruppenalter, priorKnowledge, learningLevel, difficultyMode, needsStepByStep, examOrientation und projectOrientation beachten.'
    ],
    course: safeObject(input.course || input.curriculumPlan?.course || {}),
    targetAudience: safeObject(targetAudience),
    containerProfile: safeObject(containerProfile),
    day: safeObject(input.day || {}),
    payloadKeys: Object.keys(input || {}),
    expectedOutput: expectedSchema,
    output: { format: 'json-only', schema: expectedSchema }
  };
  return {
    purpose,
    prompt,
    promptId,
    promptVersion: PROMPT_VERSION,
    expectedSchema,
    course: prompt.course,
    targetAudience: prompt.targetAudience,
    containerProfile: prompt.containerProfile,
    aiMode: input.aiMode || 'local'
  };
}

function runPromptQualityGate(input = {}) {
  const promptId = input.promptId || input.prompt?.promptId || stablePromptId(input);
  const promptVersion = input.promptVersion || input.prompt?.promptVersion || PROMPT_VERSION;
  const lintResult = lintPrompt({ ...input, promptId, promptVersion });
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
    promptQualityStatus: promptQuality?.status || 'failed',
    promptQualityScore: promptQuality?.score || 0,
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
