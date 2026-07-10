import type { CourseMetadata, CoursePlan, CoursePlanDay, FileAnalysis } from './types.ts';
import { AiOrchestrator } from './ai/ai-orchestrator.ts';
import type { AiMode, DayDraftPipelineResult, DayGenerationInput } from './ai/schemas.ts';

export function prepareDayInput(input: {
  course: Pick<CourseMetadata, 'courseName' | 'courseId' | 'department'>;
  plan: CoursePlan;
  day: CoursePlanDay;
  files?: FileAnalysis[];
  correctionPrompt?: string;
}): DayGenerationInput {
  const blocks = input.day.ueBlocks || [];
  return {
    dayNumber: input.day.dayNumber,
    title: input.day.title,
    courseName: input.course.courseName || input.plan.courseTitle,
    planTopic: input.day.mainTopic,
    learningGoals: input.day.learningGoals,
    learnerTasks: blocks.map((block) => block.learnerTask).filter(Boolean) as string[],
    teacherTasks: blocks.map((block) => block.teacherTask || block.evaluation).filter(Boolean) as string[],
    resources: blocks.map((block) => block.resources).filter(Boolean) as string[],
    sourceTexts: [
      `Unterrichtsplan: ${input.plan.sourceFile || 'ohne Dateiname'}`,
      `Sheet: ${input.plan.selectedSheet || 'Tabelle1'}`,
      `Tag ${input.day.dayNumber}: ${input.day.mainTopic}`,
      ...(input.files || []).map((file) => `Datei: ${file.fileName} (${file.contentCategory})`)
    ],
    correctionPrompt: input.correctionPrompt
  };
}

export async function generateDayDraftFromPlan(input: {
  course: Pick<CourseMetadata, 'courseName' | 'courseId' | 'department'>;
  plan: CoursePlan;
  day: CoursePlanDay;
  files?: FileAnalysis[];
  aiMode?: AiMode;
  correctionPrompt?: string;
  orchestrator?: AiOrchestrator;
}): Promise<DayDraftPipelineResult> {
  const orchestrator = input.orchestrator || new AiOrchestrator();
  return orchestrator.runDayPipeline(prepareDayInput(input), input.aiMode || 'local');
}
