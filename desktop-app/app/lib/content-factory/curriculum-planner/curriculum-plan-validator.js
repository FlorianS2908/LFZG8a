function validateCurriculumPlan(plan = {}) {
  const errors = [];
  const warnings = [];
  if (!plan.anchor?.type) errors.push('Genau ein Curriculum Anchor ist Pflicht.');
  if (!plan.duration || Number(plan.duration.totalUE || 0) <= 0) errors.push('Dauer muss groesser 0 sein.');
  if (!plan.targetAudience?.department) errors.push('Zielgruppe/Fachbereich fehlt.');
  if (!Array.isArray(plan.days) || !plan.days.length) errors.push('Mindestens ein Tag ist Pflicht.');
  const activeTopics = (plan.days || []).flatMap((day) => day.topics || []).filter((topic) => topic.active !== false);
  if (!activeTopics.length) errors.push('Mindestens ein aktives Thema ist Pflicht.');
  (plan.days || []).forEach((day) => {
    const topics = day.topics || [];
    if (!topics.length) warnings.push(`Tag ${day.dayNumber} ist leer.`);
    const ue = topics.reduce((sum, topic) => sum + Number(topic.estimatedUE || 0), 0);
    if (topics.some((topic) => Number(topic.estimatedUE || 0) < 0)) errors.push(`Tag ${day.dayNumber} enthaelt negative UE.`);
    if (ue > Number(plan.duration?.uePerDay || 9)) warnings.push(`Tag ${day.dayNumber} ist ueberladen (${ue} UE).`);
  });
  if ((plan.unassignedTopics || []).length) warnings.push('Es gibt unzugeordnete Themen.');
  return {
    isValid: errors.length === 0,
    canApprove: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  validateCurriculumPlan
};
