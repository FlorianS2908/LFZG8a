const { LocalHeuristicProvider } = require('./local-heuristic-provider');
const { OpenAIProvider } = require('./openai-provider');
const { normalizeDayGenerationResult } = require('./output-normalizer');
const { validateDayGenerationResult, validateCurriculumPlanPartial } = require('./schemas');

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
        const normalized = normalizeDayGenerationResult(await this.openai.generateDayDraft(input));
        const validation = validateDayGenerationResult(normalized);
        if (!validation.valid) throw new Error(`Ungueltige KI-Ausgabe: ${validation.errors.join(', ')}`);
        return normalized;
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

  async generateAllDayDrafts(input = {}, mode = 'local') {
    const plan = input.approvedCurriculumPlan || input.curriculumPlan;
    if (!plan || plan.status !== 'approved') {
      throw new Error('Alle-Tage-Generierung ist erst nach Curriculum-Freigabe moeglich.');
    }
    const results = [];
    for (const day of plan.days || []) {
      try {
        const courseDay = input.toCourseDay ? input.toCourseDay(day) : day;
        const result = await this.generateDayDraft({ ...input, day: courseDay, dayNumber: day.dayNumber, title: day.title }, mode);
        result.progress = `Tag ${day.dayNumber}/${plan.days.length} erzeugt`;
        results.push(result);
      } catch (error) {
        const fallback = await this.local.generateDayDraft({ ...input, day, dayNumber: day.dayNumber, title: day.title });
        fallback.warnings.push(`Fallback fuer Tag ${day.dayNumber}: ${error.message}`);
        results.push(fallback);
      }
    }
    return results;
  }

  async generateCurriculumPlan(input = {}, mode = 'local') {
    const requested = mode || process.env.AI_PROVIDER || 'local';
    if (requested.startsWith('openai') && this.openai.isConfigured()) {
      try {
        const result = await this.openai.generateCurriculumPlan(input);
        const validation = validateCurriculumPlanPartial(result);
        if (!validation.valid) throw new Error(`Ungueltige Curriculum-KI-Ausgabe: ${validation.errors.join(', ')}`);
        return result;
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

  async reviseDayDraft(input = {}, mode = 'local') {
    const requested = mode || process.env.AI_PROVIDER || 'local';
    if (requested.startsWith('openai') && this.openai.isConfigured()) {
      try {
        const normalized = normalizeDayGenerationResult(await this.openai.reviseDayDraft(input));
        const validation = validateDayGenerationResult(normalized);
        if (!validation.valid) throw new Error(`Ungueltige KI-Revision: ${validation.errors.join(', ')}`);
        return normalized;
      } catch (error) {
        const fallback = await this.local.reviseDayDraft(input);
        fallback.warnings.push(`OpenAI-Revision-Fallback genutzt: ${error.message}`);
        return fallback;
      }
    }
    return this.local.reviseDayDraft(input);
  }
}

module.exports = {
  AiOrchestrator
};
