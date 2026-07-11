const PROMPT_VERSION = '1.0.0';

const PURPOSES = [
  'generateCurriculumPlan',
  'generateDayDraft',
  'generateArtifactSuggestions',
  'generateArtifactContent',
  'reviseDayDraft',
  'reviewGeneratedContent',
  'repairInvalidJson'
];

const REVIEW_ROLES = [
  'prompt_planner',
  'didactic_reviewer',
  'safety_reviewer',
  'schema_reviewer',
  'final_decision'
];

module.exports = {
  PROMPT_VERSION,
  PURPOSES,
  REVIEW_ROLES
};
