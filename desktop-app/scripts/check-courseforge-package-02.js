const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'content-factory.css'), 'utf8');
const progress = fs.readFileSync(path.join(root, 'workflow-ui', 'workflow-progress.js'), 'utf8');

const checks = [
  ['CF-022', 'Feldfehler werden ohne kompletten Wizard-Neuaufbau aktualisiert', /function updateFieldError/.test(ui)],
  ['CF-023', 'Zielgruppe und Vorkenntnisse behalten getrennte Fehlerzustände', /state\.wizard\.scopeErrors = errors/.test(ui) && !/state\.wizard\.scopeErrors = \{\};\s*renderPlanWizard\(\)/.test(ui)],
  ['CF-024', 'Globales Statussymbol wurde entfernt', !/workflow-progress-icon/.test(progress)],
  ['CF-025', 'Technische Segmentanzeige wurde entfernt', !/Segment \$\{/.test(progress)],
  ['CF-025', 'Dokumentanalyse zeigt fünf Nutzerphasen', /Quellen prüfen/.test(progress) && /Themen zusammenführen/.test(progress)],
  ['CF-026', 'Themenprüfung besitzt eine eigene View', /function renderTopicReviewView/.test(ui) && /data-open-topic-review/.test(ui)],
  ['CF-026', 'Quellen sind kompakte Metadaten statt Hauptspalte', /topic-source-meta/.test(ui) && !/<th scope="col">Quellen<\/th>/.test(ui)],
  ['CF-026', 'Schmale Ansichten wechseln zur Kartenstruktur', /@media \(max-width: 900px\)[\s\S]*\.topic-review-table tr/.test(css)],
  ['CF-027', 'Planung zeigt drei verständliche Nutzerphasen', /Eingabedaten vorbereiten/.test(progress) && /Plan speichern und bereitstellen/.test(progress)]
];

let failed = 0;
for (const [id, label, passed] of checks) {
  const status = passed ? 'bestanden' : 'fehlgeschlagen';
  console.log(`${passed ? '✓' : '✕'} ${id} · ${status} · ${label}`);
  if (!passed) failed += 1;
}
if (failed) process.exit(1);
