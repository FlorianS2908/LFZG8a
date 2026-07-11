function renderCurriculumReport(plan = {}, validation = {}) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Curriculum Analyse</title></head><body><h1>Curriculum Analyse</h1><p>Status: ${escapeHtml(plan.status)}</p><h2>${escapeHtml(plan.course?.courseName || '')}</h2><pre>${escapeHtml(JSON.stringify({
    anchor: plan.anchor,
    duration: plan.duration,
    targetAudience: plan.targetAudience,
    days: plan.days?.map((day) => ({ dayNumber: day.dayNumber, title: day.title, estimatedUE: day.estimatedUE, topics: day.topics?.map((topic) => topic.title), warnings: day.warnings })),
    unassignedTopics: plan.unassignedTopics,
    warnings: [...(plan.warnings || []), ...(validation.warnings || [])],
    validation
  }, null, 2))}</pre></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
  renderCurriculumReport
};
