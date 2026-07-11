const fs = require('fs');
const path = require('path');
const { writeJson } = require('../../json-store');
const { assertAnchorType } = require('./curriculum-anchor-types');
const { parseRanges, validateRanges } = require('./source-range-parser');
const { analyzeCurriculumSource } = require('./curriculum-source-analyzer');
const { distributeTopics, normalizeDuration } = require('./curriculum-time-planner');
const { validateCurriculumPlan } = require('./curriculum-plan-validator');
const { renderCurriculumReport } = require('./curriculum-plan-renderer');
const { createCurriculumReviewStore } = require('./curriculum-review-store');

function createCurriculumPlannerService({ factoryDir, aiOrchestrator }) {
  const store = createCurriculumReviewStore(path.join(factoryDir, 'curriculum-drafts'));

  function ensurePlanner() {
    store.ensureStore();
  }

  function createCurriculumAnchor(input = {}) {
    ensurePlanner();
    assertAnchorType(input.type);
    const rangeType = input.type === 'book-or-presentation' && (input.sourceFiles || []).some((file) => /\.pptx$/i.test(file.name || file.path || '')) ? 'slides' : 'pages';
    const ranges = parseRanges(input.ranges || [], rangeType);
    const warnings = validateRanges(ranges);
    return {
      id: input.id || `anchor-${Date.now()}`,
      type: input.type,
      title: input.title || (input.sourceFiles || [])[0]?.name || 'Curriculum Anchor',
      sourceFiles: (input.sourceFiles || []).map(publicSourceFile),
      ranges,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
      warnings
    };
  }

  async function analyzeCurriculumAnchor(input = {}) {
    ensurePlanner();
    const anchor = input.anchor?.id ? input.anchor : createCurriculumAnchor(input.anchor || input);
    const duration = normalizeDuration(input.duration || {});
    const analyzed = analyzeCurriculumSource(anchor, input);
    const generated = aiOrchestrator?.generateCurriculumPlan
      ? await aiOrchestrator.generateCurriculumPlan({
        anchor,
        extractedSourceOutline: analyzed.outline,
        duration,
        targetAudience: input.targetAudience || {},
        courseGoal: input.courseGoal || '',
        expectedOutcome: input.expectedOutcome || '',
        didacticStyle: input.didacticStyle || 'guided',
        topics: analyzed.topics
      }, input.aiMode || 'local')
      : null;
    const distributed = generated?.days?.length ? { days: generated.days, duration } : distributeTopics(analyzed.topics, duration);
    const draft = {
      id: input.draftId || `curriculum-draft-${Date.now()}`,
      course: {
        courseName: input.course?.courseName || anchor.title,
        courseId: input.course?.courseId || slug(anchor.title),
        department: input.course?.department || input.targetAudience?.department || 'ALLGEMEIN'
      },
      anchor: { ...anchor, status: 'analyzed' },
      duration: distributed.duration || duration,
      targetAudience: input.targetAudience || {},
      courseGoal: input.courseGoal || '',
      expectedOutcome: input.expectedOutcome || 'grundlagenkurs',
      didacticStyle: input.didacticStyle || 'guided',
      days: distributed.days,
      unassignedTopics: [],
      warnings: [...(analyzed.warnings || []), ...(generated?.warnings || [])],
      status: 'needs-review'
    };
    return saveDraftWithReports(draft, analyzed.outline);
  }

  function getCurriculumDraft(draftId) {
    ensurePlanner();
    return store.getDraft(draftId);
  }

  function listCurriculumDrafts() {
    ensurePlanner();
    return store.listDrafts();
  }

  function updateCurriculumDraft(draftId, patch = {}) {
    const draft = getRequiredDraft(draftId);
    const updated = mergeDraft(draft, patch);
    updated.status = updated.status === 'approved' ? 'needs-review' : updated.status;
    store.appendHistory(draftId, { action: 'update', patch });
    return saveDraftWithReports(updated);
  }

  function moveCurriculumTopic(draftId, topicId, targetDayNumber, targetOrder = 1) {
    const draft = getRequiredDraft(draftId);
    let moved = null;
    draft.days.forEach((day) => {
      day.topics = (day.topics || []).filter((topic) => {
        if (topic.id === topicId) {
          moved = topic;
          return false;
        }
        return true;
      });
    });
    if (!moved) throw new Error('Thema wurde nicht gefunden.');
    const targetDay = draft.days.find((day) => day.dayNumber === Number(targetDayNumber));
    if (!targetDay) throw new Error('Zieltag wurde nicht gefunden.');
    targetDay.topics.splice(Math.max(0, Number(targetOrder) - 1), 0, moved);
    recalculateDays(draft);
    draft.status = 'needs-review';
    store.appendHistory(draftId, { action: 'move-topic', topicId, targetDayNumber, targetOrder });
    return saveDraftWithReports(draft);
  }

  function approveCurriculumDraft(draftId) {
    const draft = getRequiredDraft(draftId);
    const validation = validateCurriculumPlan(draft);
    if (!validation.canApprove) {
      throw new Error(validation.errors.join(' | '));
    }
    draft.status = 'approved';
    draft.anchor.status = 'approved';
    store.appendHistory(draftId, { action: 'approve' });
    return saveDraftWithReports(draft);
  }

  function removeCurriculumDraft(draftId) {
    return store.removeDraft(draftId);
  }

  function saveDraftWithReports(draft, outline = []) {
    recalculateDays(draft);
    const validation = validateCurriculumPlan(draft);
    const report = {
      anchorType: draft.anchor?.type,
      sourceFiles: draft.anchor?.sourceFiles || [],
      ranges: draft.anchor?.ranges || [],
      targetAudience: draft.targetAudience,
      duration: draft.duration,
      recognizedTopics: draft.days.flatMap((day) => day.topics || []).map((topic) => topic.title),
      dayDistribution: draft.days.map((day) => ({ dayNumber: day.dayNumber, estimatedUE: day.estimatedUE, topicCount: day.topics.length })),
      unassignedTopics: draft.unassignedTopics,
      warnings: [...(draft.warnings || []), ...validation.warnings],
      aiMode: 'local',
      status: draft.status,
      validation
    };
    const saved = store.saveDraft(draft, { outline, analysisReport: report });
    const draftDir = path.join(store.rootDir, draft.id);
    fs.writeFileSync(path.join(draftDir, 'analysis-report.html'), renderCurriculumReport(saved, validation), 'utf8');
    writeJson(path.join(draftDir, 'analysis-report.json'), report);
    return { ...saved, validation, analysisReport: report };
  }

  function getRequiredDraft(draftId) {
    const draft = getCurriculumDraft(draftId);
    if (!draft) throw new Error('CurriculumPlanDraft wurde nicht gefunden.');
    return draft;
  }

  return {
    rootDir: store.rootDir,
    ensurePlanner,
    createCurriculumAnchor,
    analyzeCurriculumAnchor,
    getCurriculumDraft,
    updateCurriculumDraft,
    moveCurriculumTopic,
    approveCurriculumDraft,
    listCurriculumDrafts,
    removeCurriculumDraft
  };
}

function publicSourceFile(file = {}) {
  return {
    name: file.name || file.originalFilename || path.basename(file.path || ''),
    path: file.path || file.sourcePath || '',
    size: Number(file.size || 0),
    type: file.type || ''
  };
}

function mergeDraft(draft, patch) {
  return {
    ...draft,
    ...patch,
    course: { ...draft.course, ...(patch.course || {}) },
    targetAudience: { ...draft.targetAudience, ...(patch.targetAudience || {}) },
    duration: { ...draft.duration, ...(patch.duration || {}) },
    anchor: { ...draft.anchor, ...(patch.anchor || {}) },
    days: patch.days || draft.days
  };
}

function recalculateDays(draft) {
  (draft.days || []).forEach((day) => {
    day.topics = (day.topics || []).map((topic, index) => ({ ...topic, order: index + 1 }));
    day.estimatedUE = day.topics.reduce((sum, topic) => sum + Number(topic.estimatedUE || 0), 0);
    day.mainTopic = day.topics[0]?.title || day.mainTopic || '';
    day.learningGoals = day.topics.filter((topic) => topic.active !== false).map((topic) => `${topic.title} verstehen und anwenden.`);
    day.warnings = [];
    if (!day.topics.length) day.warnings.push('Tag ist noch leer.');
    if (day.estimatedUE > Number(draft.duration?.uePerDay || 9)) day.warnings.push('Tag ist moeglicherweise ueberladen.');
  });
}

function slug(value) {
  return String(value || 'kurs').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kurs';
}

module.exports = {
  createCurriculumPlannerService
};
