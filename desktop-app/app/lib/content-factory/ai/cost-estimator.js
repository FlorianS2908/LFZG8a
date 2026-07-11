const { MODEL_PRICING } = require('./model-pricing');

function estimateContentFactoryCost(input = {}, options = {}) {
  const model = options.model || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  const warningLimitUsd = Number(options.warningLimitUsd || process.env.CONTENT_FACTORY_COST_WARNING_USD || 1);
  const serialized = JSON.stringify({
    course: input.course,
    curriculumPlan: input.approvedCurriculumPlan || input.curriculumPlan,
    coursePlan: input.coursePlan,
    containerProfile: input.containerProfile,
    targetAudience: input.targetAudience,
    materials: (input.materials || input.uploads || []).map((file) => ({ name: file.name || file.originalFilename, size: file.size }))
  });
  const dayCount = Math.max(1, (input.approvedCurriculumPlan?.days || input.curriculumPlan?.days || input.coursePlan?.days || []).length);
  const artifactFactor = /web-and-files|files-only/i.test(input.containerProfile?.artifactMode || '') ? 12000 : 6000;
  const inputChars = serialized.length;
  const inputTokens = Math.ceil(inputChars / 4);
  const outputTokens = dayCount * artifactFactor;
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const estimatedCostUsd = roundMoney((inputTokens / 1000) * pricing.inputPer1kUsd + (outputTokens / 1000) * pricing.outputPer1kUsd);
  return {
    model,
    inputChars,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    warningLimitUsd,
    warning: estimatedCostUsd > warningLimitUsd,
    note: 'Schaetzung: 1 Token ca. 4 Zeichen. Preise sind Naeherungswerte und muessen regelmaessig geprueft werden.'
  };
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

module.exports = {
  estimateContentFactoryCost
};
