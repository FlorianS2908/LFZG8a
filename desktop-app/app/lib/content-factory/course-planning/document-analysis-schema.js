const ARRAY_FIELDS = [
  'topics', 'learningObjectives', 'competencies', 'exercises', 'solutions', 'assessments',
  'materials', 'prerequisites', 'chronologyDependencies', 'relevantSections', 'irrelevantSections',
  'conflicts', 'missingInformation', 'warnings', 'reviewItems', 'sourceReferences'
];

function normalizeDocumentAnalysis(value = {}, context = {}) {
  const changes = [];
  const normalized = { ...value };
  normalized.schemaVersion = 1;
  normalized.documentId = String(value.documentId || context.documentId || '');
  normalized.documentType = String(value.documentType || context.documentType || 'unknown');
  if (typeof value.detectedCategory === 'string') {
    normalized.detectedCategory = { value: value.detectedCategory, confidence: 0, reason: '' };
    changes.push('detectedCategory:string->object');
  } else {
    normalized.detectedCategory = {
      value: String(value.detectedCategory?.value || ''),
      confidence: clampConfidence(value.detectedCategory?.confidence),
      reason: String(value.detectedCategory?.reason || '')
    };
  }
  if (typeof value.summary === 'string') {
    normalized.summary = { short: value.summary, detailed: value.summary };
    changes.push('summary:string->object');
  } else {
    normalized.summary = { short: String(value.summary?.short || ''), detailed: String(value.summary?.detailed || value.summary?.short || '') };
  }
  for (const field of ARRAY_FIELDS) {
    if (value[field] === undefined || value[field] === null) {
      normalized[field] = [];
      changes.push(`${field}:missing->array`);
    } else if (Array.isArray(value[field])) normalized[field] = value[field];
    else if (isPlainObject(value[field])) {
      normalized[field] = [value[field]];
      changes.push(`${field}:object->array`);
    } else normalized[field] = value[field];
  }
  normalized.reviewRequired = value.reviewRequired === true;
  normalized.confidence = clampConfidence(value.confidence);
  normalized.normalizationWarnings = changes;
  return { value: normalized, changes };
}

function validateDocumentAnalysis(value = {}) {
  const errors = [];
  if (value.schemaVersion !== 1) errors.push(detail('schemaVersion', '1', typeof value.schemaVersion));
  if (!value.documentId) errors.push(detail('documentId', 'nichtleerer String', typeof value.documentId));
  if (!isPlainObject(value.detectedCategory)) errors.push(detail('detectedCategory', 'Objekt', typeOf(value.detectedCategory)));
  if (!isPlainObject(value.summary)) errors.push(detail('summary', 'Objekt', typeOf(value.summary)));
  else if (!value.summary.short) errors.push(detail('summary.short', 'nichtleerer String', typeof value.summary.short));
  for (const field of ARRAY_FIELDS) if (!Array.isArray(value[field])) errors.push(detail(field, 'Array', typeOf(value[field])));
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) errors.push(detail('confidence', 'Zahl zwischen 0 und 1', typeof value.confidence));
  return { valid: errors.length === 0, errors };
}

function detail(path, expected, received) {
  return { code: 'DOCUMENT_ANALYSIS_SCHEMA', path, expected, received, message: `${path} muss ${expected} sein (empfangen: ${received}).` };
}
function clampConfidence(value) { const number = Number(value); return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0; }
function isPlainObject(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function typeOf(value) { return value === null ? 'null' : Array.isArray(value) ? 'Array' : typeof value; }

module.exports = { ARRAY_FIELDS, normalizeDocumentAnalysis, validateDocumentAnalysis };
