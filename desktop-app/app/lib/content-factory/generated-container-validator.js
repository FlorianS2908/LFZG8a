const fs = require('fs');
const path = require('path');
const { detectLegacyNames } = require('./naming/legacy-name-detector');

function validateGeneratedContainer(containerDir, course = {}) {
  const errors = [];
  const warnings = [];
  const required = [
    'manifest.json',
    'catalog/days.json',
    'catalog/participant-content.json',
    'standalone/index.html',
    'platform/adapter.json'
  ];
  required.forEach((file) => {
    if (!fs.existsSync(path.join(containerDir, file))) errors.push(`Pflichtdatei fehlt: ${file}`);
  });
  const manifest = readJson(path.join(containerDir, 'manifest.json'), {});
  if (!manifest.runtimeModes?.standalone?.entry || !manifest.runtimeModes?.platform?.adapter) {
    errors.push('manifest.json enthaelt keine vollstaendigen runtimeModes.');
  }
  const days = readJson(path.join(containerDir, 'catalog', 'days.json'), []);
  const participant = readJson(path.join(containerDir, 'catalog', 'participant-content.json'), []);
  days.forEach((day) => ['teacherWeb', 'teacherTasks', 'teacherSolutions', 'participantWeb', 'participantTasks'].forEach((key) => {
    if (day[key] && !fs.existsSync(path.join(containerDir, day[key]))) errors.push(`Pfad aus days.json fehlt: ${day[key]}`);
  }));
  const releaseKeys = readJson(path.join(containerDir, 'catalog', 'release-keys.json'), []);
  if (new Set(releaseKeys).size !== releaseKeys.length) errors.push('ReleaseKeys sind nicht eindeutig.');
  walkFiles(containerDir).forEach((filePath) => {
    const relative = path.relative(containerDir, filePath).replace(/\\/g, '/');
    const lower = relative.toLowerCase();
    if (lower.startsWith('teilnehmer/') && /loesung|solution/.test(lower + readText(filePath))) {
      errors.push(`Teilnehmerbereich enthaelt Loesungshinweis: ${relative}`);
    }
    if (/reference-library|chunks\.json|extracted\.json|original/.test(lower)) {
      errors.push(`Referenz-/Rohdaten duerfen nicht exportiert werden: ${relative}`);
    }
    if (/\.(epub|pdf)$/i.test(relative) && /buch|book|referenz|literatur/i.test(relative)) {
      errors.push(`Referenzbuch im Export blockiert: ${relative}`);
    }
    if (!/^source-map\.json$|^reports\//.test(relative)) {
      const legacyNames = detectLegacyNames(readText(filePath));
      if (legacyNames.length) warnings.push(`${relative}: Legacy-Namen sichtbar (${legacyNames.join(', ')})`);
    }
  });
  if (!Array.isArray(participant)) errors.push('participant-content.json ist nicht korrekt strukturiert.');
  return { isValid: errors.length === 0, errors, warnings };
}

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

module.exports = {
  validateGeneratedContainer
};
