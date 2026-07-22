const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDefaultContainerProfile, validateContainerProfile } = require('../app/lib/content-factory/container-profile/container-profile-types');
const { createDidacticCourseConfiguration, validateDidacticCourseConfiguration, summarizeDidacticCourseConfiguration, DIDACTIC_SEQUENCES } = require('../app/lib/content-factory/container-profile/didactic-course-configuration');
const { applyPreset } = require('../app/lib/content-factory/presets/preset-service');
const { buildContainerProfile } = require('../app/lib/content-factory/container-profile/container-profile-service');

test('neue Konfiguration besitzt versionierte didaktische Standardwerte', () => {
  const value = createDidacticCourseConfiguration();
  assert.equal(value.schemaVersion, 2); assert.equal(value.technology, 'theory'); assert.equal(value.courseFormat, 'theory-exercises');
  assert.equal(value.didacticProfile, 'balanced'); assert.deepEqual(value.didacticSequence, DIDACTIC_SEQUENCES.balanced);
  assert.equal(value.entryLevel, 'basic'); assert.ok(value.materialOutputs.includes('handout'));
});

test('alte Kurstypen werden verlustarm migriert und unbekannte Werte bewahrt', () => {
  const java = createDefaultContainerProfile({ courseType: 'java-maven' });
  assert.equal(java.courseType, 'java-maven'); assert.equal(java.didacticCourse.technology, 'java-maven'); assert.ok(java.didacticCourse.technicalEnvironment.includes('maven-project'));
  const legacy = createDidacticCourseConfiguration({ courseType: 'legacy-special' });
  assert.equal(legacy.technology, 'theory'); assert.equal(legacy.legacyValues.courseType, 'legacy-special');
});

test('gemischte und benutzerdefinierte Werte werden zentral validiert', () => {
  assert.equal(validateDidacticCourseConfiguration({ technology: 'mixed-project', selectedTechnologies: ['java'] }).valid, false);
  assert.equal(validateDidacticCourseConfiguration({ technology: 'mixed-project', selectedTechnologies: ['java', 'sql'] }).valid, true);
  assert.equal(validateDidacticCourseConfiguration({ technology: 'custom', customTechnology: '   ' }).errors[0].code, 'CUSTOM_TECHNOLOGY_REQUIRED');
  assert.equal(validateDidacticCourseConfiguration({ technology: 'custom', customTechnology: 'Cyberphysische Systeme' }).valid, true);
  assert.equal(validateDidacticCourseConfiguration({ courseFormat: 'custom' }).errors[0].code, 'CUSTOM_COURSE_FORMAT_REQUIRED');
  assert.equal(validateDidacticCourseConfiguration({ didacticProfile: 'custom' }).errors[0].code, 'CUSTOM_DIDACTIC_PROFILE_REQUIRED');
});

test('Differenzierung, Wiederholung und Konflikte sind fachlich strukturiert', () => {
  const full = createDidacticCourseConfiguration({ differentiationProfile: 'full', entryLevel: 'mixed', successChecks: ['self-check', 'spaced-review'] });
  assert.equal(full.mixedLevelDifferentiation, true); assert.ok(full.differentiationFeatures.includes('alternative-explanation')); assert.ok(full.successChecks.includes('spaced-review'));
  assert.equal(validateDidacticCourseConfiguration({ technology: 'jupyter', technicalEnvironment: [] }).errors[0].code, 'NOTEBOOK_REQUIRED');
  assert.equal(validateDidacticCourseConfiguration({ didacticProfile: 'self-directed', successChecks: ['quiz'] }).warnings[0].code, 'SELF_CHECK_RECOMMENDED');
});

test('Preset setzt Empfehlungen per Merge und bleibt manuell überschreibbar', () => {
  const applied = applyPreset('python-jupyter', { containerProfile: { teacherSolutions: false, didacticCourse: { customAudience: 'Bleibt' } } });
  assert.equal(applied.containerProfile.didacticCourse.technology, 'jupyter'); assert.equal(applied.containerProfile.didacticCourse.customAudience, 'Bleibt'); assert.equal(applied.containerProfile.teacherSolutions, true);
  applied.containerProfile.didacticCourse.didacticProfile = 'project-oriented';
  assert.equal(applied.containerProfile.didacticCourse.didacticProfile, 'project-oriented');
  assert.match(applied.presetWarnings[0], /Vorschlaege/);
});

test('Servicegrenze lehnt ungültige Konfiguration mit stabilem Fehlercode ab', () => {
  assert.throws(() => buildContainerProfile({ containerProfile: { didacticCourse: { technology: 'custom', customTechnology: '' } } }), (error) => error.code === 'CONTAINER_PROFILE_INVALID');
  const valid = buildContainerProfile({ containerProfile: { courseType: 'theory' }, curriculumPlan: { days: [] } });
  assert.equal(valid.containerProfile.didacticCourse.schemaVersion, 2); assert.ok(Array.isArray(valid.configurationWarnings));
});

test('Containerprofil serialisiert und lädt die Konfiguration erneut', () => {
  const profile = createDefaultContainerProfile({ courseType: 'python', didacticCourse: { courseFormat: 'practice', didacticProfile: 'strongly-guided' } });
  const loaded = createDefaultContainerProfile(JSON.parse(JSON.stringify(profile)));
  assert.deepEqual(loaded.didacticCourse, profile.didacticCourse); assert.equal(validateContainerProfile(loaded).valid, true);
  assert.match(summarizeDidacticCourseConfiguration(loaded.didacticCourse), /practice/);
});

test('Renderer trennt Fachlichkeit und Upload nutzt komponentenbasierte 3-2-1-Spalten', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8'); const css = fs.readFileSync(path.join(root, 'content-factory.css'), 'utf8'); const upload = fs.readFileSync(path.join(root, 'factory-upload-utils.js'), 'utf8');
  for (const label of ['Fachgebiet / Technologie', 'Kursformat', 'Didaktisches Profil', 'Zielgruppe', 'Einstiegsniveau', 'Didaktische Feineinstellungen', 'Kurszusammenfassung', 'Welche Materialien entstehen?', 'Welche technische Umgebung wird benötigt?']) assert.match(ui, new RegExp(label.replace(/[?]/g, '\\?')));
  assert.match(css, /\.upload-grid-container \{ container-type: inline-size/); assert.match(css, /@container \(min-width: 38rem\)/); assert.match(css, /repeat\(2/); assert.match(css, /@container \(min-width: 57rem\)/); assert.match(css, /repeat\(3/);
  assert.match(upload, /Dateien ablegen oder auswählen/); assert.match(upload, /Mehrfachauswahl möglich/); assert.match(upload, /Weitere Formate/);
  assert.match(ui, /zone\.addEventListener\('keydown'/); assert.match(ui, /event\.key === 'Enter'/); assert.match(ui, /event\.key === ' '/);
});
