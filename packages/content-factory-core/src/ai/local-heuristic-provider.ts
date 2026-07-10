import type { AiProvider } from './ai-provider-interface.ts';
import type { DayGenerationInput, DayGenerationResult, DayReviewInput, DayReviewResult, DayRevisionInput } from './schemas.ts';

export class LocalHeuristicProvider implements AiProvider {
  name = 'local';

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async generateDayDraft(input: DayGenerationInput): Promise<DayGenerationResult> {
    return createLocalDraft(input);
  }

  async reviseDayDraft(input: DayRevisionInput): Promise<DayGenerationResult> {
    const draft = createLocalDraft(input);
    draft.warnings.push(`Revision lokal beruecksichtigt: ${input.revisionRequest}`);
    return draft;
  }

  async reviewDayDraft(input: DayReviewInput): Promise<DayReviewResult> {
    const warnings = [...input.result.warnings];
    if (JSON.stringify(input.result.webvariant.participantHtmlSections).match(/loesung|solution/i)) {
      warnings.push('Teilnehmerbereich enthaelt moeglichen Loesungshinweis.');
    }
    return { ok: warnings.length === 0, warnings, repairHints: warnings.map((warning) => `Pruefen: ${warning}`) };
  }
}

function createLocalDraft(input: DayGenerationInput): DayGenerationResult {
  const sourceRefs = input.sourceTexts.map((_, index) => `source-${index + 1}`);
  return {
    dayNumber: input.dayNumber,
    title: input.title,
    status: 'draft',
    webvariant: {
      teacherHtmlSections: [{ title: input.title, content: `${input.courseName}: lokal erzeugter Tagesentwurf.`, sourceRefs, aiGenerated: false }],
      participantHtmlSections: [{ title: input.title, content: `${input.courseName}: Teilnehmer-Vorschau mit freigegebenen Arbeitsmaterialien.`, sourceRefs, aiGenerated: false }]
    },
    tasks: [{ id: `day-${input.dayNumber}-task-1`, title: 'Arbeitsauftrag', difficulty: 'mittel', text: 'Bearbeite die Tagesaufgabe anhand der Quellen.', sourceRefs, aiGenerated: false }],
    solutions: [{ taskId: `day-${input.dayNumber}-task-1`, title: 'Musterloesung', text: 'Nur fuer Dozenten sichtbar.', sourceRefs, aiGenerated: false }],
    quiz: [{ id: `day-${input.dayNumber}-quiz-1`, type: 'single-choice', topic: input.title, difficulty: 'leicht', text: 'Welche Aussage passt zum Thema?', options: ['Passende Aussage', 'Ablenkung'], correct: [0], sourceRefs, aiGenerated: false }],
    sourceRefs,
    warnings: input.sourceTexts.length ? [] : ['Keine Quellen fuer den Tagesentwurf vorhanden.'],
    aiAdditions: []
  };
}
