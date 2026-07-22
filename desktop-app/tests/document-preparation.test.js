const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getDocumentFormatStrategy } = require('../app/lib/content-factory/document-processing/document-format-strategy');
const { prepareDocument, cleanupPreparedFiles } = require('../app/lib/content-factory/document-processing/document-preparation-service');
const { readZipPackage, writeZipPackage } = require('../app/lib/content-factory/document-processing/safe-zip-package');
const { OpenAIProvider, sanitizeInput } = require('../app/lib/content-factory/ai/openai-provider');
const { extractReadablePdfText } = require('../app/lib/content-factory/source-extraction/pdf-outline-extractor');
const { validateCoursePlan } = require('../app/lib/content-factory/course-planning/course-planning-service');
const { createCoursePlanningService } = require('../app/lib/content-factory/course-planning/course-planning-service');

test('zentrale Formatstrategie stimmt Provider-Direktformate und sichere Konvertierungen ab', () => {
  assert.equal(getDocumentFormatStrategy('quelle.pdf', 'application/pdf').strategy, 'direct_with_structured_extraction');
  assert.equal(getDocumentFormatStrategy('plan.xlsm').strategy, 'convert_then_analyze');
  assert.equal(getDocumentFormatStrategy('buch.epub').strategy, 'extract_then_analyze');
  assert.equal(getDocumentFormatStrategy('folie.pptx').visualPdfUseful, true);
  assert.equal(getDocumentFormatStrategy('schadcode.exe').status, 'unsupported');
  assert.equal(getDocumentFormatStrategy('folie.pptx', 'text/plain').status, 'ready_with_warnings');
});

test('XLSM wird lesend in eine echte makrofreie und validierte XLSX-Arbeitskopie überführt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsm-safe-'));
  const source = path.join(root, 'Wochenplan_FIAE_LF-ZQ8A.xlsm');
  writeZipPackage(source, [
    textEntry('[Content_Types].xml', '<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/><Override PartName="/xl/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>'),
    textEntry('xl/workbook.xml', '<workbook><sheets><sheet name="Woche 1"/></sheets></workbook>'),
    textEntry('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Netzwerke</t></is></c></row></sheetData></worksheet>'),
    { name: 'xl/vbaProject.bin', data: Buffer.from('AUTO_OPEN_MUST_NEVER_RUN') },
    textEntry('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rVba" Type="vbaProject" Target="vbaProject.bin"/></Relationships>')
  ]);
  const before = fs.readFileSync(source);
  const prepared = prepareDocument({ id: 'xlsm', originalFileName: path.basename(source), storedFilePath: source, fileSize: before.length });
  const safeFile = prepared.providerFiles[0].localPath;
  const entries = readZipPackage(safeFile);
  assert.equal(prepared.hasMacros, true);
  assert.equal(prepared.strategy, 'convert_then_analyze');
  assert.equal(prepared.status, 'ready_with_warnings');
  assert.equal(entries.some((entry) => /vbaProject/i.test(entry.name)), false);
  assert.equal(entries.some((entry) => entry.name === 'xl/workbook.xml'), true);
  assert.match(entries.find((entry) => entry.name === '[Content_Types].xml').data.toString(), /spreadsheetml\.sheet\.main/);
  assert.deepEqual(fs.readFileSync(source), before);
  cleanupPreparedFiles(prepared);
  assert.equal(fs.existsSync(safeFile), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Signaturfehler, beschädigte und unsichere Archive werden vor dem Provider blockiert', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'format-safe-'));
  const fake = path.join(root, 'falsch.pdf'); fs.writeFileSync(fake, 'kein pdf');
  assert.throws(() => prepareDocument({ id: 'bad', originalFileName: 'falsch.pdf', storedFilePath: fake }), (error) => error.code === 'DOCUMENT_FORMAT_MISMATCH');
  const unsafe = path.join(root, 'unsafe.epub');
  assert.throws(() => writeZipPackage(unsafe, [textEntry('../x.xhtml', '<p>Unsicher</p>')]), (error) => error.code === 'ARCHIVE_PATH_TRAVERSAL');
  fs.rmSync(root, { recursive: true, force: true });
});

test('HTML und EPUB werden als bereinigte temporäre Provider-Arbeitskopien vorbereitet', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-safe-'));
  const html = path.join(root, 'seite.html'); fs.writeFileSync(html, '<h1 onmouseover="evil()">Netze</h1><script>steal()</script><p>Routing</p>');
  const htmlPrepared = prepareDocument({ id: 'html', originalFileName: 'seite.html', storedFilePath: html });
  const safeHtml = fs.readFileSync(htmlPrepared.providerFiles[0].localPath, 'utf8');
  assert.doesNotMatch(safeHtml, /script|onmouseover|evil|steal/i); assert.match(safeHtml, /Routing/);
  const epub = path.join(root, 'buch.epub'); writeZipPackage(epub, [
    textEntry('META-INF/container.xml', '<container><rootfile full-path="OPS/book.opf"/></container>'),
    textEntry('OPS/book.opf', '<package><manifest><item id="c1" href="c1.xhtml"/></manifest><spine><itemref idref="c1"/></spine></package>'),
    textEntry('OPS/c1.xhtml', '<html><h1>Subnetting</h1><p>Netze segmentieren</p></html>')
  ]);
  const epubPrepared = prepareDocument({ id: 'epub', originalFileName: 'buch.epub', storedFilePath: epub });
  assert.equal(epubPrepared.providerFiles[0].mimeType, 'text/markdown');
  assert.match(fs.readFileSync(epubPrepared.providerFiles[0].localPath, 'utf8'), /Subnetting/);
  cleanupPreparedFiles(htmlPrepared); cleanupPreparedFiles(epubPrepared);
  fs.rmSync(root, { recursive: true, force: true });
});

test('hybrider Responses-Payload enthält echte Extraktion und Datei, aber keine lokalen Pfade oder Secrets', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-file-'));
  const source = path.join(root, 'quelle.md'); fs.writeFileSync(source, '# Routing\nNetze sicher segmentieren');
  const provider = new OpenAIProvider({ apiKey: 'sk-test-not-logged', model: 'test-model' });
  let captured;
  provider.performRequest = async (body, signal, apiPath, parser) => { captured = { body: JSON.parse(body), apiPath }; return parser({ output_text: '{"schemaVersion":1}' }); };
  const result = await provider.analyzeDocument({ extraction: { sections: [{ title: 'Routing', textPreview: 'Netze sicher segmentieren' }] }, preparation: { providerFiles: [{ localPath: source, mimeType: 'text/markdown' }] }, storedFilePath: source, apiKey: 'never' });
  const serialized = JSON.stringify(captured.body);
  assert.equal(captured.apiPath, '/v1/responses');
  assert.match(serialized, /input_file/);
  assert.match(serialized, /Netze sicher segmentieren/);
  assert.doesNotMatch(serialized, /storedFilePath|sk-test-not-logged|never/);
  assert.equal(result.schemaVersion, 1);
  assert.match(JSON.stringify(sanitizeInput({ extraction: { textPreview: 'Fachinhalt' } })), /Fachinhalt/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('PDF-Objektmarker werden nicht als Fachinhalt übernommen', () => {
  const extracted = extractReadablePdfText('1 0 obj\n(Subnetting und Routing) Tj\nendobj\nxref trailer');
  assert.match(extracted, /Subnetting und Routing/);
  assert.doesNotMatch(extracted, /\b(?:obj|endobj|xref|trailer)\b/i);
});

test('Planvalidierung blockiert unbekannte Quellen, leere Themen und falsche Nummerierung', () => {
  const plan = { days: [{ dayNumber: 1, units: [{ dayNumber: 1, unitNumber: 2, topic: '', preliminaryLearningObjective: '', originStatus: 'explicit', sourceReferences: [{ documentId: 'erfunden' }], materialRequirements: [] }] }] };
  const validation = validateCoursePlan(plan, { totalDays: 1, totalUnits: 1, unitsPerDay: 1 }, new Set(['bekannt']));
  assert.equal(validation.status, 'failed');
  assert.match(validation.errors.join(' '), /unbekannte Dokument-ID|Thema fehlt|Lernziel|lückenlos/);
});

test('Neustart erkennt persistierten nichtterminalen Analyseauftrag als unterbrochen', () => {
  const factoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analysis-resume-'));
  let service = createCoursePlanningService({ factoryDir, aiOrchestrator: {} });
  service.upsertProject({ id: 'resume', title: 'Resume', analysisOperation: { operationId: 'analysis-old', status: 'analyzing', step: 'Dokument wird analysiert' } });
  service = createCoursePlanningService({ factoryDir, aiOrchestrator: {} });
  const project = service.getProject('resume');
  assert.equal(project.analysisOperation.status, 'failed');
  assert.equal(project.analysisOperation.errorCode, 'ANALYSIS_INTERRUPTED');
  fs.rmSync(factoryDir, { recursive: true, force: true });
});

function textEntry(name, text) { return { name, data: Buffer.from(text, 'utf8') }; }
