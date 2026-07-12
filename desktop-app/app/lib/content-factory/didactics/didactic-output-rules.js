function outputRulesForProfile(profile = {}) {
  const rules = [
    `teachingModel=${profile.teachingModel}`,
    `lessonFlow=${(profile.lessonFlow || []).join(' > ')}`,
    `demoStrategy=${profile.demoStrategy}`,
    `releaseStrategy=${profile.releaseStrategy}`,
    `taskProgression=${profile.taskProgression}`,
    `supportLevel=${profile.supportLevel}`,
    `assessmentMode=${profile.assessmentMode}`,
    `reflectionMode=${profile.reflectionMode}`,
    `socialForm=${profile.socialForm}`
  ];
  if (profile.id === 'problem-first') rules.push('Webvariante beginnt mit Problemfall und Analyse.');
  if (profile.id === 'exam-training') rules.push('Zeitangaben, Bewertungskriterien und typische Fehler einbauen.');
  if (profile.id === 'worked-example-fading') rules.push('Aufgaben stufenweise von Muster zu frei aufbauen.');
  if (profile.id === 'project-based') rules.push('Projektziel und Fortschrittscheck sichtbar machen.');
  if (profile.id === 'guided-coding') rules.push('Live-Coding, Mitmachen und Erweiterungsaufgabe sichtbar machen.');
  return rules;
}

module.exports = {
  outputRulesForProfile
};
