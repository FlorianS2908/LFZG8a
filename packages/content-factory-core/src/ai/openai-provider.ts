import type { AiProvider } from './ai-provider-interface.ts';
import type { DayGenerationInput, DayGenerationResult, DayReviewInput, DayReviewResult, DayRevisionInput } from './schemas.ts';

export class OpenAIProvider implements AiProvider {
  name = 'openai';
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey = '', model = '') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(this.apiKey && this.model);
  }

  async generateDayDraft(_input: DayGenerationInput): Promise<DayGenerationResult> {
    throw new Error('OpenAIProvider ist vorbereitet, aber im Lab ohne Backend/API-Key nicht aktiv.');
  }

  async reviseDayDraft(_input: DayRevisionInput): Promise<DayGenerationResult> {
    throw new Error('OpenAIProvider ist vorbereitet, aber im Lab ohne Backend/API-Key nicht aktiv.');
  }

  async reviewDayDraft(_input: DayReviewInput): Promise<DayReviewResult> {
    throw new Error('OpenAIProvider ist vorbereitet, aber im Lab ohne Backend/API-Key nicht aktiv.');
  }
}
