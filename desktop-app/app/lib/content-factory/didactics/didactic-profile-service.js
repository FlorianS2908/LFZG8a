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
  return recommendDidacticProfiles(input).recommended.profile;
}

function recommendDidacticProfiles(input = {}) {
  const { evaluateAllDidacticFits } = require('./didactic-fit-service');
  const fits = evaluateAllDidacticFits(input);
  const targetAudience = input.targetAudience || {};
  const courseType = String(input.courseType || input.containerProfile?.courseType || '').toLowerCase();
  const text = `${input.topic || ''} ${input.courseGoal || ''} ${input.expectedOutcome || ''}`.toLowerCase();
  const decisionLog = [];
  const warnings = [];
  const boosts = new Map();
  const boost = (id, points, reason) => {
    boosts.set(id, (boosts.get(id) || 0) + points);
    decisionLog.push({ profileId: id, points, reason });
  };

  if (targetAudience.examOrientation || input.examOrientation) boost('exam-training', 30, 'Pruefungsorientierung priorisiert Pruefungstraining.');
  if (targetAudience.projectOrientation || input.projectOrientation) boost('project-based', 14, 'Projektorientierung macht project-based relevant.');
  if (['none', 'basic'].includes(targetAudience.priorKnowledge)) {
    boost('worked-example-fading', 16, 'Einsteiger brauchen Musterbeispiel und abnehmende Hilfen.');
    boost('explain-demo-practice', 8, 'Klassische Fuehrung bleibt fuer Einsteiger plausibel.');
  }
  if (/java|python|html-css|html|css|php|javascript|jupyter/.test(courseType)) boost('guided-coding', 12, 'Code-naher Kurstyp macht Guided Coding relevant.');
  if (/debug|fehler|analyse|korrektur|troubleshooting|bug/.test(text)) boost('problem-first', 18, 'Fehleranalyse/Debugging priorisiert problem-first.');
  if (/heterogen|unterschiedlich|gemischt/.test(text) || targetAudience.ageRange === 'mixed') boost('station-learning', 9, 'Heterogene Gruppe macht Stationenlernen zur Alternative.');
  if (/wiederholung|vorbereitung|selbstlern|vorab|flipped/.test(text)) boost('flipped-classroom', 9, 'Vorbereitung/Selbstlernanteil macht Flipped Classroom zur Alternative.');
  if (targetAudience.projectOrientation && ['none', 'basic'].includes(targetAudience.priorKnowledge)) {
    warnings.push('Projektmodus fuer Einsteiger benoetigt starke Fuehrung; worked-example-fading oder guided-coding bleiben starke Optionen.');
  }

  const ranked = fits.map((fit) => ({
    ...fit,
    score: Math.min(100, fit.score + (boosts.get(fit.profileId) || 0)),
    boost: boosts.get(fit.profileId) || 0
  })).sort((a, b) => b.score - a.score || b.boost - a.boost || a.profileId.localeCompare(b.profileId));
  const recommended = ranked[0] || { profile: getDefaultDidacticProfile(), score: 0, reasons: [] };
  return {
    recommended: {
      profile: recommended.profile,
      score: recommended.score,
      level: recommended.level,
      reason: recommended.reasons?.[0] || `Fit Score ${recommended.score}.`,
      fit: recommended
    },
    alternatives: ranked.slice(1, 5).map((fit) => ({
      profile: fit.profile,
      score: fit.score,
      level: fit.level,
      reason: fit.reasons?.[0] || `Alternative mit Fit Score ${fit.score}.`,
      warnings: fit.warnings || []
    })),
    warnings: Array.from(new Set([...warnings, ...ranked.flatMap((fit) => fit.warnings || []).slice(0, 4)])),
    decisionLog
  };
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
  recommendDidacticProfiles,
  validateDidacticProfile,
  normalizeDidacticProfile
};
