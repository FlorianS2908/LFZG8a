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
