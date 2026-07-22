(function planningReviewModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CourseForgePlanningReview = api; root.ContentFactoryPlanningReview = api; }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createPlanningReview() {
  const LABELS = Object.freeze({ explicit: 'Direkt belegt', derived: 'Nachvollziehbar abgeleitet', generated: 'Klärung empfohlen', needs_review: 'Klärung empfohlen', conflicting: 'Konflikt vorhanden' });

  function normalizeConfidence(value) {
    if (value === null || value === undefined || value === '') return null;
    if (!['number', 'string'].includes(typeof value)) return null;
    const number = typeof value === 'number' ? value : Number(value.trim());
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : null;
  }

  function evidenceStatus(value = {}) {
    const origin = String(value.originStatus || '').toLowerCase();
    const confidence = normalizeConfidence(value.confidence);
    const label = LABELS[origin] || (confidence === null ? 'Klärung empfohlen' : confidence >= .8 ? 'Direkt belegt' : confidence >= .5 ? 'Nachvollziehbar abgeleitet' : 'Klärung empfohlen');
    return { label, tone: origin === 'conflicting' ? 'conflict' : label === 'Direkt belegt' ? 'direct' : label === 'Nachvollziehbar abgeleitet' ? 'derived' : 'review', confidence, supplementaryText: confidence === null ? '' : `${Math.round(confidence * 100)} %` };
  }

  function compactSource(reference = {}) {
    const document = reference.fileName || reference.documentName || reference.documentId || 'Quelle';
    const location = reference.sheetName || (reference.slide ? `Folie ${reference.slide}` : reference.page ? `Seite ${reference.page}` : reference.location || reference.sourceRef || '');
    return location ? `${document} · ${location}` : document;
  }

  return { normalizeConfidence, evidenceStatus, compactSource };
}));
