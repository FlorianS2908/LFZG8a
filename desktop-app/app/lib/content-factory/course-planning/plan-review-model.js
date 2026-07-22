const crypto = require('crypto');

const TYPES = new Set(['extraction_issue', 'source_conflict', 'internal_source_conflict', 'planning_conflict', 'missing_information', 'informational_note']);
const RELEVANCE = new Set(['blocking', 'review_required', 'informational', 'ignored_as_extraction_noise']);
const SEVERITY = new Set(['error', 'warning', 'info']);
const STATUSES = new Set(['open', 'ai_proposal_available', 'accepted_ai_proposal', 'kept_original', 'manually_resolved', 'marked_not_relevant']);
const FIELDS = new Set(['dayNumber', 'unitNumber', 'globalUnitNumber', 'durationMinutes', 'didacticPhase', 'topic', 'content', 'competencyGoal', 'workFormat', 'teacherActivity', 'learnerActivity', 'tasks', 'materials', 'assessments', 'differentiation', 'expectedOutcome', 'evaluation', 'notes', 'sourceReferences', 'status']);
const RESOLVED = new Set(['accepted_ai_proposal', 'kept_original', 'manually_resolved', 'marked_not_relevant']);

function normalizeReviewConflict(raw = {}, index = 0) {
  const type = TYPES.has(raw.type) ? raw.type : classify(raw);
  const noise = type === 'extraction_issue';
  return {
    conflictId: String(raw.conflictId || raw.id || `conflict-${index + 1}`), type,
    severity: SEVERITY.has(raw.severity) ? raw.severity : noise ? 'info' : raw.blocking ? 'error' : 'warning',
    relevance: RELEVANCE.has(raw.relevance) ? raw.relevance : noise ? 'ignored_as_extraction_noise' : raw.blocking ? 'blocking' : 'review_required',
    title: text(raw.title || raw.name || 'Prüfhinweis'), description: text(raw.description || raw.message || raw.summary),
    affectedSourceReferences: array(raw.affectedSourceReferences || raw.sourceReferences), affectedDayNumbers: numbers(raw.affectedDayNumbers),
    affectedUnitIds: strings(raw.affectedUnitIds), affectedFields: strings(raw.affectedFields), conflictingValues: array(raw.conflictingValues), evidence: array(raw.evidence),
    aiRecommendation: text(raw.aiRecommendation || raw.recommendation), proposedValue: raw.proposedValue ?? null, alternatives: array(raw.alternatives), confidence: finite(raw.confidence),
    resolutionStatus: STATUSES.has(raw.resolutionStatus) ? raw.resolutionStatus : raw.proposedValue !== undefined ? 'ai_proposal_available' : 'open',
    resolutionMethod: text(raw.resolutionMethod), resolvedValue: raw.resolvedValue ?? null, userComment: text(raw.userComment),
    createdAt: raw.createdAt || new Date().toISOString(), resolvedAt: raw.resolvedAt || ''
  };
}

function normalizePlanReview(plan = {}) {
  const source = [...(plan.conflicts || []), ...(plan.missingInformation || []).map((item) => ({ ...(typeof item === 'object' ? item : { description: item }), type: 'missing_information' }))];
  const deduped = new Map();
  source.map(normalizeReviewConflict).forEach((item) => {
    if (!item.affectedUnitIds.length && !item.affectedFields.length && ['blocking', 'review_required'].includes(item.relevance)) item.relevance = 'informational';
    const key = `${item.type}|${item.title.toLocaleLowerCase('de')}|${item.affectedUnitIds.sort().join(',')}|${item.affectedFields.sort().join(',')}`;
    if (!deduped.has(key)) deduped.set(key, item);
    else deduped.set(key, mergeConflict(deduped.get(key), item));
  });
  return { ...plan, conflicts: [...deduped.values()], reviewState: { confirmed: false, confirmedPlanningVersion: null, accepted: false, acceptedPlanningVersion: null, validatedAt: '', ...(plan.reviewState || {}) }, changeHistory: array(plan.changeHistory) };
}

function validatePlanReview(plan = {}) {
  const units = new Map((plan.days || []).flatMap((day) => (day.units || []).map((unit) => [unit.id, unit]))); const errors = [];
  for (const conflict of plan.conflicts || []) {
    if (!TYPES.has(conflict.type)) errors.push(`${conflict.conflictId}: unbekannter Konflikttyp.`);
    if (!RELEVANCE.has(conflict.relevance) || !STATUSES.has(conflict.resolutionStatus)) errors.push(`${conflict.conflictId}: ungültiger Reviewstatus.`);
    conflict.affectedUnitIds.forEach((id) => { if (!units.has(id)) errors.push(`${conflict.conflictId}: unbekannte UE ${id}.`); });
    conflict.affectedFields.forEach((field) => { if (!FIELDS.has(field)) errors.push(`${conflict.conflictId}: unbekanntes Feld ${field}.`); });
    if (conflict.relevance === 'blocking' && !conflict.description) errors.push(`${conflict.conflictId}: Blocker ohne Begründung.`);
  }
  const open = (plan.conflicts || []).filter((item) => ['blocking', 'review_required'].includes(item.relevance) && !RESOLVED.has(item.resolutionStatus));
  return { valid: !errors.length && !open.length, errors, open, blockingReasons: [...errors, ...open.map((item) => `${item.title}: Entscheidung fehlt.`)] };
}

function applyConflictDecision(plan, input = {}) {
  const value = normalizePlanReview(plan); const conflict = value.conflicts.find((item) => item.conflictId === input.conflictId);
  if (!conflict) throw coded('PLAN_CONFLICT_NOT_FOUND', 'Der Prüfhinweis wurde nicht gefunden.');
  if (!STATUSES.has(input.resolutionStatus) || !RESOLVED.has(input.resolutionStatus)) throw coded('PLAN_CONFLICT_DECISION', 'Die Entscheidung ist ungültig.');
  const finalValue = input.resolutionStatus === 'accepted_ai_proposal' ? conflict.proposedValue : input.resolutionStatus === 'manually_resolved' ? input.resolvedValue : undefined;
  if (['accepted_ai_proposal', 'manually_resolved'].includes(input.resolutionStatus) && finalValue === undefined) throw coded('PLAN_CONFLICT_VALUE', 'Für diese Entscheidung fehlt der endgültige Wert.');
  if (finalValue !== undefined) conflict.affectedUnitIds.forEach((id) => conflict.affectedFields.forEach((field) => editUnit(value, { unitId: id, fieldName: field, newValue: finalValue, changeOrigin: input.resolutionStatus === 'accepted_ai_proposal' ? 'accepted_ai_proposal' : 'conflict_resolution', reason: input.userComment }, false)));
  Object.assign(conflict, { resolutionStatus: input.resolutionStatus, resolutionMethod: input.resolutionStatus, resolvedValue: finalValue ?? conflict.resolvedValue, userComment: text(input.userComment), resolvedAt: new Date().toISOString() });
  invalidateConfirmation(value); return value;
}

function editUnit(plan, input = {}, invalidate = true) {
  if (!FIELDS.has(input.fieldName)) throw coded('PLAN_FIELD_INVALID', 'Dieses Planfeld kann nicht bearbeitet werden.');
  const unit = (plan.days || []).flatMap((day) => day.units || []).find((item) => item.id === input.unitId); if (!unit) throw coded('PLAN_UNIT_NOT_FOUND', 'Die Unterrichtseinheit wurde nicht gefunden.');
  const previousValue = clone(unit[input.fieldName]); setField(unit, input.fieldName, input.newValue);
  plan.changeHistory = [...(plan.changeHistory || []), { changeId: crypto.randomUUID(), planVersion: plan.planningVersion, unitId: unit.id, fieldName: input.fieldName, previousValue, newValue: clone(input.newValue), changeOrigin: input.changeOrigin || 'manual_edit', changedAt: new Date().toISOString(), reason: text(input.reason) }];
  (plan.conflicts || []).filter((item) => item.affectedUnitIds.includes(unit.id) && item.affectedFields.includes(input.fieldName)).forEach((item) => { if (input.changeOrigin === 'conflict_resolution') { item.resolutionStatus = 'manually_resolved'; item.resolvedValue = clone(input.newValue); item.resolvedAt = new Date().toISOString(); } else if (RESOLVED.has(item.resolutionStatus)) { item.resolutionStatus = 'open'; item.resolvedAt = ''; } });
  if (invalidate) invalidateConfirmation(plan); return plan;
}

function confirmPlanReview(plan) { const review = validatePlanReview(plan); if (!review.valid) throw coded('PLAN_REVIEW_BLOCKED', review.blockingReasons.join(' | ')); plan.reviewState = { ...(plan.reviewState || {}), confirmed: true, confirmedPlanningVersion: plan.planningVersion, accepted: false, acceptedPlanningVersion: null, validatedAt: new Date().toISOString(), confirmedAt: new Date().toISOString() }; return plan; }
function acceptPlanReview(plan) { if (!plan.reviewState?.confirmed || Number(plan.reviewState.confirmedPlanningVersion) !== Number(plan.planningVersion)) throw coded('PLAN_REVIEW_NOT_CONFIRMED', 'Der aktuelle Unterrichtsplan muss zuerst bestätigt werden.'); plan.reviewState = { ...plan.reviewState, accepted: true, acceptedPlanningVersion: plan.planningVersion, acceptedAt: new Date().toISOString() }; return plan; }
function invalidateConfirmation(plan) { plan.reviewState = { ...(plan.reviewState || {}), confirmed: false, confirmedPlanningVersion: null, accepted: false, acceptedPlanningVersion: null, invalidatedAt: new Date().toISOString() }; }
function classify(raw) { const value = `${raw.title || ''} ${raw.description || raw.message || ''}`.toLowerCase(); if (/\b(?:00000|3131|65535)\b|ocr|extraktion|seitennummer/.test(value)) return 'extraction_issue'; return raw.missing ? 'missing_information' : raw.internal ? 'internal_source_conflict' : 'source_conflict'; }
function mergeConflict(a, b) { return { ...a, affectedSourceReferences: unique([...a.affectedSourceReferences, ...b.affectedSourceReferences]), affectedDayNumbers: [...new Set([...a.affectedDayNumbers, ...b.affectedDayNumbers])], affectedUnitIds: [...new Set([...a.affectedUnitIds, ...b.affectedUnitIds])], affectedFields: [...new Set([...a.affectedFields, ...b.affectedFields])], evidence: unique([...a.evidence, ...b.evidence]) }; }
function setField(unit, field, value) { if (field === 'workFormat') { if (!value || typeof value !== 'object' || !value.key) throw coded('PLAN_FIELD_VALUE', 'Die Arbeitsform ist ungültig.'); } unit[field] = clone(value); }
function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function unique(values) { return [...new Map(values.map((item) => [JSON.stringify(item), item])).values()]; }
function array(value) { return Array.isArray(value) ? clone(value) : []; } function strings(value) { return array(value).map(String).filter(Boolean); } function numbers(value) { return array(value).map(Number).filter(Number.isFinite); } function text(value) { return String(value || '').trim(); } function finite(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { TYPES, RELEVANCE, SEVERITY, STATUSES, FIELDS, RESOLVED, normalizeReviewConflict, normalizePlanReview, validatePlanReview, applyConflictDecision, editUnit, confirmPlanReview, acceptPlanReview, invalidateConfirmation };
