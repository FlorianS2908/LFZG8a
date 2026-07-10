import type { DayGenerationInput, DayGenerationResult, DayReviewInput, DayReviewResult, DayRevisionInput } from './schemas.ts';

export interface AiProvider {
  name: string;
  isConfigured(): Promise<boolean>;
  generateDayDraft(input: DayGenerationInput): Promise<DayGenerationResult>;
  reviseDayDraft(input: DayRevisionInput): Promise<DayGenerationResult>;
  reviewDayDraft(input: DayReviewInput): Promise<DayReviewResult>;
}
