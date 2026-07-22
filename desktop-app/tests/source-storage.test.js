const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSourceStorageService } = require('../app/lib/content-factory/course-planning/source-storage-service');
const { createCoursePlanningService, extractDocument } = require('../app/lib/content-factory/course-planning/course-planning-service');

test('Quellenimport kopiert Dateien mit Leerzeichen und Umlauten persistent und prüft Integrität', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-storage-'));
  const oneDriveLike = path.join(root, 'OneDrive - Beispiel AG');
  fs.mkdirSync(oneDriveLike);
  const original = path.join(oneDriveLike, 'Präsentation für LF 08.md');
  fs.writeFileSync(original, '# Einführung\nNetzwerksegmentierung', 'utf8');
  const originalBytes = fs.readFileSync(original);
  const service = createSourceStorageService({ factoryDir: path.join(root, 'factory'), logger: { info() {}, error() {} } });
  const imported = service.importSourceFile({ projectId: 'lf08', documentId: 'quelle-1', sourcePath: original, originalFileName: path.basename(original), mimeType: 'text/markdown' });
  assert.notEqual(imported.storedFilePath, original);
  assert.equal(fs.existsSync(imported.storedFilePath), true);
  assert.deepEqual(fs.readFileSync(original), originalBytes);
  assert.equal(imported.checksum, crypto.createHash('sha256').update(originalBytes).digest('hex'));
  assert.equal(imported.storageVersion, 1);
  const restarted = createSourceStorageService({ factoryDir: path.join(root, 'factory'), logger: { info() {}, error() {} } });
  assert.equal(restarted.validateStoredSource(imported, 'lf08').checksum, imported.checksum);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Quellenimport lehnt leere, fehlende, Verzeichnis- und Traversal-Eingaben strukturiert ab', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-errors-'));
  const empty = path.join(root, 'leer.pptx');
  fs.writeFileSync(empty, '');
  const service = createSourceStorageService({ factoryDir: path.join(root, 'factory'), logger: { info() {}, error() {} } });
  assert.throws(() => service.importSourceFile({ projectId: 'p', sourcePath: '' }), (error) => error.code === 'SOURCE_PATH_MISSING');
  assert.throws(() => service.importSourceFile({ projectId: 'p', sourcePath: path.join(root, 'fehlt.pptx') }), (error) => error.code === 'SOURCE_FILE_NOT_FOUND');
  assert.throws(() => service.importSourceFile({ projectId: 'p', sourcePath: empty }), (error) => error.code === 'SOURCE_FILE_EMPTY');
  assert.throws(() => service.importSourceFile({ projectId: 'p', sourcePath: root, originalFileName: 'ordner.pptx' }), (error) => error.code === 'SOURCE_NOT_A_FILE');
  assert.throws(() => service.validateStoredSource({ projectId: 'p', storedFilePath: path.join(root, 'außerhalb.md') }, 'p'), (error) => error.code === 'SOURCE_OUTSIDE_PROJECT_STORAGE');
  fs.rmSync(root, { recursive: true, force: true });
});

test('Re-Upload behält Dokument-ID und Metadaten, invalidiert aber alte Analyse bei neuer Prüfsumme', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-reupload-'));
  const first = path.join(root, 'quelle.md');
  fs.writeFileSync(first, '# Version 1\nInhalt', 'utf8');
  const provider = { isConfigured: () => true };
  let service = createCoursePlanningService({ factoryDir: path.join(root, 'factory'), aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'kurs', title: 'Kurs', description: 'bleibt', documentAnalyses: [{ id: 'a1', documentId: 'doc', analysisVersion: 1, summary: { short: 'Alt' }, topics: [], learningObjectives: [], confidence: 1 }] });
  const imported = service.importSourceFile({ projectId: 'kurs', documentId: 'doc', sourcePath: first, originalFileName: 'quelle.md', sourceCategory: 'course-plan', bindingLevel: 'binding' });
  fs.writeFileSync(first, '# Version 2\nNeuer Inhalt', 'utf8');
  const replaced = service.importSourceFile({ projectId: 'kurs', documentId: 'doc', sourcePath: first, originalFileName: 'quelle.md' });
  assert.equal(replaced.id, imported.id);
  assert.notEqual(replaced.checksum, imported.checksum);
  service = createCoursePlanningService({ factoryDir: path.join(root, 'factory'), aiOrchestrator: { openai: provider }, logger: { info() {}, error() {} } });
  const project = service.getProject('kurs');
  assert.equal(project.description, 'bleibt');
  assert.equal(project.documentAnalyses.some((analysis) => analysis.documentId === 'doc'), false);
  assert.equal(project.uploadedDocuments[0].bindingLevel, 'binding');
  assert.match(extractDocument(project.uploadedDocuments[0], { validateStoredSource: createSourceStorageService({ factoryDir: path.join(root, 'factory') }).validateStoredSource, projectId: 'kurs' }).sections.map((section) => `${section.title || ''} ${section.textPreview || ''}`).join(' '), /Neuer Inhalt/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Fehlende Altdokumente liefern präzise Re-Upload-Fehlercodes', () => {
  assert.throws(() => extractDocument({ id: 'alt', originalFileName: 'alt.pptx', storedFilePath: '' }), (error) => error.code === 'SOURCE_PATH_MISSING');
  assert.throws(() => extractDocument({ id: 'alt', originalFileName: 'alt.pptx', storedFilePath: path.join(os.tmpdir(), 'nicht-vorhanden.pptx') }), (error) => error.code === 'SOURCE_FILE_NOT_FOUND');
});

test('PPTX wird nach persistentem Import und Neustart aus ZIP/XML mit Folienbereich extrahiert', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-pptx-'));
  const source = path.join(root, 'Präsentation LF 08.pptx');
  createStoredZip(source, {
    'ppt/slides/slide1.xml': '<p:sld><a:t>Einführung</a:t><a:t>Äpfel &amp; Übertragung</a:t></p:sld>',
    'ppt/slides/slide2.xml': '<p:sld><a:t>Subnetting</a:t><a:t>Netze sicher segmentieren</a:t></p:sld>'
  });
  const factoryDir = path.join(root, 'factory');
  let service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: { isConfigured: () => true } }, logger: { info() {}, error() {} } });
  service.upsertProject({ id: 'pptx-kurs', title: 'PPTX-Kurs' });
  const imported = service.importSourceFile({ projectId: 'pptx-kurs', documentId: 'folien', sourcePath: source, originalFileName: path.basename(source), selectedRanges: [{ rangeType: 'slides', from: 2, to: 2 }] });
  service = createCoursePlanningService({ factoryDir, aiOrchestrator: { openai: { isConfigured: () => true } }, logger: { info() {}, error() {} } });
  const persisted = service.getProject('pptx-kurs').uploadedDocuments[0];
  const extraction = extractDocument(persisted, { validateStoredSource: createSourceStorageService({ factoryDir }).validateStoredSource, projectId: 'pptx-kurs' });
  assert.equal(imported.storageVersion, 1);
  assert.equal(extraction.searchable, true);
  assert.equal(extraction.pageOrSlideCount, 2);
  assert.equal(extraction.sections.length, 1);
  assert.equal(extraction.sections[0].slideNumber, 2);
  assert.match(`${extraction.sections[0].title} ${extraction.sections[0].textPreview}`, /Subnetting.*segmentieren/);
  assert.ok(extraction.extractedCharacters > 0);
  fs.rmSync(root, { recursive: true, force: true });
});

function createStoredZip(zipPath, entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [relativePath, content] of Object.entries(entries)) {
    const name = Buffer.from(relativePath, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(entries).length, 8); end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralParts.reduce((sum, part) => sum + part.length, 0), 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...localParts, ...centralParts, end]));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
