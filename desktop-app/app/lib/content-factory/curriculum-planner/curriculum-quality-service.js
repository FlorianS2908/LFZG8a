function assessCurriculumQuality(plan = {}, outline = plan.extractedSourceOutline || []) {
  const recommendations = [];
  let score = 100;
  const days = plan.days || [];
  const topics = days.flatMap((day) => day.topics || []);
  const activeTopics = topics.filter((topic) => topic.active !== false);
  const duration = plan.duration || {};
  const uePerDay = Number(duration.uePerDay || 9);

  if (!days.length) penalty(30, 'Keine Tage im Curriculum vorhanden.');
  if (days.length && Number(duration.numberOfDays || days.length) !== days.length) penalty(8, 'Anzahl Tage passt nicht zur geplanten Dauer.');
  if (!activeTopics.length) penalty(25, 'Keine aktiven Themen vorhanden.');
  if (activeTopics.some((topic) => !topic.title || topic.title.length < 4)) penalty(8, 'Einige Themen haben zu kurze Titel.');
  if (activeTopics.some((topic) => !(topic.sourceRefs || []).length)) penalty(8, 'Einige Themen haben keine SourceRefs.');
  if (!plan.targetAudience?.department) penalty(8, 'Zielgruppe/Fachbereich fehlt.');
  if (!plan.courseGoal) penalty(8, 'Kursziel fehlt.');

  days.forEach((day) => {
    const ue = Number(day.estimatedUE || (day.topics || []).reduce((sum, topic) => sum + Number(topic.estimatedUE || 0), 0));
    if (!(day.topics || []).length) penalty(10, `Tag ${day.dayNumber} ist leer.`);
    if (ue > uePerDay * 1.25) penalty(10, `Tag ${day.dayNumber} ist deutlich ueberladen.`);
    if (ue > 0 && ue < Math.max(2, uePerDay * 0.35)) penalty(5, `Tag ${day.dayNumber} ist sehr kurz geplant.`);
  });

  const lowQuality = (outline || []).filter((section) => (section.quality?.level || section.warnings?.join(' ') || '').toString().includes('low') || /Fallback|kein lesbarer/i.test((section.warnings || []).join(' ')));
  if (lowQuality.length) penalty(Math.min(18, lowQuality.length * 4), `${lowQuality.length} Quelle/Abschnitt mit niedriger Extraktionsqualitaet.`);
  if ((plan.warnings || []).some((warning) => /Originaltext|Buchseite|Referenzchunk/i.test(warning))) penalty(20, 'Warnung zu Originaltext oder Referenzchunk vorhanden.');

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    level: score >= 85 ? 'strong' : score >= 70 ? 'good' : score >= 50 ? 'usable' : 'weak',
    recommendations
  };

  function penalty(points, recommendation) {
    score -= points;
    recommendations.push(recommendation);
  }
}

module.exports = {
  assessCurriculumQuality
};
