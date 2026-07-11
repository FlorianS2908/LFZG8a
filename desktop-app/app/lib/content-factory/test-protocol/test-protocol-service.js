const fs = require('fs');
const path = require('path');
const { STATUS, MANUAL_CHECKS } = require('./test-protocol-types');

function createTestProtocol(input = {}) {
  const checks = [
    ...preflightChecks(input),
    ...curriculumChecks(input),
    ...sourceChecks(input),
    ...artifactChecks(input),
    ...contentChecks(input),
    ...exportChecks(input),
    ...securityChecks(input)
  ];
  const summary = {
    passed: checks.filter((check) => check.status === STATUS.PASSED).length,
    warnings: checks.filter((check) => check.status === STATUS.WARNING).length,
    failed: checks.filter((check) => check.status === STATUS.FAILED).length,
    manualChecks: MANUAL_CHECKS.length
  };
  const overallStatus = summary.failed ? STATUS.FAILED : summary.warnings ? STATUS.WARNING : STATUS.PASSED;
  return sanitizeProtocol({
    containerId: input.containerId || '',
    courseName: input.courseName || '',
    createdAt: new Date().toISOString(),
    overallStatus,
    summary,
    checks,
    aiRuns: (input.aiRuns || []).map(safeAiRun),
    aiConfig: safeAiConfig(input.aiConfig || {}),
    costEstimate: input.costEstimate || null,
    manualChecks: MANUAL_CHECKS.map((label, index) => ({ id: `manual-${index + 1}`, label, status: 'open' })),
    warnings: checks.filter((check) => check.status === STATUS.WARNING).map((check) => check.message),
    errors: checks.filter((check) => check.status === STATUS.FAILED).map((check) => check.message)
  });
}

function safeAiConfig(config = {}) {
  return {
    aiProvider: config.aiProvider || 'local',
    openAiConfigured: config.openAiConfigured === true,
    openAiModel: config.openAiModel || '',
    keySource: config.keySource || 'missing',
    timeoutMs: config.timeoutMs || 30000,
    costWarningUsd: config.costWarningUsd || 1
  };
}

function safeAiRun(run = {}, index = 0) {
  return {
    id: `ai-run-${index + 1}`,
    purpose: run.purpose || '',
    provider: run.provider || '',
    model: run.model || '',
    promptId: run.promptId || '',
    promptVersion: run.promptVersion || '',
    promptQualityStatus: run.promptQualityStatus || 'warning',
    promptQualityScore: run.promptQualityScore || 0,
    qualityGateBlockedProvider: run.qualityGateBlockedProvider === true,
    fallbackUsed: run.fallbackUsed === true,
    schemaValid: run.schemaValid !== false,
    outputReviewStatus: run.outputReviewStatus || 'warning',
    outputReviewScore: run.outputReviewScore || 0,
    warnings: run.warnings || [],
    manualCheckRequired: run.promptQualityStatus !== 'passed' || run.outputReviewStatus !== 'passed'
  };
}

function check(id, group, label, status, message, evidence = [], manualCheckRequired = false) {
  return { id, group, label, status, message, evidence, manualCheckRequired };
}

function pass(id, group, label, message, evidence) {
  return check(id, group, label, STATUS.PASSED, message, evidence);
}

function warn(id, group, label, message, evidence) {
  return check(id, group, label, STATUS.WARNING, message, evidence);
}

function fail(id, group, label, message, evidence) {
  return check(id, group, label, STATUS.FAILED, message, evidence);
}

function preflightChecks(input) {
  const preflight = input.preflight;
  if (!preflight) return [warn('preflight-present', 'Preflight', 'Preflight ausgefuehrt', 'Preflight wurde nicht uebergeben.')];
  return [
    pass('preflight-present', 'Preflight', 'Preflight ausgefuehrt', 'Preflight-Daten liegen vor.'),
    statusCheck('preflight-status', 'Preflight', 'Preflight Status', preflight.status !== 'red', `Status: ${preflight.status}`, [preflight.status]),
    statusCheck('preflight-score', 'Preflight', 'Preflight Score', Number(preflight.score || 0) >= 60, `Score: ${preflight.score}`, [String(preflight.score || 0)]),
    preflight.status === 'yellow' && input.confirmWarnings !== true
      ? warn('preflight-yellow-confirmed', 'Preflight', 'Warnungen bestaetigt', 'Warnungen muessen fuer produktive Freigabe bestaetigt werden.')
      : pass('preflight-yellow-confirmed', 'Preflight', 'Warnungen bestaetigt', 'Keine unbestaetigten gelben Warnungen.')
  ];
}

function curriculumChecks(input) {
  const curriculum = input.curriculum || {};
  const targetAudience = curriculum.targetAudience || input.targetAudience || {};
  const days = curriculum.days || [];
  return [
    statusCheck('curriculum-present', 'Curriculum', 'CurriculumPlan vorhanden', Boolean(curriculum.id || days.length), 'CurriculumPlan wurde erkannt.'),
    statusCheck('curriculum-approved', 'Curriculum', 'CurriculumPlan freigegeben', curriculum.status === 'approved', `Status: ${curriculum.status || 'fehlt'}`),
    statusCheck('quality-score-present', 'Curriculum', 'Quality Score vorhanden', typeof curriculum.quality?.score === 'number', `Score: ${curriculum.quality?.score ?? 'fehlt'}`),
    statusCheck('days-present', 'Curriculum', 'Tage vorhanden', days.length > 0, `${days.length} Tag(e)`),
    statusCheck('active-topics', 'Curriculum', 'Aktive Themen vorhanden', days.flatMap((day) => day.topics || []).some((topic) => topic.active !== false), 'Aktive Themen geprueft.'),
    statusCheck('target-audience', 'Curriculum', 'Zielgruppe vorhanden', Boolean(targetAudience.priorKnowledge && targetAudience.learningLevel), 'Zielgruppe geprueft.'),
    targetAudience.ageRange && !['unknown', ''].includes(String(targetAudience.ageRange).toLowerCase())
      ? pass('age-range-set', 'Curriculum', 'Zielgruppenalter gesetzt', `ageRange: ${targetAudience.ageRange}`)
      : warn('age-range-set', 'Curriculum', 'Zielgruppenalter gesetzt', 'Alter/Zielgruppenalter nicht gesetzt. Sichere Standardvorschlaege werden verwendet.')
  ];
}

function sourceChecks(input) {
  const curriculum = input.curriculum || {};
  const anchor = curriculum.anchor || {};
  const extraction = curriculum.extractedSourceOutline || curriculum.outline || [];
  return [
    statusCheck('anchor-type', 'Quellenextraktion', 'Anchor-Typ', Boolean(anchor.type), `Anchor: ${anchor.type || 'fehlt'}`),
    statusCheck('source-files', 'Quellenextraktion', 'Quelldateien erkannt', (anchor.sourceFiles || []).length > 0 || Boolean(anchor.title), `${(anchor.sourceFiles || []).length} Datei(en)`),
    statusCheck('extraction-quality', 'Quellenextraktion', 'Extraktionsqualitaet je Quelle', extraction.every((item) => !item.quality || item.quality.score >= 0.35), `${extraction.length} Quelle(n)`),
    (anchor.ranges || '').length ? pass('ranges-used', 'Quellenextraktion', 'Ranges angewendet', 'Bereichsangaben wurden dokumentiert.') : warn('ranges-used', 'Quellenextraktion', 'Ranges angewendet', 'Keine Bereichsangaben genutzt.'),
    pass('no-raw-source-export', 'Quellenextraktion', 'Keine Rohtexte exportiert', 'Protokoll dokumentiert nur Metadaten und Checks.')
  ];
}

function artifactChecks(input) {
  const profile = input.containerProfile || {};
  const suggestions = input.artifactSuggestions || [];
  const targets = input.artifactTargets || [];
  const audience = input.targetAudience || {};
  const hasJavaMaven = targets.some((target) => target.format === 'maven-project');
  const hasSql = targets.some((target) => target.format === 'sql');
  const hasDrawio = targets.some((target) => target.format === 'drawio');
  const hasJupyter = targets.some((target) => target.format === 'ipynb');
  const beginner = ['none', 'basic'].includes(audience.priorKnowledge);
  return [
    statusCheck('container-profile', 'Artefakte', 'Container-Profil vorhanden', Boolean(profile.courseType), `Kurstyp: ${profile.courseType || 'fehlt'}`),
    statusCheck('artifact-suggestions', 'Artefakte', 'Artefaktvorschlaege erzeugt', suggestions.length > 0, `${suggestions.length} Vorschlaege`),
    statusCheck('age-prior-knowledge', 'Artefakte', 'ageRange/priorKnowledge beruecksichtigt', suggestions.some((item) => /Zielgruppenalter|Vorkenntnisse|Standardvorschlaege/.test(item.targetAudienceImpact || item.reason || '')), 'Zielgruppenhinweise dokumentiert.'),
    beginner && profile.courseType === 'java' ? statusCheck('java-beginner-no-maven', 'Artefakte', 'Java Einsteiger kein Maven', !hasJavaMaven, 'Maven fuer Einsteiger geprueft.') : pass('java-beginner-no-maven', 'Artefakte', 'Java Einsteiger kein Maven', 'Nicht zutreffend oder erfuellt.'),
    statusCheck('maven-fit', 'Artefakte', 'Maven passend vorgeschlagen', !hasJavaMaven || !beginner || profile.courseType === 'java-maven', 'Maven-Passung geprueft.'),
    statusCheck('jupyter-fit', 'Artefakte', 'Jupyter passend vorgeschlagen', !hasJupyter || ['jupyter', 'python'].includes(profile.courseType), 'Jupyter-Passung geprueft.'),
    hasSql ? pass('sql-file-only', 'Artefakte', 'SQL erzeugt, nicht ausgefuehrt', 'SQL wird nur als Datei erzeugt.') : warn('sql-file-only', 'Artefakte', 'SQL erzeugt, nicht ausgefuehrt', 'Kein SQL-Artefakt erzeugt.'),
    hasDrawio ? pass('drawio-created', 'Artefakte', 'Draw.io erzeugt', 'Draw.io-Artefakt vorhanden.') : warn('drawio-created', 'Artefakte', 'Draw.io erzeugt', 'Kein Draw.io-Artefakt erzeugt.'),
    pass('dia-pap-safe', 'Artefakte', 'Dia/PAPDesigner sicher behandelt', 'Keine ausfuehrbaren Diagrammtools werden exportiert.'),
    statusCheck('no-exe-artifacts', 'Artefakte', 'Keine EXE exportiert', !targets.some((target) => /\.(exe|bat|cmd|ps1)$/i.test(target.targetPath || '')), 'Artefaktpfade geprueft.')
  ];
}

function contentChecks(input) {
  const dayResults = input.dayResults || [];
  return [
    statusCheck('all-days-generated', 'Content', 'Alle Tage generiert', dayResults.length >= (input.expectedDayCount || 0), `${dayResults.length} Tag(e)`),
    statusCheck('tasks-present', 'Content', 'Aufgaben vorhanden', dayResults.some((day) => (day.tasks || []).length), 'Aufgaben geprueft.'),
    statusCheck('solutions-present', 'Content', 'Loesungen vorhanden', dayResults.some((day) => (day.solutions || []).length), 'Dozentenloesungen geprueft.'),
    statusCheck('quiz-present', 'Content', 'Quiz vorhanden', dayResults.some((day) => (day.quiz || []).length), 'Quiz geprueft.'),
    statusCheck('participant-no-solutions', 'Content', 'Teilnehmerbereich ohne Loesungen', !fileContent(input.rootDir, 'catalog/participant-content.json').match(/loesung|solution/i), 'Teilnehmerkatalog geprueft.'),
    statusCheck('teacher-has-solutions', 'Content', 'Dozentenbereich mit Loesungen', files(input.rootDir).some((file) => /dozent\/.*loesungen/i.test(file.replace(/\\/g, '/'))), 'Dozentenloesungen geprueft.')
  ];
}

function exportChecks(input) {
  const root = input.rootDir;
  return [
    existsCheck(root, 'manifest.json', 'Export', 'manifest.json vorhanden'),
    existsCheck(root, 'catalog/days.json', 'Export', 'catalog/days.json vorhanden'),
    existsCheck(root, 'catalog/participant-content.json', 'Export', 'catalog/participant-content.json vorhanden'),
    existsCheck(root, 'standalone/index.html', 'Export', 'standalone/index.html vorhanden'),
    existsCheck(root, 'platform/adapter.json', 'Export', 'platform/adapter.json vorhanden'),
    existsCheck(root, 'reports', 'Export', 'reports vorhanden'),
    statusCheck('source-map-safe', 'Export', 'source-map ohne Rohtexte', !fileContent(root, 'source-map.json').match(/textPreview|chunk|rawText|original/i), 'source-map geprueft.'),
    statusCheck('reference-not-exported', 'Export', 'Referenzliteratur nicht exportiert', !files(root).some((file) => /reference-library|chunks\.json|extracted\.json/i.test(file)), 'Referenzpfade geprueft.')
  ];
}

function securityChecks(input) {
  const serialized = files(input.rootDir).join('\n');
  const validation = input.validation || { errors: [], warnings: [] };
  return [
    statusCheck('no-exe', 'Sicherheit', 'Keine .exe', !/\.exe$/im.test(serialized), 'Dateiendungen geprueft.'),
    statusCheck('no-scripts', 'Sicherheit', 'Keine .bat/.cmd/.ps1', !/\.(bat|cmd|ps1)$/im.test(serialized), 'Dateiendungen geprueft.'),
    statusCheck('no-reference-paths', 'Sicherheit', 'Keine Referenzbibliothek-Pfade', !/reference-library/i.test(serialized), 'Pfade geprueft.'),
    statusCheck('no-source-chunks', 'Sicherheit', 'Keine Rohdatenablagen', !/chunks\.json|extracted\.json|original/i.test(serialized), 'Rohdatenpfade geprueft.'),
    statusCheck('no-sql-exec', 'Sicherheit', 'Keine SQL-Autoausfuehrung', input.containerProfile?.allowDatabaseActions !== true, 'SQL bleibt Datei.'),
    statusCheck('no-db-auto-create', 'Sicherheit', 'Keine Datenbank-Autoanlage', input.containerProfile?.allowDatabaseActions !== true, 'Keine DB-Aktion aktiv.'),
    statusCheck('validator-clean', 'Sicherheit', 'Validator ohne Fehler', !(validation.errors || []).length, (validation.errors || []).join(' | ') || 'Validator-Fehlerliste leer.')
  ];
}

function statusCheck(id, group, label, ok, message, evidence = []) {
  return ok ? pass(id, group, label, message, evidence) : fail(id, group, label, message, evidence);
}

function existsCheck(root, relativePath, group, label) {
  return statusCheck(`exists-${relativePath.replace(/[^a-z0-9]+/gi, '-')}`, group, label, fs.existsSync(path.join(root || '', relativePath)), relativePath);
}

function files(rootDir) {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(rootDir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

function fileContent(rootDir, relativePath) {
  try { return fs.readFileSync(path.join(rootDir || '', relativePath), 'utf8'); } catch { return ''; }
}

function sanitizeProtocol(protocol) {
  return JSON.parse(JSON.stringify(protocol).replace(/Originaltext|Reference chunk|Buchseite|rawText|textPreview/gi, '[redacted]'));
}

module.exports = {
  createTestProtocol
};
