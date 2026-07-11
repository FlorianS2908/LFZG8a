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
  const referenceRefs = (input.referenceContext || []).map((reference) => `reference:${reference.sourceRef}`);
  const sourceRefs = input.sourceTexts.length ? input.sourceTexts.map((_, index) => `source-${index + 1}`).concat(referenceRefs) : [`course-plan-day-${input.dayNumber}`, ...referenceRefs];
  const learnerTasks = input.learnerTasks?.length ? input.learnerTasks : ['Aufgabe noch ergaenzen'];
  const teacherTasks = input.teacherTasks?.length ? input.teacherTasks : ['Loesungshinweis noch ergaenzen'];
  const resources = input.resources?.length ? input.resources : ['Material noch ergaenzen'];
  const learningGoals = input.learningGoals?.length ? input.learningGoals : ['Lernziel noch ergaenzen'];
  return {
    dayNumber: input.dayNumber,
    title: input.title,
    status: 'draft',
    webvariant: {
      teacherHtmlSections: [
        { title: input.title, content: `${input.courseName}: lokal erzeugter Tagesentwurf.`, sourceRefs, aiGenerated: false },
        { title: 'Tagesziel', content: learningGoals.join('\n'), sourceRefs, aiGenerated: false },
        { title: 'Ressourcen', content: resources.join('\n'), sourceRefs, aiGenerated: false },
        ...(input.referenceContext?.length ? [{ title: 'Referenzhinweise', content: input.referenceContext.map((reference) => reference.summary).join('\n'), sourceRefs: referenceRefs, aiGenerated: false }] : [])
      ],
      participantHtmlSections: [
        { title: input.title, content: `${input.courseName}: Teilnehmer-Vorschau mit freigegebenen Arbeitsmaterialien.`, sourceRefs, aiGenerated: false },
        { title: 'Lernaufgaben', content: learnerTasks.join('\n'), sourceRefs, aiGenerated: false },
        { title: 'Materialien', content: resources.join('\n'), sourceRefs, aiGenerated: false }
      ]
    },
    tasks: learnerTasks.map((task, index) => ({ id: `day-${input.dayNumber}-task-${index + 1}`, title: `Arbeitsauftrag ${index + 1}`, difficulty: 'mittel', text: task, sourceRefs, aiGenerated: false })),
    solutions: teacherTasks.map((hint, index) => ({ taskId: `day-${input.dayNumber}-task-${index + 1}`, title: `Dozentenhinweis ${index + 1}`, text: hint, sourceRefs, aiGenerated: false })),
    quiz: [{ id: `day-${input.dayNumber}-quiz-1`, type: 'single-choice', topic: input.planTopic || input.title, difficulty: 'leicht', text: 'Quiz noch zu ergaenzen.', options: ['Noch zu ergaenzen'], correct: [0], sourceRefs, aiGenerated: false }],
    sourceRefs,
    warnings: input.sourceTexts.length ? [] : ['Keine Zusatzmaterialien vorhanden. Lokaler Entwurf nutzt nur den Unterrichtsplan.'],
    aiAdditions: learnerTasks.includes('Aufgabe noch ergaenzen') ? ['Aufgabenplatzhalter aus Unterrichtsplan erzeugt.'] : []
  };
}
