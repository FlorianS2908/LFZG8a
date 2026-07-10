import type { CoursePlan, DayMapping, DraftContainer, GapAnalysis } from './types.ts';
import { buildDualModeContainer } from './dual-mode-container-builder.ts';

export function buildDraftContainer(input: {
  coursePlan?: CoursePlan;
  mappings: DayMapping[];
  gapAnalysis: GapAnalysis;
  containerId?: string;
}): DraftContainer {
  return buildDualModeContainer(input);
}
