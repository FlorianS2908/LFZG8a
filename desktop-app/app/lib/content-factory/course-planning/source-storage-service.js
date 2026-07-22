const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ensureDir } = require('../../json-store');

const MAX_SOURCE_BYTES = 250 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.xls', '.xlsx', '.xlsm', '.csv', '.pdf', '.epub', '.ppt', '.pptx', '.doc', '.docx', '.md', '.txt', '.html', '.htm', '.json', '.xml', '.ipynb', '.png', '.jpg', '.jpeg']);

function createSourceStorageService({ factoryDir, logger = console }) {
  const projectsRoot = path.resolve(factoryDir, 'course-projects');

  function importSourceFile(input = {}) {
    const operationId = `source-import-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const projectId = safeSegment(input.projectId, 'projectId');
    const documentId = safeSegment(input.documentId || `document-${crypto.randomUUID()}`, 'documentId');
    try {
      logger.info?.('[SourceImport]', { event: 'import_started', operationId, projectId, documentId });
      const source = validateSourcePath(input.sourcePath);
      const originalFileName = sanitizeFileName(input.originalFileName || path.basename(source.path));
      const extension = path.extname(originalFileName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) throw sourceError('SOURCE_TYPE_UNSUPPORTED', 'Dieser Dateityp wird als Kursquelle nicht unterstützt.');
      if (source.size > MAX_SOURCE_BYTES) throw sourceError('SOURCE_FILE_TOO_LARGE', 'Die Quelldatei überschreitet die maximal zulässige Größe von 250 MB.');
      const checksum = sha256(source.path);
      const documentRoot = path.resolve(projectsRoot, projectId, 'sources', documentId);
      ensureInside(projectsRoot, documentRoot);
      ensureDir(documentRoot);
      const targetName = `${checksum.slice(0, 12)}-${originalFileName}`;
      const targetPath = path.resolve(documentRoot, targetName);
      ensureInside(documentRoot, targetPath);
      if (!fs.existsSync(targetPath)) {
        const temporaryPath = path.resolve(documentRoot, `.${targetName}.${crypto.randomBytes(4).toString('hex')}.tmp`);
        ensureInside(documentRoot, temporaryPath);
        fs.copyFileSync(source.path, temporaryPath, fs.constants.COPYFILE_EXCL);
        fs.renameSync(temporaryPath, targetPath);
      }
      const stored = validateRegularFile(targetPath);
      if (stored.size !== source.size || sha256(targetPath) !== checksum) throw sourceError('SOURCE_INTEGRITY_MISMATCH', 'Die sicher gespeicherte Kopie konnte nicht verifiziert werden.');
      const result = {
        operationId, documentId, projectId, originalFileName, storedFilePath: targetPath,
        mimeType: String(input.mimeType || ''), extension, fileSize: stored.size, checksum,
        importedAt: new Date().toISOString(), storageVersion: 1
      };
      logger.info?.('[SourceImport]', { event: 'import_completed', operationId, projectId, documentId, extension, fileSize: stored.size, checksum: checksum.slice(0, 12) });
      return result;
    } catch (error) {
      logger.error?.('[SourceImport]', { event: 'import_failed', operationId, projectId, documentId, errorCode: error.code || 'SOURCE_IMPORT_FAILED' });
      throw error;
    }
  }

  function validateStoredSource(document = {}, expectedProjectId = '') {
    const projectId = safeSegment(document.projectId || expectedProjectId, 'projectId');
    if (!document.storedFilePath) throw sourceError('SOURCE_PATH_MISSING', 'Die Quelldatei wurde in einer älteren Version nur als Metadaten gespeichert. Bitte laden Sie die Datei erneut hoch.');
    const projectSourcesRoot = path.resolve(projectsRoot, projectId, 'sources');
    const storedPath = path.resolve(document.storedFilePath);
    ensureInside(projectSourcesRoot, storedPath, 'SOURCE_OUTSIDE_PROJECT_STORAGE');
    if (!fs.existsSync(storedPath)) throw sourceError('SOURCE_FILE_NOT_FOUND', 'Die sicher gespeicherte Quelldatei wurde nicht gefunden. Bitte laden Sie die Datei erneut hoch.');
    const stat = validateRegularFile(storedPath);
    const extension = path.extname(document.originalFileName || storedPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) throw sourceError('SOURCE_TYPE_UNSUPPORTED', 'Dieser Dateityp wird als Kursquelle nicht unterstützt.');
    const checksum = sha256(storedPath);
    if (document.checksum && document.checksum !== checksum) throw sourceError('SOURCE_INTEGRITY_MISMATCH', 'Die gespeicherte Quelldatei wurde verändert. Bitte laden Sie sie erneut hoch.');
    return { path: storedPath, stat, checksum, extension };
  }

  return { importSourceFile, validateStoredSource, projectsRoot };
}

function validateSourcePath(sourcePath) {
  if (typeof sourcePath !== 'string' || !sourcePath.trim()) throw sourceError('SOURCE_PATH_MISSING', 'Der lokale Dateipfad konnte nicht ermittelt werden. Bitte wählen Sie die Datei erneut aus.');
  const resolved = path.resolve(sourcePath);
  if (!fs.existsSync(resolved)) throw sourceError('SOURCE_FILE_NOT_FOUND', 'Die ausgewählte Quelldatei wurde nicht gefunden.');
  return { path: resolved, ...validateRegularFile(resolved) };
}
function validateRegularFile(filePath) {
  let stat;
  try { stat = fs.statSync(filePath); } catch { throw sourceError('SOURCE_FILE_UNREADABLE', 'Die Quelldatei kann nicht gelesen werden.'); }
  if (!stat.isFile()) throw sourceError('SOURCE_NOT_A_FILE', 'Die ausgewählte Quelle ist keine reguläre Datei.');
  if (stat.size < 1) throw sourceError('SOURCE_FILE_EMPTY', 'Die ausgewählte Quelldatei ist leer.');
  try { fs.accessSync(filePath, fs.constants.R_OK); } catch { throw sourceError('SOURCE_FILE_UNREADABLE', 'Die Quelldatei kann nicht gelesen werden.'); }
  return { size: stat.size };
}
function sha256(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function safeSegment(value, label) {
  const segment = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!segment || segment === '.' || segment === '..') throw sourceError('SOURCE_IDENTIFIER_INVALID', `${label} ist ungültig.`);
  return segment.slice(0, 120);
}
function sanitizeFileName(value) {
  const extension = path.extname(String(value || '')).toLowerCase();
  const base = path.basename(String(value || ''), extension).normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 140) || 'quelle';
  return `${base}${extension}`;
}
function ensureInside(root, target, code = 'SOURCE_PATH_TRAVERSAL') {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) return;
  throw sourceError(code, code === 'SOURCE_OUTSIDE_PROJECT_STORAGE' ? 'Die Quelldatei liegt nicht im sicheren Projekt-Speicher. Bitte laden Sie sie erneut hoch.' : 'Ungültiger Zielpfad für die Quelldatei.');
}
function sourceError(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { createSourceStorageService, ALLOWED_EXTENSIONS, MAX_SOURCE_BYTES, sanitizeFileName };
