const { didacticProfiles } = require('./didactic-profile-presets');
const { validateDidacticProfile } = require('./didactic-profile-validator');

function listDidacticProfiles() {
  return didacticProfiles.map((profile) => ({ ...profile, lessonFlow: [...profile.lessonFlow] }));
}

function getDidacticProfile(id = 'explain-demo-practice') {
  return listDidacticProfiles().find((profile) => profile.id === id) || getDefaultDidacticProfile();
}

function getDefaultDidacticProfile() {
  return listDidacticProfiles().find((profile) => profile.id === 'explain-demo-practice');
}

function applyDidacticProfile(id, currentConfig = {}) {
  const profile = getDidacticProfile(id);
  return {
    ...currentConfig,
    didacticProfile: profile,
    targetAudience: {
      ...(currentConfig.targetAudience || {}),
      projectOrientation: profile.projectMode === true || currentConfig.targetAudience?.projectOrientation === true,
      examOrientation: profile.id === 'exam-training' || currentConfig.targetAudience?.examOrientation === true,
      needsStepByStep: ['worked-example-fading', 'guided-coding', 'explain-demo-practice'].includes(profile.id) || currentConfig.targetAudience?.needsStepByStep === true
    },
    containerProfile: {
      ...(currentConfig.containerProfile || {}),
      participantDemos: profile.defaultParticipantDemoVisible === true,
      demoCountPerDay: profile.defaultDemoEnabled ? 1 : 0
    }
  };
}

function suggestDidacticProfile(input = {}) {
  const courseType = String(input.courseType || input.containerProfile?.courseType || '').toLowerCase();
  const targetAudience = input.targetAudience || {};
  const text = `${input.topic || ''} ${input.courseGoal || ''} ${input.expectedOutcome || ''}`.toLowerCase();
  if (targetAudience.examOrientation || input.examOrientation) return getDidacticProfile('exam-training');
  if (targetAudience.projectOrientation || input.projectOrientation) return getDidacticProfile('project-based');
  if (/debug|fehler|analyse|korrektur/.test(text)) return getDidacticProfile('problem-first');
  if (/java|python|html-css|html|css|php|javascript|jupyter/.test(courseType)) return getDidacticProfile('guided-coding');
  if (['none', 'basic'].includes(targetAudience.priorKnowledge)) return getDidacticProfile('worked-example-fading');
  return getDefaultDidacticProfile();
}

function normalizeDidacticProfile(input = {}) {
  const profile = input.didacticProfile?.id ? input.didacticProfile : getDidacticProfile(input.didacticProfileId || input.id);
  const validation = validateDidacticProfile(profile);
  return validation.isValid ? profile : getDefaultDidacticProfile();
}

module.exports = {
  listDidacticProfiles,
  getDidacticProfile,
  getDefaultDidacticProfile,
  applyDidacticProfile,
  suggestDidacticProfile,
  validateDidacticProfile,
  normalizeDidacticProfile
};
