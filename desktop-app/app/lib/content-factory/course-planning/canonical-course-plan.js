const WORK_FORMATS = Object.freeze({ lecture: 'Lehrgespräch', demonstration: 'Demonstration', guided_practice: 'Geführte Übung', individual: 'Einzelarbeit', pair: 'Partnerarbeit', group: 'Gruppenarbeit', project: 'Projektarbeit', self_study: 'Selbstlernphase', assessment: 'Lernstandskontrolle', custom: 'Individuelle Arbeitsform' });
const WORK_FORMAT_ALIASES = Object.freeze({
  lecture: ['lecture', 'lehrgespräch', 'lehrgespraech', 'vortrag', 'input', 'frontalunterricht', 'erklärung', 'erklaerung'],
  demonstration: ['demonstration', 'demo', 'vormachen', 'vorführung', 'vorfuehrung'],
  guided_practice: ['guided_practice', 'guided practice', 'guided exercise', 'geführte übung', 'gefuehrte uebung', 'angeleitete übung', 'angeleitete uebung', 'gemeinsame übung', 'praxisübung mit trainer'],
  individual: ['individual', 'individual work', 'einzelarbeit', 'selbstständig bearbeiten', 'selbststaendig bearbeiten'],
  pair: ['pair', 'pair work', 'partnerarbeit', 'tandemarbeit'],
  group: ['group', 'group work', 'gruppenarbeit', 'teamarbeit'],
  project: ['project', 'project work', 'projekt', 'projektarbeit'],
  self_study: ['self_study', 'self study', 'selbststudium', 'selbstlernphase', 'selbstlernen'],
  assessment: ['assessment', 'prüfung', 'pruefung', 'lernstandskontrolle', 'lernzielkontrolle', 'test', 'quiz']
});

function normalizeCanonicalPlan(plan = {}, context = {}) {
  let global = 0;
  const days = (plan.days || []).map((day, dayIndex) => ({ ...day, dayNumber: Number(day.dayNumber || dayIndex + 1), id: day.id || `day-${day.dayNumber || dayIndex + 1}`, units: (day.units || []).map((raw, unitIndex) => {
    global += 1; const dayNumber = Number(day.dayNumber || dayIndex + 1); const unitNumber = Number(raw.unitNumber || unitIndex + 1);
    return {
      ...raw, schemaVersion: 1, id: raw.id || `day-${dayNumber}-unit-${unitNumber}`, dayNumber, unitNumber,
      globalUnitNumber: Number(raw.globalUnitNumber || global), durationMinutes: Number(raw.durationMinutes || context.unitDurationMinutes || 45),
      topic: text(raw.topic), content: text(raw.content), competencyGoal: text(raw.competencyGoal || raw.preliminaryLearningObjective || raw.learningObjective),
      workFormat: normalizeWorkFormat(firstDefined(raw.workFormat, raw.workForm, raw.learningFormat, raw.arbeitsform, raw.method, raw.methods), raw), didacticPhase: text(raw.didacticPhase || raw.reservedPhase), teacherActivity: text(raw.teacherActivity), learnerActivity: text(raw.learnerActivity),
      tasks: array(raw.tasks), materials: array(raw.materials || raw.materialRequirements), assessments: array(raw.assessments), differentiation: array(raw.differentiation),
      expectedOutcome: text(raw.expectedOutcome), evaluation: text(raw.evaluation), notes: text(raw.notes), sourceReferences: array(raw.sourceReferences), warnings: array(raw.warnings), assumptions: array(raw.assumptions), status: raw.status || raw.reviewStatus || 'draft'
    };
  }) }));
  return { ...plan, schemaVersion: 1, courseId: plan.courseId || context.courseId || '', title: plan.title || context.title || '', totalDays: Number(context.totalDays || days.length), totalUnits: Number(context.totalUnits || global), unitDurationMinutes: Number(context.unitDurationMinutes || 45), days };
}

function validateCanonicalPlan(plan = {}, frame = {}, knownDocumentIds = null) {
  const value = normalizeCanonicalPlan(plan, { courseId: plan.courseId, title: plan.title, ...frame }); const errors = []; const warnings = []; const keys = new Set(); const units = value.days.flatMap((day) => day.units);
  if (value.days.length !== Number(frame.totalDays)) errors.push(`Erwartet werden ${frame.totalDays} Kurstage.`);
  if (units.length !== Number(frame.totalUnits)) errors.push(`Erwartet werden genau ${frame.totalUnits} UE, erhalten: ${units.length}.`);
  value.days.forEach((day, dayIndex) => {
    if (day.dayNumber !== dayIndex + 1) errors.push(`Tag ${dayIndex + 1} ist nicht lückenlos nummeriert.`);
    const expected = Array.isArray(frame.unitsByDay) ? Number(frame.unitsByDay[dayIndex]) : Number(frame.unitsPerDay || 0);
    if (expected && day.units.length !== expected) errors.push(`Tag ${day.dayNumber}: erwartet ${expected} UE, erhalten ${day.units.length}.`);
    day.units.forEach((unit, unitIndex) => {
      const key = `${unit.dayNumber}:${unit.unitNumber}`; if (keys.has(key)) errors.push(`UE ${key} ist doppelt.`); keys.add(key);
      if (unit.unitNumber !== unitIndex + 1) errors.push(`Tag ${day.dayNumber}: UE ${unitIndex + 1} ist nicht lückenlos nummeriert.`);
      const expectedGlobal = value.days.slice(0, dayIndex).reduce((sum, item) => sum + item.units.length, 0) + unitIndex + 1;
      if (unit.globalUnitNumber !== expectedGlobal) errors.push(`UE ${key}: globale Nummer muss ${expectedGlobal} sein.`);
      if (!unit.topic) errors.push(`UE ${key}: Thema fehlt.`); if (!unit.content) errors.push(`UE ${key}: Inhalt fehlt.`); if (!unit.competencyGoal) errors.push(`UE ${key}: Kompetenzziel fehlt.`);
      if (!unit.workFormat?.key || !WORK_FORMATS[unit.workFormat.key]) errors.push(`UE ${key}: strukturierte Arbeitsform fehlt oder ist ungültig.`);
      else if (unit.workFormat.key === 'custom' || Number(unit.workFormat.confidence) < 0.65) warnings.push(`UE ${key}: Arbeitsform „${unit.workFormat.label}“ wurde automatisch übernommen oder mit geringer Sicherheit abgeleitet.`);
      if (knownDocumentIds) unit.sourceReferences.forEach((reference) => { if (!knownDocumentIds.has(reference.documentId)) errors.push(`UE ${key}: unbekannte Dokument-ID ${reference.documentId}.`); });
    });
  });
  return { status: errors.length ? 'failed' : 'passed', errors, warnings, value };
}

function enrichPlanWithContainerConfiguration(plan, containerProfile = {}) {
  const config = containerProfile.didacticCourse || {}; const sequence = config.didacticSequence || [];
  const value = normalizeCanonicalPlan(plan, plan); let index = 0;
  value.days = value.days.map((day) => ({ ...day, units: day.units.map((unit) => {
    const phase = unit.didacticPhase || sequence[index++ % Math.max(1, sequence.length)] || 'practice';
    return { ...unit, didacticPhase: phase, teacherActivity: unit.teacherActivity || teacherActivity(phase), learnerActivity: unit.learnerActivity || learnerActivity(phase),
      materials: mergeUnique(unit.materials, (config.materialOutputs || []).map((type) => ({ type, source: 'container-configuration' }))),
      assessments: mergeUnique(unit.assessments, assessmentFor(unit, config)), differentiation: mergeUnique(unit.differentiation, (config.differentiationFeatures || []).map((type) => ({ type }))),
      technicalEnvironment: [...(config.technicalEnvironment || [])], enrichment: { schemaVersion: 1, applied: true, configurationSchemaVersion: config.schemaVersion || 1 }, expectedOutcome: unit.expectedOutcome || unit.competencyGoal
    };
  }) }));
  return value;
}

function toClassbookModel(plan) {
  const value = normalizeCanonicalPlan(plan, plan);
  return { schemaVersion: 1, courseId: value.courseId, courseLabel: value.title, days: value.days.map((day) => ({ dayId: day.id, dayNumber: day.dayNumber, dayTitle: day.title || `Tag ${day.dayNumber}`, units: day.units.map((unit) => ({ courseId: value.courseId, dayId: day.id, ueId: unit.id, ueNumber: unit.unitNumber, globalUnitNumber: unit.globalUnitNumber, durationMinutes: unit.durationMinutes, title: unit.topic, contents: [unit.content], competenceGoals: [unit.competencyGoal], workForms: [unit.workFormat.label], assignedDailyTasks: unit.tasks, materials: unit.materials, remarks: unit.notes, status: unit.status })) })) };
}

function normalizeWorkFormat(value, unit = {}) {
  const raw = extractWorkFormatValue(value);
  const directKey = normalizeToken(raw);
  if (WORK_FORMATS[directKey]) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value.source || 'provided' : 'provided';
    const confidence = value && typeof value === 'object' && !Array.isArray(value) && Number.isFinite(Number(value.confidence)) ? Number(value.confidence) : 1;
    return formatResult(directKey, labelFrom(value) || WORK_FORMATS[directKey], source, confidence, value?.originalValue || raw);
  }
  const aliasKey = Object.keys(WORK_FORMAT_ALIASES).find((key) => WORK_FORMAT_ALIASES[key].some((alias) => normalizeToken(alias) === directKey));
  if (aliasKey) return formatResult(aliasKey, WORK_FORMATS[aliasKey], 'normalized', .95, raw);
  if (raw) return formatResult('custom', raw, 'provided', .6, raw);
  const inferred = inferWorkFormat(unit);
  return formatResult(inferred.key, WORK_FORMATS[inferred.key], 'inferred', inferred.confidence, '');
}
function extractWorkFormatValue(value) {
  if (Array.isArray(value)) return value.map(extractWorkFormatValue).find(Boolean) || '';
  if (value && typeof value === 'object') return value.key || value.label || value.name || value.value || '';
  return typeof value === 'string' ? value.trim() : '';
}
function labelFrom(value) { return value && typeof value === 'object' && !Array.isArray(value) ? text(value.label || value.name) : ''; }
function normalizeToken(value) { return text(value).toLocaleLowerCase('de').replace(/[-/]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/ /g, '_'); }
function inferWorkFormat(unit) {
  const haystack = [unit.topic, unit.content, unit.competencyGoal, unit.didacticPhase, unit.teacherActivity, unit.learnerActivity, ...(Array.isArray(unit.tasks) ? unit.tasks : [])].map((value) => typeof value === 'string' ? value : JSON.stringify(value || '')).join(' ').toLocaleLowerCase('de');
  const rules = [
    ['assessment', /lernstand|lernzielkontrolle|prüfung|pruefung|quiz|test\b/],
    ['project', /projekt|entwickeln|realisieren|umsetzen/],
    ['group', /gruppen|team|gemeinsam.*(?:diskutieren|erarbeiten|vergleichen)/],
    ['pair', /partner|tandem|zu zweit/],
    ['individual', /einzel|selbstständig|selbststaendig|eigenständig|eigenstaendig/],
    ['demonstration', /demonstr|vormachen|vorführ|vorfuehr/],
    ['guided_practice', /anwenden|übung|uebung|nachvollziehen|mit trainer|angeleitet|praxis/],
    ['self_study', /selbstlern|selbststudium|recherche/],
    ['lecture', /einführung|einfuehrung|überblick|ueberblick|grundlagen|erläutern|erklaeren/]
  ];
  const match = rules.find(([, pattern]) => pattern.test(haystack));
  return match ? { key: match[0], confidence: .78 } : { key: 'guided_practice', confidence: .55 };
}
function formatResult(key, label, source, confidence, originalValue) { return { key, label, source, confidence, ...(originalValue && normalizeToken(originalValue) !== key ? { originalValue } : {}) }; }
function firstDefined(...values) { return values.find((value) => value !== undefined && value !== null && value !== '') ?? ''; }
function assessmentFor(unit, config) { const checks = config.successChecks || []; return checks.length && (unit.unitNumber === 1 || unit.unitNumber % 3 === 0) ? checks.map((type) => ({ type })) : []; }
function teacherActivity(phase) { return /practice|application|implementation/.test(phase) ? 'Auftrag klären, beobachten und gezielt unterstützen' : 'Inhalt strukturiert erklären und Verständnis sichern'; }
function learnerActivity(phase) { return /practice|application|implementation/.test(phase) ? 'Aufgabe bearbeiten, Ergebnis dokumentieren und reflektieren' : 'Vorwissen aktivieren, Zusammenhänge erfassen und Rückfragen stellen'; }
function mergeUnique(a, b) { return [...new Map([...array(a), ...array(b)].map((item) => [JSON.stringify(item), item])).values()]; }
function array(value) { return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : []; }
function text(value) { return String(value || '').trim(); }

module.exports = { WORK_FORMATS, WORK_FORMAT_ALIASES, normalizeWorkFormat, normalizeCanonicalPlan, validateCanonicalPlan, enrichPlanWithContainerConfiguration, toClassbookModel };
