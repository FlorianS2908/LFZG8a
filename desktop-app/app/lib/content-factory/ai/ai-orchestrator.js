const { LocalHeuristicProvider } = require('./local-heuristic-provider');
const { OpenAIProvider } = require('./openai-provider');
const { normalizeDayGenerationResult } = require('./output-normalizer');
const { validateDayGenerationResult, validateCurriculumPlanPartial } = require('./schemas');
const { buildPrompt, runPromptQualityGate, createAiMeta } = require('../ai-quality-gate/ai-quality-gate-service');
const { reviewOutput } = require('../ai-quality-gate/output-review-service');
const { loadAppEnv } = require('../../env/env-loader');

class AiOrchestrator {
  constructor(options = {}) {
    this.env = options.env || loadAppEnv(options.projectRoot || process.cwd());
    this.projectRoot = options.projectRoot || process.cwd();
    this.aiKeyStore = options.aiKeyStore || null;
    this.local = options.localProvider || new LocalHeuristicProvider();
    this.openai = options.openaiProvider || this.createOpenAiProvider(options.openai || {});
  }

  createOpenAiProvider(options = {}) {
    return new OpenAIProvider({
      ...(options.openai || {}),
      ...options,
      model: options.model || this.aiKeyStore?.getAiProviderSafeStatus?.().model || this.env.openAiModel,
      timeoutMs: options.timeoutMs || this.env.timeoutMs,
      keySource: this.env.openAiKeySource || this.env.keySource,
      projectRoot: this.projectRoot,
      aiKeyStore: this.aiKeyStore
    });
  }

  refreshOpenAiProvider() {
    this.openai = this.createOpenAiProvider();
    return this.getStatus();
  }

  getStatus() {
    return {
      defaultProvider: this.env.aiProvider || process.env.AI_PROVIDER || 'local',
      timeoutMs: this.env.timeoutMs,
      maxPromptChars: this.env.maxPromptChars,
      costWarningUsd: this.env.costWarningUsd,
      providers: {
        local: { configured: true },
        openai: this.openai.getStatus ? this.openai.getStatus() : { provider: 'openai', configured: this.openai.isConfigured(), model: this.openai.model || '', keySource: this.openai.isConfigured() ? 'process.env' : 'missing' }
      }
    };
  }

  testOpenAiConnection() {
    return this.openai.testConnection ? this.openai.testConnection() : Promise.resolve({ status: 'warning', message: 'OpenAI Provider unterstuetzt keine Testanfrage.' });
  }

  async generateDayDraft(input = {}, mode = 'local') {
    const purpose = 'generateDayDraft';
    const requested = mode || process.env.AI_PROVIDER || 'local';
    const gate = this.runGate(purpose, input, requested);
    if (requested.startsWith('openai') && this.openai.isConfigured() && gate.maySendToProvider) {
      try {
        const normalized = normalizeDayGenerationResult(await this.openai.generateDayDraft(input));
        const validation = validateDayGenerationResult(normalized);
        if (!validation.valid) throw new Error(`Ungueltige KI-Ausgabe: ${validation.errors.join(', ')}`);
        const outputReview = reviewOutput(normalized, outputReviewContext(input, purpose));
        if (outputReview.status === 'failed') throw new Error(`Output Review failed: ${outputReview.errors.join(', ')}`);
        normalized.aiMeta = createAiMeta({ provider: 'openai', model: this.openai.model || '', purpose, promptQuality: gate, reviewUsed: requested.includes('review'), schemaValid: true, outputReview });
        normalized.warnings.push(...normalized.aiMeta.warnings);
        return normalized;
      } catch (error) {
        const fallback = await this.local.generateDayDraft(input);
        return this.withAiMeta(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, outputWarning: `OpenAI-Fallback genutzt: ${error.message}`, input });
      }
    }
    if (requested.startsWith('openai') && !gate.maySendToProvider) {
      const fallback = await this.local.generateDayDraft(input);
      return this.withAiMeta(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, qualityGateBlockedProvider: true, outputWarning: 'Prompt Quality Gate blockiert Provider. LocalHeuristicProvider wurde verwendet.', input });
    }
    if (requested.startsWith('openai')) {
      const fallback = await this.local.generateDayDraft(input);
      return this.withAiMeta(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, outputWarning: 'OpenAI ist nicht konfiguriert. LocalHeuristicProvider wurde verwendet.', input });
    }
    return this.withAiMeta(await this.local.generateDayDraft(input), { provider: 'local', purpose, gate, input });
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
    const purpose = 'generateCurriculumPlan';
    const requested = mode || process.env.AI_PROVIDER || 'local';
    const gate = this.runGate(purpose, input, requested);
    if (requested.startsWith('openai') && this.openai.isConfigured() && gate.maySendToProvider) {
      try {
        const result = await this.openai.generateCurriculumPlan(input);
        const validation = validateCurriculumPlanPartial(result);
        if (!validation.valid) throw new Error(`Ungueltige Curriculum-KI-Ausgabe: ${validation.errors.join(', ')}`);
        result.aiMeta = createAiMeta({ provider: 'openai', model: this.openai.model || '', purpose, promptQuality: gate, reviewUsed: requested.includes('review'), schemaValid: true, outputReview: { status: 'passed', score: 100, warnings: [] } });
        return result;
      } catch (error) {
        const fallback = await this.local.generateCurriculumPlan(input);
        return this.withMetaObject(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, outputWarning: `OpenAI-Curriculum-Fallback genutzt: ${error.message}` });
      }
    }
    if (requested.startsWith('openai') && !gate.maySendToProvider) {
      const fallback = await this.local.generateCurriculumPlan(input);
      return this.withMetaObject(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, qualityGateBlockedProvider: true, outputWarning: 'Prompt Quality Gate blockiert Provider. Curriculum-Planung nutzt lokalen Fallback.' });
    }
    if (requested.startsWith('openai')) {
      const fallback = await this.local.generateCurriculumPlan(input);
      return this.withMetaObject(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, outputWarning: 'OpenAI ist nicht konfiguriert. Curriculum-Planung nutzt lokalen Fallback.' });
    }
    return this.withMetaObject(await this.local.generateCurriculumPlan(input), { provider: 'local', purpose, gate });
  }

  async reviseDayDraft(input = {}, mode = 'local') {
    const purpose = 'reviseDayDraft';
    const requested = mode || process.env.AI_PROVIDER || 'local';
    const gate = this.runGate(purpose, input, requested);
    if (requested.startsWith('openai') && this.openai.isConfigured() && gate.maySendToProvider) {
      try {
        const normalized = normalizeDayGenerationResult(await this.openai.reviseDayDraft(input));
        const validation = validateDayGenerationResult(normalized);
        if (!validation.valid) throw new Error(`Ungueltige KI-Revision: ${validation.errors.join(', ')}`);
        const outputReview = reviewOutput(normalized, outputReviewContext(input, purpose));
        if (outputReview.status === 'failed') throw new Error(`Output Review failed: ${outputReview.errors.join(', ')}`);
        normalized.aiMeta = createAiMeta({ provider: 'openai', model: this.openai.model || '', purpose, promptQuality: gate, reviewUsed: requested.includes('review'), schemaValid: true, outputReview });
        return normalized;
      } catch (error) {
        const fallback = await this.local.reviseDayDraft(input);
        return this.withAiMeta(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, outputWarning: `OpenAI-Revision-Fallback genutzt: ${error.message}`, input });
      }
    }
    if (requested.startsWith('openai') && !gate.maySendToProvider) {
      const fallback = await this.local.reviseDayDraft(input);
      return this.withAiMeta(fallback, { provider: 'local', purpose, gate, fallbackUsed: true, qualityGateBlockedProvider: true, outputWarning: 'Prompt Quality Gate blockiert Provider. Lokale Revision wurde verwendet.', input });
    }
    return this.withAiMeta(await this.local.reviseDayDraft(input), { provider: 'local', purpose, gate, input });
  }

  runGate(purpose, input, mode) {
    const promptInput = buildPrompt(purpose, { ...input, aiMode: mode });
    const gate = runPromptQualityGate(promptInput);
    if (/apiKey|OPENAI_API_KEY|secret|token/i.test(JSON.stringify(input || {}))) {
      return {
        ...gate,
        status: 'failed',
        score: 0,
        totalScore: 0,
        errors: Array.from(new Set([...(gate.errors || []), 'Input enthaelt Secret-/Token-Felder.'])),
        recommendations: Array.from(new Set([...(gate.recommendations || []), 'Secret-Felder vor Provider-Nutzung entfernen.'])),
        maySendToProvider: false
      };
    }
    return gate;
  }

  withAiMeta(result, { provider, purpose, gate, fallbackUsed = false, qualityGateBlockedProvider = false, outputWarning = '', input = {} }) {
    const normalized = normalizeDayGenerationResult(result);
    const outputReview = reviewOutput(normalized, outputReviewContext(input, purpose));
    normalized.aiMeta = createAiMeta({ provider, model: provider === 'openai' ? this.openai.model || '' : 'LocalHeuristicProvider', purpose, promptQuality: gate, fallbackUsed, qualityGateBlockedProvider, outputReview, warnings: outputWarning ? [outputWarning] : [] });
    normalized.warnings = Array.from(new Set([...(normalized.warnings || []), outputWarning, ...(normalized.aiMeta.warnings || [])].filter(Boolean)));
    return normalized;
  }

  withMetaObject(result, { provider, purpose, gate, fallbackUsed = false, qualityGateBlockedProvider = false, outputWarning = '' }) {
    const outputReview = { status: 'passed', score: 100, warnings: [] };
    const aiMeta = createAiMeta({ provider, model: provider === 'openai' ? this.openai.model || '' : 'LocalHeuristicProvider', purpose, promptQuality: gate, fallbackUsed, qualityGateBlockedProvider, outputReview, warnings: outputWarning ? [outputWarning] : [] });
    return { ...result, aiMeta, warnings: Array.from(new Set([...(result.warnings || []), outputWarning, ...(aiMeta.warnings || [])].filter(Boolean))) };
  }
}

function outputReviewContext(input = {}, purpose) {
  return {
    purpose,
    targetAudience: input.targetAudience || input.curriculumPlan?.targetAudience || {},
    containerProfile: input.containerProfile || {},
    didacticProfile: input.didacticProfile || input.curriculumPlan?.didacticProfile || {}
  };
}

module.exports = {
  AiOrchestrator
};
