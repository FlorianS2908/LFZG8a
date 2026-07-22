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
  assert.match(css, /factory-panel:has\(\[data-plan-step-content="structureReview"\]\) \{ max-width: none/);
  assert.match(css, /\.col-content \{ width: 24%/);
  assert.match(css, /\.col-objective \{ width: 24%/);
  assert.match(css, /overflow-wrap: normal; word-break: normal/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /content: attr\(data-label\)/);
  assert.match(ui, /<th>Belegstatus<\/th>/);
  assert.doesNotMatch(ui, /<th>Confidence<\/th>/);
  assert.doesNotMatch(ui, /Math\.round\(Number\(unit\.confidence/);
  assert.match(html, /planning-review-view-model\.js/);
});
