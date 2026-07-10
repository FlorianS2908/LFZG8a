import type { AiProvider } from './ai-provider-interface.ts';
import { LocalHeuristicProvider } from './local-heuristic-provider.ts';
import type { DayGenerationInput, DayGenerationResult } from './schemas.ts';

export class AiOrchestrator {
  private readonly providers: AiProvider[];

  constructor(providers: AiProvider[] = [new LocalHeuristicProvider()]) {
    this.providers = providers;
  }

  async selectProvider(): Promise<AiProvider> {
    for (const provider of this.providers) {
      if (await provider.isConfigured()) return provider;
    }
    return new LocalHeuristicProvider();
  }

  async generateDayDraft(input: DayGenerationInput): Promise<DayGenerationResult> {
    const provider = await this.selectProvider();
    try {
      return await provider.generateDayDraft(input);
    } catch {
      return new LocalHeuristicProvider().generateDayDraft(input);
    }
  }
}
