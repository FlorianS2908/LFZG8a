import type { AiProvider } from './ai-provider-interface.ts';
import { LocalHeuristicProvider } from './local-heuristic-provider.ts';
import { repairParticipantOutput } from './ai-repair-service.ts';
import { reviewGeneratedDay } from './ai-reviewer.ts';
import { normalizeDayGenerationResult } from './output-normalizer.ts';
import type { AiMode, DayDraftPipelineResult, DayGenerationInput, DayGenerationResult } from './schemas.ts';

export class AiOrchestrator {
  private readonly providers: AiProvider[];

  constructor(providers: AiProvider[] = [new LocalHeuristicProvider()]) {
    this.providers = providers;
  }

  async selectProvider(preferred: 'local' | 'openai' = 'local'): Promise<{ provider: AiProvider; usedFallback: boolean; message: string }> {
    if (preferred === 'local') {
      return { provider: new LocalHeuristicProvider(), usedFallback: false, message: 'Lokaler Fallback aktiv.' };
    }
    for (const provider of this.providers) {
      if (await provider.isConfigured()) return { provider, usedFallback: false, message: `${provider.name} ist konfiguriert.` };
    }
    return { provider: new LocalHeuristicProvider(), usedFallback: true, message: 'OpenAI ist nicht konfiguriert. Der lokale Fallback wird verwendet.' };
  }

  async getProviderStatus(preferred: 'local' | 'openai' = 'local') {
    const selected = await this.selectProvider(preferred);
    return {
      providerName: selected.provider.name,
      configured: !selected.usedFallback,
      usedFallback: selected.usedFallback,
      message: selected.message
    };
  }

  async generateDayDraft(input: DayGenerationInput, mode: AiMode = 'local'): Promise<DayGenerationResult> {
    const selected = await this.selectProvider(mode === 'local' ? 'local' : 'openai');
    try {
      return normalizeDayGenerationResult(await selected.provider.generateDayDraft(input));
    } catch {
      return normalizeDayGenerationResult(await new LocalHeuristicProvider().generateDayDraft(input));
    }
  }

  async runDayPipeline(input: DayGenerationInput, mode: AiMode = 'local'): Promise<DayDraftPipelineResult> {
    const requestedPreferred = mode === 'local' ? 'local' : 'openai';
    const selected = await this.selectProvider(requestedPreferred);
    const statusMessages = [selected.message];
    let result = await selected.provider.generateDayDraft(input).catch(async (error) => {
      statusMessages.push(`Providerfehler: ${String(error?.message || error)}. Lokaler Fallback wird verwendet.`);
      return new LocalHeuristicProvider().generateDayDraft(input);
    });
    let review;
    if (mode === 'ai-generate-review' || mode === 'ai-generate-review-repair') {
      review = await selected.provider.reviewDayDraft({ result, courseName: input.courseName }).catch(() => reviewGeneratedDay(result));
      statusMessages.push(review.ok ? 'Review ohne kritische Hinweise.' : `Review meldet ${review.warnings.length} Hinweis(e).`);
    }
    if (mode === 'ai-generate-review-repair' && review && !review.ok) {
      result = repairParticipantOutput(result);
      statusMessages.push('Repair-Service hat Teilnehmerausgabe bereinigt.');
    }
    return {
      providerName: selected.provider.name,
      requestedMode: mode,
      effectiveMode: selected.usedFallback ? 'local' : mode,
      usedFallback: selected.usedFallback,
      statusMessages,
      result: normalizeDayGenerationResult(result),
      review
    };
  }
}
