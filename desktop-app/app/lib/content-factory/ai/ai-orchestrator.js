const { LocalHeuristicProvider } = require('./local-heuristic-provider');
const { OpenAIProvider } = require('./openai-provider');
const { normalizeDayGenerationResult } = require('./output-normalizer');

class AiOrchestrator {
  constructor(options = {}) {
    this.local = options.localProvider || new LocalHeuristicProvider();
    this.openai = options.openaiProvider || new OpenAIProvider(options.openai || {});
  }

  getStatus() {
    return {
      defaultProvider: process.env.AI_PROVIDER || 'local',
      providers: {
        local: { configured: true },
        openai: { configured: this.openai.isConfigured(), model: this.openai.model || '' }
      }
    };
  }

  async generateDayDraft(input = {}, mode = 'local') {
    const requested = mode || process.env.AI_PROVIDER || 'local';
    if (requested.startsWith('openai') && this.openai.isConfigured()) {
      try {
        return normalizeDayGenerationResult(await this.openai.generateDayDraft(input));
      } catch (error) {
        const fallback = await this.local.generateDayDraft(input);
        fallback.warnings.push(`OpenAI-Fallback genutzt: ${error.message}`);
        return fallback;
      }
    }
    if (requested.startsWith('openai')) {
      const fallback = await this.local.generateDayDraft(input);
      fallback.warnings.push('OpenAI ist nicht konfiguriert. LocalHeuristicProvider wurde verwendet.');
      return fallback;
    }
    return normalizeDayGenerationResult(await this.local.generateDayDraft(input));
  }

  async generateCurriculumPlan(input = {}, mode = 'local') {
    const requested = mode || process.env.AI_PROVIDER || 'local';
    if (requested.startsWith('openai') && this.openai.isConfigured()) {
      try {
        return await this.openai.generateCurriculumPlan(input);
      } catch (error) {
        const fallback = await this.local.generateCurriculumPlan(input);
        return { ...fallback, warnings: [...(fallback.warnings || []), `OpenAI-Curriculum-Fallback genutzt: ${error.message}`] };
      }
    }
    if (requested.startsWith('openai')) {
      const fallback = await this.local.generateCurriculumPlan(input);
      return { ...fallback, warnings: [...(fallback.warnings || []), 'OpenAI ist nicht konfiguriert. Curriculum-Planung nutzt lokalen Fallback.'] };
    }
    return this.local.generateCurriculumPlan(input);
  }
}

module.exports = {
  AiOrchestrator
};
