const INTERACTION_MODES = Object.freeze(['automatic', 'guided', 'strict']);
const DOCUMENT_ROLES = Object.freeze(['binding-source', 'course-plan', 'subject-source', 'exercises', 'solutions', 'handout', 'project-description', 'reference']);
const { resolveWorkflowFeatureFlags } = require('./workflow-feature-flags');

function normalizeCollaboration(project = {}) {
  return {
    ...project,
    interactionMode: INTERACTION_MODES.includes(project.interactionMode) ? project.interactionMode : 'guided',
    workflowFeatureFlags: resolveWorkflowFeatureFlags(project.workflowFeatureFlags),
    structuredRequirements: { targetGroup: '', priorKnowledge: '', difficultyProgression: '', theoryPracticeRatio: '', socialForms: [], maximumLectureMinutes: null, projectShare: '', examPreparation: false, desiredLearningTools: [], languageAndAddress: '', excludedContent: [], technicalEnvironment: '', accessibility: '', timeConflictPriority: '', individualNotes: '', ...(project.structuredRequirements || {}) },
    userCorrections: project.userCorrections || [], feedback: project.feedback || [], planLocks: project.planLocks || [], planVersions: project.planVersions || []
  };
}

function buildAiUnderstanding(project = {}) {
  const analyses = project.documentAnalyses || [];
  const documents = project.uploadedDocuments || [];
  const frame = project.structureFrame || project.planningFrame || {};
  return {
    courseDuration: { totalDays: Number(frame.totalDays || 0), totalUnits: Number(frame.totalUnits || 0), unitsPerDay: Number(frame.unitsPerDay || 0), unitDurationMinutes: Number(frame.unitDurationMinutes || 0) },
    documents: documents.map((item) => ({ documentId: item.id, name: item.originalFileName, role: item.declaredCategory || 'reference', priority: item.sourcePriority || 'normal', binding: item.bindingLevel === 'binding', ranges: item.selectedRanges || [] })),
    bindingSources: documents.filter((item) => item.bindingLevel === 'binding').map((item) => item.id),
    mainTopics: (project.topicCatalog?.topics || analyses.flatMap((item) => item.topics || [])).slice(0, 20),
    prerequisites: unique(analyses.flatMap((item) => item.prerequisites || [])), conflicts: analyses.flatMap((item) => item.conflicts || []),
    missingInformation: unique(analyses.flatMap((item) => item.missingInformation || [])), assumedPriorities: documents.filter((item) => !item.sourcePriority).map((item) => item.id),
    plannedOutcome: project.expectedOutcome || project.courseGoal || '', corrections: project.userCorrections || [],
    requiresConfirmation: requiresConfirmation(project.interactionMode, analyses.flatMap((item) => item.conflicts || []))
  };
}

function validateRanges(ranges = [], maximum = null) {
  const errors = []; const normalized = [];
  for (const [index, value] of ranges.entries()) {
    if (value.rangeType === 'entire_document' || value.type === 'entire_document') { normalized.push({ id: value.id || `range-${index + 1}`, rangeType: 'entire_document' }); continue; }
    const from = Number(value.from); const to = Number(value.to);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || (maximum && to > maximum)) errors.push({ index, code: 'DOCUMENT_RANGE_INVALID', message: `Bereich ${index + 1} ist ungültig.` });
    else normalized.push({ id: value.id || `range-${index + 1}`, rangeType: value.rangeType || value.type || 'pages', from, to });
  }
  return { valid: errors.length === 0, ranges: normalized, errors };
}

function revisePlanTarget(plan, { targetType, targetId, replacement, instruction = '' } = {}, locks = []) {
  const next = clone(plan); const locked = new Set(locks.map((item) => `${item.targetType}:${item.targetId}`));
  if (locked.has(`${targetType}:${targetId}`)) throw modelError('PLAN_TARGET_LOCKED', 'Der gewählte Planbereich ist gesperrt.');
  if (targetType === 'unit') {
    let found = false; next.days = (next.days || []).map((day) => ({ ...day, units: (day.units || []).map((unit) => { if (String(unit.id) !== String(targetId)) return unit; found = true; return { ...unit, ...clone(replacement), revisionInstruction: instruction }; }) }));
    if (!found) throw modelError('PLAN_TARGET_NOT_FOUND', 'Die Unterrichtseinheit wurde nicht gefunden.');
  } else if (targetType === 'day') {
    const index = (next.days || []).findIndex((day) => String(day.id || day.dayNumber) === String(targetId));
    if (index < 0) throw modelError('PLAN_TARGET_NOT_FOUND', 'Der Kurstag wurde nicht gefunden.');
    if ((next.days[index].units || []).some((unit) => locked.has(`unit:${unit.id}`))) throw modelError('PLAN_TARGET_CONTAINS_LOCK', 'Der Tag enthält gesperrte Unterrichtseinheiten.');
    next.days[index] = { ...next.days[index], ...clone(replacement), revisionInstruction: instruction };
  } else throw modelError('PLAN_TARGET_INVALID', 'Als Ziel sind Tag oder Unterrichtseinheit erlaubt.');
  return next;
}

function diffPlans(before = {}, after = {}) {
  const flatten = (plan) => (plan.days || []).flatMap((day) => (day.units || []).map((unit) => [`${day.dayNumber}:${unit.id || unit.unitNumber}`, unit]));
  const left = new Map(flatten(before)); const right = new Map(flatten(after)); const changes = [];
  for (const key of new Set([...left.keys(), ...right.keys()])) if (JSON.stringify(left.get(key)) !== JSON.stringify(right.get(key))) changes.push({ targetId: key, before: left.get(key) || null, after: right.get(key) || null });
  return { changedUnits: changes.length, changes };
}
function requiresConfirmation(mode, conflicts) { return mode === 'strict' || (mode !== 'automatic' && conflicts.some((item) => item.blocking || item.severity === 'critical')); }
function unique(values) { return [...new Map(values.filter(Boolean).map((item) => [JSON.stringify(item), item])).values()]; }
function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }
function modelError(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { INTERACTION_MODES, DOCUMENT_ROLES, normalizeCollaboration, buildAiUnderstanding, validateRanges, revisePlanTarget, diffPlans };
