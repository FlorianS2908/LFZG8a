const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { normalizeWorkFormat, normalizeCanonicalPlan, validateCanonicalPlan, enrichPlanWithContainerConfiguration, toClassbookModel } = require('../app/lib/content-factory/course-planning/canonical-course-plan');
const { exportCoursePlanXlsx, HEADERS } = require('../app/lib/content-factory/course-planning/course-plan-xlsx-exporter');

function plan(counts = [2, 2]) {
  let global = 0;
  return { courseId: 'kurs-1', title: 'Netzwerk & Sicherheit', days: counts.map((count, d) => ({ dayNumber: d + 1, units: Array.from({ length: count }, (_, u) => ({ id: `d${d + 1}u${u + 1}`, dayNumber: d + 1, unitNumber: u + 1, globalUnitNumber: ++global, durationMinutes: 45, topic: `Thema ${global}`, content: `Konkreter Inhalt ${global}`, competencyGoal: `Kompetenz ${global} anwenden`, workFormat: { key: 'guided_practice', label: 'Geführte Übung' }, sourceReferences: [{ documentId: 'quelle', location: `Zeile ${global}` }], warnings: global === 2 ? ['Prüfen'] : [], assumptions: [], tasks: [] })) })) };
}

test('kanonischer Unterrichtsplan validiert feste und variable UE-Verteilungen streng', () => {
  assert.equal(validateCanonicalPlan(plan(), { totalDays: 2, totalUnits: 4, unitsByDay: [2, 2], unitDurationMinutes: 45 }, new Set(['quelle'])).status, 'passed');
  assert.equal(validateCanonicalPlan(plan([1, 3]), { totalDays: 2, totalUnits: 4, unitsByDay: [1, 3], unitDurationMinutes: 45 }).status, 'passed');
  const incomplete = plan(); delete incomplete.days[0].units[0].content; delete incomplete.days[0].units[1].competencyGoal; incomplete.days[1].units[0].workFormat = {};
  const incompleteValidation = validateCanonicalPlan(incomplete, { totalDays: 2, totalUnits: 4, unitsByDay: [2, 2] });
  assert.match(incompleteValidation.errors.join(' '), /Inhalt fehlt.*Kompetenzziel fehlt/s);
  assert.doesNotMatch(incompleteValidation.errors.join(' '), /Arbeitsform/);
  assert.equal(incompleteValidation.value.days[1].units[0].workFormat.source, 'inferred');
});

test('Legacy-Lernziel wird migriert und Quellen bleiben erhalten', () => {
  const migrated = normalizeCanonicalPlan({ days: [{ dayNumber: 1, units: [{ topic: 'T', content: 'I', preliminaryLearningObjective: 'Altes Ziel', workFormat: 'individual', sourceReferences: [{ documentId: 'd1' }] }] }] }, { totalDays: 1, totalUnits: 1 });
  assert.equal(migrated.days[0].units[0].competencyGoal, 'Altes Ziel');
  assert.equal(migrated.days[0].units[0].sourceReferences[0].documentId, 'd1');
});

test('Arbeitsformen werden tolerant normalisiert, lokal abgeleitet und als Warnung statt Komplettfehler behandelt', () => {
  assert.equal(normalizeWorkFormat('Geführte Übung').key, 'guided_practice');
  assert.equal(normalizeWorkFormat({ name: 'Gruppenarbeit' }).key, 'group');
  assert.equal(normalizeWorkFormat(['Partnerarbeit']).key, 'pair');
  assert.equal(normalizeWorkFormat('Gemeinsame Code-Analyse').key, 'custom');
  const migrated = normalizeCanonicalPlan({ days: [{ units: [
    { topic: 'Demo', content: 'Der Trainer demonstriert den Ablauf', competencyGoal: 'Ablauf nachvollziehen', learningFormat: 'Demonstration' },
    { topic: 'Praxis', content: 'Das Verfahren anwenden', competencyGoal: 'Aufgabe lösen' }
  ] }] }, { totalDays: 1, totalUnits: 2 });
  assert.equal(migrated.days[0].units[0].workFormat.key, 'demonstration');
  assert.equal(migrated.days[0].units[1].workFormat.key, 'guided_practice');
  const validation = validateCanonicalPlan(migrated, { totalDays: 1, totalUnits: 2, unitsByDay: [2] });
  assert.equal(validation.status, 'passed');
});

test('Container-Anreicherung erhält UE-Zuordnung und liefert Klassenbuchmodell verlustfrei', () => {
  const base = plan(); const enriched = enrichPlanWithContainerConfiguration(base, { didacticCourse: { didacticSequence: ['introduction', 'practice'], materialOutputs: ['handout'], successChecks: ['quiz'], differentiationFeatures: ['support'], technicalEnvironment: ['browser'] } });
  assert.deepEqual(enriched.days.flatMap((d) => d.units.map((u) => [u.id, u.globalUnitNumber])), base.days.flatMap((d) => d.units.map((u) => [u.id, u.globalUnitNumber])));
  assert.ok(enriched.days[0].units[0].teacherActivity);
  const classbook = toClassbookModel(enriched); assert.equal(classbook.days[0].units[0].ueId, 'd1u1'); assert.deepEqual(classbook.days[0].units[0].competenceGoals, ['Kompetenz 1 anwenden']);
});

test('XLSX-Export enthält genau eine Datenzeile je UE und überschreibt nicht still', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'course-plan-')); const target = path.join(dir, 'unterrichtsplan.xlsx');
  const result = exportCoursePlanXlsx(plan(), target); assert.equal(result.rowCount, 4); assert.equal(HEADERS.length, 20); assert.ok(fs.statSync(target).size > 1000);
  assert.throws(() => exportCoursePlanXlsx(plan(), target), (error) => error.code === 'COURSE_PLAN_EXPORT_EXISTS');
  fs.rmSync(dir, { recursive: true, force: true });
});
