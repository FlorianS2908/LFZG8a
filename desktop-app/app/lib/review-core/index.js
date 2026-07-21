(function initReviewCore(globalScope) {
  const STATUSES = Object.freeze(['locked', 'editing', 'ready_for_review', 'review_running', 'changes_requested', 'ready_for_approval', 'review_passed', 'review_failed', 'review_error']);
  const TRANSITIONS = Object.freeze({
    locked: ['editing'], editing: ['ready_for_review'], ready_for_review: ['review_running', 'editing'],
    review_running: ['changes_requested', 'ready_for_approval', 'review_failed', 'review_error'],
    changes_requested: ['editing', 'review_running'], ready_for_approval: ['review_passed', 'changes_requested', 'editing'],
    review_passed: ['editing'], review_failed: ['editing', 'review_running'], review_error: ['review_running', 'editing']
  });

  function createPhaseProgress(phaseId, initial = 'editing') {
    if (!STATUSES.includes(initial)) throw new Error(`Unbekannter Reviewstatus: ${initial}`);
    return { phaseId, completionPassed: false, reviewPassed: false, reviewStatus: initial, reviewIteration: 0, history: [], comments: [] };
  }

  function transition(progress, nextStatus, meta = {}) {
    const current = progress?.reviewStatus || 'locked';
    if (!(TRANSITIONS[current] || []).includes(nextStatus)) throw new Error(`Ungültiger Reviewübergang: ${current} -> ${nextStatus}`);
    return {
      ...progress,
      ...meta,
      reviewStatus: nextStatus,
      completionPassed: nextStatus === 'ready_for_review' ? true : Boolean(progress.completionPassed),
      reviewPassed: nextStatus === 'review_passed',
      reviewIteration: nextStatus === 'review_running' ? Number(progress.reviewIteration || 0) + 1 : Number(progress.reviewIteration || 0),
      completedAt: nextStatus === 'ready_for_review' ? new Date().toISOString() : progress.completedAt,
      reviewedAt: ['changes_requested', 'ready_for_approval', 'review_failed'].includes(nextStatus) ? new Date().toISOString() : progress.reviewedAt,
      approvedAt: nextStatus === 'review_passed' ? new Date().toISOString() : progress.approvedAt
    };
  }

  function validateDefinition(definition) {
    const errors = [];
    ['id', 'version', 'name', 'phaseId', 'promptTemplateId', 'outputSchemaId'].forEach((key) => { if (!String(definition?.[key] || '').trim()) errors.push(`${key} fehlt`); });
    if (!['phase', 'task', 'artifact'].includes(definition?.scope)) errors.push('scope ist ungültig');
    if (!Array.isArray(definition?.criteria) || !definition.criteria.length) errors.push('criteria fehlen');
    const ids = new Set();
    (definition?.criteria || []).forEach((criterion, index) => {
      if (!criterion.id || ids.has(criterion.id)) errors.push(`Kriterium ${index + 1} hat keine eindeutige ID`);
      ids.add(criterion.id);
      if (!(Number(criterion.weight) > 0)) errors.push(`Kriterium ${criterion.id || index + 1} hat kein gültiges Gewicht`);
    });
    if (!(Number(definition?.passRules?.minimumScore) >= 0 && Number(definition?.passRules?.minimumScore) <= 100)) errors.push('minimumScore muss zwischen 0 und 100 liegen');
    if (errors.length) throw new Error(`Ungültige Review-Definition ${definition?.id || '<ohne ID>'}: ${errors.join('; ')}`);
    return { ...definition };
  }

  function validateResult(result, definition) {
    const errors = [];
    ['schemaVersion', 'reviewId', 'definitionId', 'definitionVersion', 'summary'].forEach((key) => { if (!String(result?.[key] || '').trim()) errors.push(`${key} fehlt`); });
    if (!['passed', 'changes_requested', 'failed'].includes(result?.decision)) errors.push('decision ist ungültig');
    if (!(Number(result?.score) >= 0 && Number(result?.score) <= 100)) errors.push('score ist ungültig');
    if (!Array.isArray(result?.criteria) || !Array.isArray(result?.findings) || !Array.isArray(result?.proposedChanges)) errors.push('Ergebnislisten fehlen');
    (result?.findings || []).forEach((finding, index) => {
      if (!finding.id || !finding.criterionId || !['info', 'warning', 'blocking'].includes(finding.severity)) errors.push(`Finding ${index + 1} ist ungültig`);
      if (!Array.isArray(finding.evidence) || !finding.evidence.length || finding.evidence.some((evidence) => !evidence.artifactId)) errors.push(`Finding ${finding.id || index + 1} benötigt konkrete Evidenz`);
    });
    if (definition && result?.definitionId !== definition.id) errors.push('definitionId stimmt nicht überein');
    if (errors.length) throw new Error(`Ungültiges Review-Ergebnis: ${errors.join('; ')}`);
    return JSON.parse(JSON.stringify(result));
  }

  function evaluateResult(result, definition) {
    const validated = validateResult(result, definition);
    const blockers = validated.findings.filter((finding) => finding.severity === 'blocking' && finding.status === 'open');
    return { scorePassed: validated.score >= definition.passRules.minimumScore, blockers, eligibleForApproval: validated.score >= definition.passRules.minimumScore && (!definition.passRules.noBlockingFindings || blockers.length === 0) };
  }

  function migrateReviewState(project, phaseIds = []) {
    const existing = project?.reviewState?.phases || {};
    const phases = {};
    phaseIds.forEach((phaseId) => {
      phases[phaseId] = existing[phaseId] || createPhaseProgress(phaseId, project?.completedSteps?.includes?.(phaseId) ? 'ready_for_review' : 'editing');
      if (project?.completedSteps?.includes?.(phaseId)) phases[phaseId].completionPassed = true;
    });
    return { schemaVersion: '1.0', phases, reviews: Array.isArray(project?.reviewState?.reviews) ? project.reviewState.reviews : [], artifactVersions: project?.reviewState?.artifactVersions || {} };
  }

  function invalidateReview(progress, reason = 'Reviewrelevante Daten wurden geändert.') {
    if (!progress?.reviewPassed && progress?.reviewStatus !== 'ready_for_approval') return progress;
    return { ...progress, reviewPassed: false, reviewStatus: 'editing', invalidatedAt: new Date().toISOString(), invalidationReason: reason };
  }

  const api = { STATUSES, TRANSITIONS, createPhaseProgress, transition, validateDefinition, validateResult, evaluateResult, migrateReviewState, invalidateReview };
  globalScope.ModularReviewCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
