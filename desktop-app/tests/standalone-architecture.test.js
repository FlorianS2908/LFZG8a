const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..', 'app');
const read = (relative) => fs.readFileSync(path.join(appRoot, relative), 'utf8');

test('Electron startet direkt in der ContentFactory und ist isoliert', () => {
  const main = read('main.js');
  assert.match(main, /loadFile\(rendererFile\)/);
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.doesNotMatch(main, /login|classroom|course-management|admin-tools/i);
});

test('Preload stellt ausschließlich ContentFactory-APIs bereit', () => {
  const preload = read('preload.js');
  assert.match(preload, /factory:/);
  assert.doesNotMatch(preload, /auth:|release-center|course-management|admin-tools|dokutool|display:/i);
});

test('Oberfläche trägt den Produktnamen und keine Plattformnavigation', () => {
  const html = read(path.join('renderer', 'tool-center', 'factory.html'));
  assert.match(html, /ueTool ContentFactory/);
  assert.match(html, /Unterrichtsmaterialien analysieren und Kurscontainer erstellen/);
  assert.doesNotMatch(html, /Login|Tool-Zentrale|Adminbereich|Teilnehmeransicht/);
});

test('Hauptnavigation, Expertenbereich und Landmarken sind zugänglich strukturiert', () => {
  const html = read(path.join('renderer', 'tool-center', 'factory.html'));
  const mainNavigation = html.match(/<nav class="factory-sidebar"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.equal((mainNavigation.match(/data-factory-tab="(?:home|plan-wizard|overview|references|settings)"/g) || []).length, 5);
  assert.match(mainNavigation, /<details class="expert-navigation"/);
  assert.match(mainNavigation, /<summary>Expertenfunktionen<\/summary>/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /aria-current="page"/);
});

test('Kurserstellung zeigt sechs verständliche Phasen mit Textstatus', () => {
  const layout = read(path.join('renderer', 'tool-center', 'workflow-ui', 'workflow-layout.js'));
  assert.match(layout, /Phase \$\{activePhaseIndex \+ 1\} von 6/);
  for (const phase of ['Grundlagen', 'Unterrichtsplan', 'Inhalte und Materialien', 'Kursstruktur', 'Generierung', 'Prüfen und Exportieren']) {
    assert.match(layout, new RegExp(phase));
  }
  assert.match(layout, /aria-current="step"/);
  assert.match(layout, /✓ Erledigt/);
  for (const state of ['Aktiv', 'Optional', 'Erledigt', 'Gesperrt']) assert.match(layout, new RegExp(state));
});

test('Wizard trennt interne Werte von deutschen Beschriftungen', () => {
  const factory = read(path.join('renderer', 'tool-center', 'factory.js'));
  const utils = read(path.join('renderer', 'tool-center', 'workflow-ui', 'workflow-ui-utils.js'));
  const labels = {
    studentWorkspace: 'Arbeitsbereich für Teilnehmende erstellen',
    teacherSolutions: 'Lösungen für Dozenten bereitstellen',
    generateStarterFiles: 'Startdateien erstellen',
    generateSolutionFiles: 'Lösungsdateien erstellen',
    generateReadme: 'Projektbeschreibung erstellen',
    generateSetupGuide: 'Einrichtungsanleitung erstellen'
  };
  for (const [key, label] of Object.entries(labels)) {
    assert.match(factory, new RegExp(`${key}: '${label}'`));
  }
  assert.doesNotMatch(factory, /escapeHtml\(key\)<\/label>/);
  assert.match(utils, /none: 'Keine'/);
  assert.match(utils, /'web-only': 'Nur Webinhalte'/);
  assert.match(factory, /data-container-profile-check="\$\{key\}"/);
  assert.match(factory, /escapeHtml\(visibleLabel\(value\)\)/);
});

test('Checkboxen bleiben an unveränderte Zustandsfelder gebunden', () => {
  const factory = read(path.join('renderer', 'tool-center', 'factory.js'));
  for (const key of ['needsStepByStep', 'projectOrientation', 'examOrientation']) {
    assert.match(factory, new RegExp(`data-wizard-audience-check="${key}"`));
  }
  assert.match(factory, /wizard\.targetAudience\[field\.dataset\.wizardAudienceCheck\] = field\.checked/);
  assert.match(factory, /wizard\.containerProfile\[field\.dataset\.containerProfileCheck\] = field\.checked/);
});

test('Designsystem enthält Fokus, responsive Desktopansicht und reduzierte Bewegung', () => {
  const css = read(path.join('renderer', 'tool-center', 'content-factory.css'));
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /min-height: 2\.75rem/);
  assert.match(css, /workflow-step-state/);
  assert.match(css, /workflow-step-locked \{ opacity: 1/);
  assert.match(css, /grid-template-columns: 1\.25rem minmax\(0, 1fr\)/);
});
