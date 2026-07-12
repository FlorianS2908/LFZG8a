const fs = require('fs');
const path = require('path');
const { detectLegacyNames } = require('./naming/legacy-name-detector');
const { validateDemoTarget } = require('./demo-targets/demo-target-validator');

function validateGeneratedContainer(containerDir, course = {}) {
  const errors = [];
  const warnings = [];
  const required = [
    'manifest.json',
    'catalog/days.json',
    'catalog/participant-content.json',
    'standalone/index.html',
    'platform/adapter.json',
    'reports/testprotokoll.json',
    'reports/testprotokoll.html'
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
  const demoTargets = readJson(path.join(containerDir, 'catalog', 'demo-targets.json'), []);
  const didacticProfile = readJson(path.join(containerDir, 'catalog', 'didactic-profile.json'), {});
  const releasePlan = readJson(path.join(containerDir, 'catalog', 'release-plan.json'), []);
  days.forEach((day) => ['teacherWeb', 'teacherTasks', 'teacherSolutions', 'participantWeb', 'participantTasks'].forEach((key) => {
    if (day[key] && !fs.existsSync(path.join(containerDir, day[key]))) errors.push(`Pfad aus days.json fehlt: ${day[key]}`);
  }));
  days.forEach((day) => (day.artifacts || []).forEach((artifact) => {
    if (artifact.path && !fs.existsSync(path.join(containerDir, artifact.path))) errors.push(`Artefakt fehlt: ${artifact.path}`);
    if (artifact.solutionOnly && /^teilnehmer\//i.test(artifact.path || '')) errors.push(`solutionOnly Artefakt im Teilnehmerbereich: ${artifact.path}`);
  }));
  (participant || []).forEach((entry) => (entry.artifacts || []).forEach((artifactPath) => {
    if (/^dozent\//i.test(artifactPath) || /loesung|lösung|solution/i.test(artifactPath)) errors.push(`participant-content referenziert geschuetztes Artefakt: ${artifactPath}`);
  }));
  validateDemoCatalog({ containerDir, days, participant, demoTargets, errors, warnings });
  if (/testprotokoll/i.test(JSON.stringify(participant))) {
    errors.push('Testprotokoll darf nicht im Teilnehmerkatalog verlinkt sein.');
  }
  const releaseKeys = readJson(path.join(containerDir, 'catalog', 'release-keys.json'), []);
  if (new Set(releaseKeys).size !== releaseKeys.length) errors.push('ReleaseKeys sind nicht eindeutig.');
  validateDidacticCatalog({ containerDir, days, participant, didacticProfile, releasePlan, demoTargets, errors, warnings });
  walkFiles(containerDir).forEach((filePath) => {
    const relative = path.relative(containerDir, filePath).replace(/\\/g, '/');
    const lower = relative.toLowerCase();
    const content = readText(filePath);
    if (/\.(exe|bat|cmd|ps1)$/i.test(lower)) {
      errors.push(`Ausfuehrbare Datei im Export blockiert: ${relative}`);
    }
    if (/^secure\/|ai-provider-config\.json|api_key_contentfactory\.txt|openai[_-]?key\.txt|_key\.txt|_secret\.txt/i.test(lower)) {
      errors.push(`Secret-/Key-Datei im Export blockiert: ${relative}`);
    }
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
    if (lower === 'reports/testprotokoll.json' || lower === 'reports/testprotokoll.html') {
      if (/Originaltext|Reference chunk|Buchseite|rawText|textPreview/i.test(content)) {
        errors.push(`Testprotokoll enthaelt Rohtext-/Chunk-Hinweise: ${relative}`);
      }
      if (/reference-library|chunks\.json|extracted\.json/i.test(content)) {
        errors.push(`Testprotokoll enthaelt interne Referenzpfade: ${relative}`);
      }
      if (/watermark|generated by|erstellt von\s+.+@/i.test(content)) {
        errors.push(`Testprotokoll enthaelt moegliches personenbezogenes Wasserzeichen: ${relative}`);
      }
    }
    if (lower.endsWith('.ipynb')) {
      try { JSON.parse(content); } catch { errors.push(`Notebook ist kein valides JSON: ${relative}`); }
    }
    if (lower.endsWith('.drawio') && !/^<mxfile[\s>]/.test(content.trim())) {
      errors.push(`Draw.io Datei ist nicht XML-artig: ${relative}`);
    }
    if (lower.endsWith('pom.xml') && !content.includes('<project') && !content.includes('<modelVersion>')) {
      errors.push(`Maven pom.xml ist nicht plausibel: ${relative}`);
    }
    if (lower.endsWith('.sql') && /drop\s+database|delete\s+from\s+\w+\s*;|update\s+\w+\s+set\s+/i.test(content)) {
      warnings.push(`SQL-Datei enthaelt riskantes Statement und muss manuell geprueft werden: ${relative}`);
    }
    if (!/^source-map\.json$|^reports\//.test(relative)) {
      const legacyNames = detectLegacyNames(content);
      if (legacyNames.length) warnings.push(`${relative}: Legacy-Namen sichtbar (${legacyNames.join(', ')})`);
    }
  });
  if (!Array.isArray(participant)) errors.push('participant-content.json ist nicht korrekt strukturiert.');
  return { isValid: errors.length === 0, errors, warnings };
}

function validateDidacticCatalog({ days, participant, didacticProfile, releasePlan, demoTargets, errors, warnings }) {
  if (!didacticProfile.id || !didacticProfile.teachingModel) errors.push('catalog/didactic-profile.json fehlt oder ist unvollstaendig.');
  if (!Array.isArray(didacticProfile.lessonFlow) || !didacticProfile.lessonFlow.length) errors.push('DidacticProfile lessonFlow fehlt.');
  if (!Array.isArray(releasePlan)) errors.push('catalog/release-plan.json ist nicht korrekt strukturiert.');
  (days || []).forEach((day) => {
    if (!Array.isArray(day.didacticFlow) || !day.didacticFlow.length) errors.push(`days.json Tag ${day.dayNumber} ohne didacticFlow.`);
    if (!Array.isArray(day.releasePlan)) errors.push(`days.json Tag ${day.dayNumber} ohne releasePlan.`);
  });
  if (didacticProfile.id === 'problem-first' && !didacticProfile.lessonFlow.includes('problem-case')) errors.push('problem-first enthaelt keine Problemphase.');
  if (didacticProfile.id === 'exam-training' && !/rubric|test|quiz|bewertung|assessment/i.test(`${didacticProfile.assessmentMode} ${JSON.stringify(releasePlan)}`)) errors.push('exam-training enthaelt keine Assessment-/Bewertungslogik.');
  if (didacticProfile.id === 'worked-example-fading' && !/worked|guided|faded|free|luecke|frei/i.test(`${didacticProfile.taskProgression} ${didacticProfile.lessonFlow.join(' ')}`)) errors.push('worked-example-fading enthaelt keine Progression.');
  if (didacticProfile.id === 'project-based' && didacticProfile.projectMode !== true) errors.push('project-based enthaelt keinen Projektmodus.');
  const participantText = JSON.stringify(participant || []);
  if (/Dozentenhinweis|Freigabezentrum|Erwartungshorizont/i.test(participantText)) errors.push('Teilnehmerbereich enthaelt Dozentenhinweise.');
  if (didacticProfile.demoStrategy === 'none' && (demoTargets || []).length) warnings.push('DemoTargets vorhanden, obwohl demoStrategy none ist.');
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

function validateDemoCatalog({ containerDir, days, participant, demoTargets, errors, warnings }) {
  const demoCatalogPath = path.join(containerDir, 'catalog', 'demo-targets.json');
  if (fs.existsSync(demoCatalogPath) && !Array.isArray(demoTargets)) {
    errors.push('catalog/demo-targets.json ist nicht korrekt strukturiert.');
    return;
  }
  const targets = Array.isArray(demoTargets) ? demoTargets : [];
  const demoById = new Map(targets.map((target) => [target.id, target]));
  targets.forEach((target) => {
    const result = validateDemoTarget(target, containerDir);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });
  (days || []).forEach((day) => (day.demos || []).forEach((demoId) => {
    if (!demoById.has(demoId)) errors.push(`days.json referenziert fehlendes DemoTarget: ${demoId}`);
  }));
  (participant || []).forEach((entry) => (entry.demos || []).forEach((demoId) => {
    const target = demoById.get(demoId);
    if (!target) errors.push(`participant-content referenziert fehlendes DemoTarget: ${demoId}`);
    else if (target.visibleForParticipants !== true || target.role === 'teacher' || /^dozent\//i.test(target.filePath || '')) {
      errors.push(`participant-content enthaelt teacher-only Demo: ${demoId}`);
    }
  }));
}

module.exports = {
  validateGeneratedContainer
};
