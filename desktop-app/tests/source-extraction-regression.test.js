const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { extractSourceOutline } = require('../app/lib/content-factory/source-extraction/source-extractor-service');
test('Notebook extrahiert nur Markdown und Code ohne Outputs oder Base64-Daten', () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipynb-')); const file = path.join(dir, 'kurs.ipynb'); fs.writeFileSync(file, JSON.stringify({ cells: [{ cell_type: 'markdown', source: ['# Einführung'] }, { cell_type: 'code', source: ['print("ä")'], outputs: [{ data: { 'image/png': 'BASE64SECRET' } }] }], nbformat: 4 })); const outline = extractSourceOutline({ sourcePath: file, name: 'kurs.ipynb' }); assert.equal(outline.sections.length, 2); assert.doesNotMatch(JSON.stringify(outline), /BASE64SECRET/); assert.match(outline.warnings.join(' '), /Ausgaben.*Bilder/); fs.rmSync(dir, { recursive: true, force: true }); });
