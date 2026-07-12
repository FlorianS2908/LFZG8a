const { DIDACTIC_REQUIRED_FIELDS } = require('./didactic-profile-types');

function validateDidacticProfile(profile = {}) {
  const errors = [];
  const warnings = [];
  DIDACTIC_REQUIRED_FIELDS.forEach((field) => {
    if (field === 'lessonFlow') {
      if (!Array.isArray(profile.lessonFlow) || !profile.lessonFlow.length) errors.push('lessonFlow fehlt oder ist leer.');
    } else if (!profile[field]) {
      errors.push(`${field} fehlt.`);
    }
  });
  if (profile.projectMode && !/project|projekt/i.test(`${profile.id} ${profile.label} ${profile.taskProgression}`)) {
    warnings.push('Projektmodus ist aktiv, aber Projektbezug ist nicht klar benannt.');
  }
  if (profile.defaultParticipantDemoVisible === true && profile.defaultDemoEnabled !== true) {
    errors.push('Teilnehmer-Demo kann nicht sichtbar sein, wenn Demos deaktiviert sind.');
  }
  return { isValid: errors.length === 0, errors, warnings };
}

module.exports = {
  validateDidacticProfile
};
