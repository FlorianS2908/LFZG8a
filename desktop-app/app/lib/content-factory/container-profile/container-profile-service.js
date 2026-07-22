const { validateContainerProfile } = require('./container-profile-types');
const { getDefaultToolProfiles } = require('./tool-profile-service');
const { decideArtifactSuggestions } = require('./audience-artifact-decision-service');
const { suggestionsToTargets } = require('./artifact-target-service');

function buildContainerProfile(input = {}) {
  const validation = validateContainerProfile(input.containerProfile || {});
  if (!validation.valid) {
    const error = new Error(validation.errors.map((item) => item.message).join(' '));
    error.code = 'CONTAINER_PROFILE_INVALID';
    error.details = validation.errors;
    throw error;
  }
  const containerProfile = validation.value;
  const toolProfiles = input.toolProfiles?.length ? input.toolProfiles : getDefaultToolProfiles(containerProfile.courseType);
  const artifactSuggestions = input.artifactSuggestions?.length ? input.artifactSuggestions : suggestArtifactsForPlan({
    curriculumPlan: input.curriculumPlan,
    coursePlan: input.coursePlan,
    containerProfile,
    targetAudience: input.targetAudience || input.curriculumPlan?.targetAudience || {},
    courseGoal: input.courseGoal || input.curriculumPlan?.courseGoal || '',
    expectedOutcome: input.expectedOutcome || input.curriculumPlan?.expectedOutcome || '',
    didacticStyle: input.didacticStyle || input.curriculumPlan?.didacticStyle || 'guided'
  });
  const artifactTargets = suggestionsToTargets(artifactSuggestions);
  return { containerProfile, toolProfiles, artifactSuggestions, artifactTargets, configurationWarnings: validation.warnings };
}

function suggestArtifactsForPlan(input = {}) {
  const days = input.curriculumPlan?.days || input.coursePlan?.days || [];
  return days.flatMap((day) => {
    const topics = day.topics?.length ? day.topics : [{ id: `day-${day.dayNumber}`, title: day.mainTopic || day.title }];
    return topics.slice(0, 3).flatMap((topic) => decideArtifactSuggestions({
      topic,
      day,
      containerProfile: input.containerProfile,
      targetAudience: input.targetAudience,
      courseGoal: input.courseGoal,
      expectedOutcome: input.expectedOutcome,
      didacticStyle: input.didacticStyle
    }).artifactSuggestions);
  });
}

module.exports = {
  buildContainerProfile,
  suggestArtifactsForPlan
};
