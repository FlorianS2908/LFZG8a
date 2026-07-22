const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..', 'app');
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');
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
  assert.match(html, /Kurscontainer erstellen und verwalten/);
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
  assert.match(css, /--cf-control-height: 2\.875rem/);
  assert.match(css, /workflow-step-state/);
  assert.match(css, /workflow-step-locked \{ opacity: 1/);
  assert.match(css, /grid-template-columns: 1\.25rem minmax\(0, 1fr\)/);
});

test('Ploglan-Markenbereich steht einmalig über der Seitennavigation und wird paketiert', () => {
  const html = read(path.join('renderer', 'tool-center', 'factory.html'));
  const sidebar = html.match(/<nav class="factory-sidebar"[\s\S]*?<\/nav>/)?.[0] || '';
  const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
  assert.match(sidebar, /class="factory-brand"/);
  assert.match(sidebar, /class="factory-brand-logo" src="assets\/ploglan-logo\.png" alt="Ploglan"/);
  assert.equal((html.match(/ploglan-logo\.png/g) || []).length, 1);
  assert.equal(fs.existsSync(path.join(appRoot, 'renderer', 'tool-center', 'assets', 'ploglan-logo.png')), true);
  assert.ok(packageJson.build.files.includes('app/renderer/tool-center/assets/ploglan-logo.png'));
});

test('Leere Startseiten- und Statusbereiche belegen keinen Layoutplatz', () => {
  const html = read(path.join('renderer', 'tool-center', 'factory.html'));
  const factory = read(path.join('renderer', 'tool-center', 'factory.js'));
  assert.match(html, /data-factory-status[^>]*hidden/);
  assert.match(html, /data-next-action[^>]*hidden/);
  assert.match(html, /data-recent-section[^>]*hidden/);
  assert.match(factory, /target\.hidden = !String\(message \|\| ''\)\.trim\(\)/);
  assert.match(factory, /target\.replaceChildren\(\)/);
  assert.match(factory, /recentSection\.hidden = !state\.containers\.length/);
});

test('Wizard rendert keinen leeren Statusrahmen und optionale Komponenten verschwinden vollständig', () => {
  const factory = read(path.join('renderer', 'tool-center', 'factory.js'));
  const css = read(path.join('renderer', 'tool-center', 'content-factory.css'));
  assert.doesNotMatch(factory, /<article class="tool-card">\s*\$\{wizard\.status/);
  assert.match(factory, /wizard\.status \? `<div class="workflow-transient-status">/);
  assert.match(css, /\.workflow-transient-status:empty/);
  assert.match(css, /\.status-line:empty/);
  assert.match(css, /\.factory-layout \{ display: block;/);
});

test('Hauptquelle nutzt zugängliche Auswahlkarten und responsive Hilfe', () => {
  const factory = read(path.join('renderer', 'tool-center', 'factory.js'));
  const css = read(path.join('renderer', 'tool-center', 'content-factory.css'));
  assert.match(factory, /class="source-option choice-card/);
  assert.match(factory, /type="checkbox" name="wizard-anchor-types"/);
  assert.match(factory, /data-selected="\$\{selectedTypes\.includes\(id\) \? 'true' : 'false'\}"/);
  assert.doesNotMatch(factory, /wizard-anchor-type-select/);
  assert.match(factory, /Bitte mindestens eine Art der Hauptquelle auswählen/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.wizard-source-options \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.workflow-help \{ position: static; max-width: none; \}/);
  assert.match(css, /overflow-wrap: anywhere/);
});

test('Altplattform ist entfernt und ContentFactory-Core bleibt eingebunden', () => {
  for (const relative of [
    'app/renderer/course.html', 'app/renderer/wizard.html', 'app/renderer/tool-center/login.html',
    'app/renderer/tool-center/workspace.html', 'app/renderer/tool-center/timer-quiz.bundle.js',
    'app/lib/admin-tools/admin-tool-registry.js', 'app/lib/course-management/course-management-service.js', 'app/lib/app-data.js'
  ]) assert.equal(fs.existsSync(path.join(desktopRoot, relative)), false, relative);
  assert.equal(fs.existsSync(path.join(repoRoot, 'packages', 'content-factory-core', 'src')), true);
  const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.build.extraResources[0].from, '../packages/content-factory-core');
});
