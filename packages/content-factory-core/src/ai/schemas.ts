export type DayGenerationInput = {
  dayNumber: number;
  title: string;
  courseName: string;
  sourceTexts: string[];
};

export type DayRevisionInput = DayGenerationInput & {
  revisionRequest: string;
};

export type DayReviewInput = {
  result: DayGenerationResult;
  courseName: string;
};

export type DayReviewResult = {
  ok: boolean;
  warnings: string[];
  repairHints: string[];
};

export type DayGenerationResult = {
  dayNumber: number;
  title: string;
  status: 'draft' | 'needs_review';
  webvariant: {
    teacherHtmlSections: Array<{ title: string; content: string; sourceRefs: string[]; aiGenerated: boolean }>;
    participantHtmlSections: Array<{ title: string; content: string; sourceRefs: string[]; aiGenerated: boolean }>;
  };
  tasks: Array<{ id: string; title: string; difficulty: 'leicht' | 'mittel' | 'schwer'; text: string; sourceRefs: string[]; aiGenerated: boolean }>;
  solutions: Array<{ taskId: string; title: string; text: string; sourceRefs: string[]; aiGenerated: boolean }>;
  quiz: Array<{ id: string; type: 'single-choice' | 'multiple-choice'; topic: string; difficulty: 'leicht' | 'mittel' | 'schwer'; text: string; options: string[]; correct: number[]; explanation?: string; sourceRefs: string[]; aiGenerated: boolean }>;
  projectContext?: string;
  sourceRefs: string[];
  warnings: string[];
  aiAdditions: string[];
};
