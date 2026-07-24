const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { normalizeConfidence, evidenceStatus, compactSource } = require('../app/renderer/tool-center/planning-review-view-model');

test('Confidence wird strikt normalisiert und niemals als NaN ausgegeben', () => {
  for (const value of [undefined, null, '', 'unbekannt', Number.NaN, Infinity, {}, []]) assert.equal(normalizeConfidence(value), null);
  assert.equal(normalizeConfidence('0.75'), .75);
  assert.equal(normalizeConfidence(4), 1);
  assert.equal(normalizeConfidence(-2), 0);
  assert.equal(evidenceStatus({ confidence: 'kaputt' }).supplementaryText, '');
});

test('Belegstatus priorisiert Herkunft und Konflikte verständlich', () => {
  assert.equal(evidenceStatus({ originStatus: 'explicit', confidence: 1 }).label, 'Direkt belegt');
  assert.equal(evidenceStatus({ originStatus: 'derived', confidence: .7 }).label, 'Nachvollziehbar abgeleitet');
  assert.equal(evidenceStatus({ originStatus: 'conflicting', confidence: .9 }).label, 'Konflikt vorhanden');
  assert.equal(evidenceStatus({ confidence: null }).label, 'Klärung empfohlen');
});

test('Quellen werden kompakt bis zum bekannten Fundort dargestellt', () => {
  assert.equal(compactSource({ fileName: 'Wochenplan.xlsm', sheetName: 'Tabelle 1' }), 'Wochenplan.xlsm · Tabelle 1');
  assert.equal(compactSource({ documentId: 'quelle-1', page: 12 }), 'quelle-1 · Seite 12');
  assert.equal(compactSource({ fileName: 'Folien.pptx', slide: 4 }), 'Folien.pptx · Folie 4');
});

test('Planungsreview nutzt volle Breite, feste Fachproportionen und Kartenansicht', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const css = fs.readFileSync(path.join(root, 'content-factory.css'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'factory.html'), 'utf8');
  assert.match(css, /--cf-content-width: 112\.5rem/);
  assert.match(css, /factory-panel:has\(\[data-plan-step-content="structureReview"\]\) \{ max-width: var\(--cf-content-width\)/);
  assert.match(css, /\.col-content \{ width: 24%/);
  assert.match(css, /\.col-objective \{ width: 24%/);
  assert.match(css, /overflow-wrap: normal; word-break: normal/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /content: attr\(data-label\)/);
  assert.match(ui, /<th>Kompetenzziel<\/th>/);
  assert.match(ui, /<th>Arbeitsform<\/th>/);
  assert.match(ui, /data-export-course-plan/);
  assert.match(ui, /Prüfung abschließen/);
  assert.match(ui, /data-conflict-decision/);
  assert.doesNotMatch(ui, /<th>Confidence<\/th>/);
  assert.doesNotMatch(ui, /Math\.round\(Number\(unit\.confidence/);
  assert.match(html, /planning-review-view-model\.js/);
});

test('Kurserstellung verwendet eine zentrale Zustandsaktion, Tabellen und korrekten Retry', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const css = fs.readFileSync(path.join(root, 'content-factory.css'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'workflow-ui', 'workflow-layout.js'), 'utf8');
  assert.match(ui, /data-central-actionbar/);
  assert.match(ui, /Themenbasis bestätigen/);
  assert.match(ui, /Unterrichtsplan erstellen/);
  assert.match(ui, /Weiter zum Struktur-Review/);
  assert.match(ui, /Number\(item\.planningVersion\) === Number\(project\.currentPlanningVersion\)/);
  assert.match(ui, /if \(kind === 'planning'\) return startWizardCoursePlanning\(\)/);
  assert.match(ui, /if \(kind === 'analysis'\) return startWizardDocumentAnalysis\(\)/);
  assert.match(ui, /data-open-topic-review/);
  assert.match(ui, /function renderTopicReviewView/);
  assert.match(ui, /scrollTop = scrollTop/);
  assert.match(ui, /class="topic-review-table"/);
  assert.match(ui, /class="course-plan-review-table"/);
  assert.match(css, /\.course-data-grid \{ grid-template-columns:/);
  assert.match(css, /@media \(max-width: 1279px\)/);
  assert.match(css, /\.topic-has-conflict td/);
  assert.match(layout, /data-workflow-help-toggle/);
});

test('Themenreview zeigt breite Auswahlspalten und Rückkehr erst nach Bestätigung', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const css = fs.readFileSync(path.join(root, 'content-factory.css'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
  assert.match(css, /col:nth-child\(6\) \{ width: 12rem/);
  assert.match(css, /col:nth-child\(8\) \{ width: 15rem/);
  assert.match(css, /\.topic-review-primary-actions \{ display: grid/);
  const view = ui.slice(ui.indexOf('function renderTopicReviewView'), ui.indexOf('function renderTopicReviewItem'));
  const header = view.slice(view.indexOf('<header class="topic-review-header"'), view.indexOf('</header>') + 9);
  assert.doesNotMatch(header, /data-close-topic-review/);
  assert.match(view, /data-topic-reopen>Bearbeitung wieder öffnen<\/button><button class="primary-button" type="button" data-close-topic-review>Zurück zur Kursplanung/);
  assert.match(ui, /async function reopenTopicReview/);
  assert.match(ui, /await desktop\.factory\.updateTopicReview/);
});

test('Feldvalidierung bleibt fokussiert und Zielgruppenfehler werden getrennt aktualisiert', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
  const courseBinding = ui.slice(ui.indexOf("$all('[data-wizard-course]')"), ui.indexOf("$('[data-open-course-project]')"));
  const scopeBinding = ui.slice(ui.indexOf("$all('[data-course-scope-selection]')"), ui.indexOf("$all('[data-course-scope-custom]')"));
  assert.match(courseBinding, /updateFieldError\(field, errors\[field\.dataset\.wizardCourse\]/);
  assert.doesNotMatch(courseBinding, /renderPlanWizard\(\)/);
  assert.match(scopeBinding, /state\.wizard\.scopeErrors = errors/);
  assert.doesNotMatch(scopeBinding, /scopeErrors = \{\}/);
  assert.match(ui, /function updateFieldError/);
});

test('Kurstitel und Kurs-ID bleiben getrennt und Zurück bleibt verfügbar', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
  const courseBinding = ui.slice(ui.indexOf("$all('[data-wizard-course]')"), ui.indexOf("$('[data-open-course-project]')"));
  assert.doesNotMatch(courseBinding, /courseName.*courseId/s);
  assert.match(ui, /canBack: true/);
  assert.match(ui, /\[data-wizard-prev\].*data-close-table-workspace/);
});

test('Zurück führt bei Kursdaten zum Start und behält den Wizard-Entwurf', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');
  const backBinding = ui.slice(ui.indexOf("$('[data-wizard-prev]')"), ui.indexOf("$('[data-open-course-plan-workspace]')"));
  const returnToStart = ui.slice(ui.indexOf('function returnFromCourseStepToFactoryStart'), ui.indexOf('function validateCourseFields'));
  assert.match(backBinding, /state\.wizard\.activeStep === 'course'/);
  assert.match(backBinding, /returnFromCourseStepToFactoryStart\(\)/);
  assert.match(backBinding, /moveWizardStep\(-1\)/);
  assert.match(returnToStart, /showPanel\('home'\)/);
  assert.match(returnToStart, /renderNextRecommendedAction\(\)/);
  assert.doesNotMatch(returnToStart, /state\.wizard\s*=/);
});

test('Themen und Unterrichtsplan verwenden einen gemeinsamen Vollbild-Arbeitsbereich', () => {
  const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center');
  const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'content-factory.css'), 'utf8');
  assert.match(ui, /table-workspace topic-review-view/);
  assert.match(ui, /table-workspace course-plan-workspace/);
  assert.match(ui, /data-open-course-plan-workspace/);
  assert.match(ui, /data-close-table-workspace/);
  assert.match(css, /\.table-workspace \{/);
  assert.match(css, /position: fixed/);
  assert.match(css, /height: 100vh/);
  assert.match(css, /overflow: hidden/);
  assert.match(css, /width: 125rem/);
  assert.match(css, /overflow: auto/);
  assert.doesNotMatch(css, /\.table-workspace \.topic-review-table,\s*\.table-workspace \.course-plan-review-table \{ width: max-content/);
  assert.match(ui, /class="topic-review-table" role="region" aria-label="Erkannte Themen" tabindex="0"/);
  assert.match(ui, /<colgroup><col><col><col><col><col><col><col><col><\/colgroup>/);
});

test('Analyseanzeige entfernt exakte Anzeige-Duplikate und leere Platzhalter', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'app', 'renderer', 'tool-center', 'factory.js'), 'utf8');
  assert.match(ui, /function deduplicateAnalysisItems/);
  assert.match(ui, /key === 'strukturierter eintrag'/);
  assert.match(ui, /const list = deduplicateAnalysisItems\(values\)/);
  assert.match(ui, /function deduplicateDisplayedSources/);
});
