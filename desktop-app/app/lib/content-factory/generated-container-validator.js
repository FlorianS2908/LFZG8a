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
    const content = readText(filePath);
    if ((lower.startsWith('teilnehmer/') || lower === 'catalog/participant-content.json') && /loesung|lösung|solution/i.test(lower + content)) {
      errors.push(`Teilnehmerbereich enthaelt Loesungshinweis: ${relative}`);
    }
    if (/reference-library|chunks\.json|extracted\.json|original|originaltext|buchseite/.test(lower + content)) {
      errors.push(`Referenz-/Rohdaten duerfen nicht exportiert werden: ${relative}`);
    }
    if (/\.(epub|pdf)$/i.test(relative) && /buch|book|referenz|literatur|reference/i.test(relative)) {
      errors.push(`Referenzbuch im Export blockiert: ${relative}`);
    }
    if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(content) && /referenz|reference|source-map|report/i.test(relative)) {
      errors.push(`Moegliche E-Mail-Adresse aus Referenzquelle im Export: ${relative}`);
    }
    if (lower === 'source-map.json') {
      const sourceMap = readJson(filePath, {});
      const serialized = JSON.stringify(sourceMap);
      if (/textPreview|chunk|rawText|original/i.test(serialized)) errors.push('source-map.json enthaelt Rohtext-/Preview-Felder.');
      if (serialized.length > 25000) warnings.push('source-map.json ist ungewoehnlich gross und sollte geprueft werden.');
    }
    if (!/^source-map\.json$|^reports\//.test(relative)) {
      const legacyNames = detectLegacyNames(content);
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
