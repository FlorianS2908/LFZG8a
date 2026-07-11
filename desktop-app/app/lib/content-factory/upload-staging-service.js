const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { ensureDir } = require('../json-store');

const MB = 1024 * 1024;
const GB = 1024 * MB;

const uploadLimits = {
  maxSingleFileBytes: 250 * MB,
  maxBatchBytes: 2 * GB,
  maxZipExtractedBytes: 3 * GB,
  maxFilesPerBatch: 1000,
  maxZipDepth: 2
};

const blockedNames = new Set(['.env', '.env.local', '.env.production']);
const blockedParts = new Set(['.git', 'node_modules']);
const criticalExtensions = new Set(['.exe', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.dll', '.scr', '.com']);

function createBatchStagingDir(factoryDir, batchId) {
  const stagingDir = path.join(factoryDir, 'staging', batchId);
  ensureDir(stagingDir);
  return stagingDir;
}

function hashFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function normalizeZipEntryPath(entryName) {
  const normalized = String(entryName || '').replace(/\\/g, '/').split('/').filter(Boolean).join('/');
  const parts = normalized.split('/').filter(Boolean);
  if (!normalized || normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || parts.includes('..') || normalized.includes('\0')) {
    return { safe: false, normalized, warnings: ['Zip-Slip-Pfad blockiert.'] };
  }
  return { safe: true, normalized, warnings: [] };
}

function inspectPathSafety(relativePath) {
  const normalized = normalizeZipEntryPath(relativePath);
  const warnings = [...normalized.warnings];
  const parts = normalized.normalized.toLowerCase().split('/').filter(Boolean);
  const extension = path.extname(normalized.normalized).toLowerCase();
  let blocked = !normalized.safe;
  let ignored = false;
  if (parts.some((part) => blockedParts.has(part))) {
    ignored = true;
    warnings.push('Technischer Ordner wird ignoriert.');
  }
  if (blockedNames.has(parts.at(-1) || '')) {
    blocked = true;
    warnings.push('Secret-/Env-Datei blockiert.');
  }
  if (criticalExtensions.has(extension)) {
    blocked = true;
    warnings.push('Kritische Endung: Datei wird nur zur Pruefung importiert und nicht ausgefuehrt.');
  }
  return { ...normalized, extension, warnings, blocked, ignored };
}

function listZipEntries(zipPath) {
  const command = [
    'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
    `$zip=[System.IO.Compression.ZipFile]::OpenRead('${escapePowerShell(zipPath)}');`,
    '$zip.Entries | ForEach-Object { [PSCustomObject]@{ FullName=$_.FullName; Length=$_.Length; CompressedLength=$_.CompressedLength } } | ConvertTo-Json -Compress;',
    '$zip.Dispose();'
  ].join(' ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`ZIP konnte nicht gelesen werden: ${result.stderr || result.stdout}`);
  }
  const output = String(result.stdout || '').trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function extractZip(zipPath, destinationDir) {
  ensureDir(destinationDir);
  const command = [
    'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
    `[System.IO.Compression.ZipFile]::ExtractToDirectory('${escapePowerShell(zipPath)}','${escapePowerShell(destinationDir)}');`
  ].join(' ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`ZIP konnte nicht entpackt werden: ${result.stderr || result.stdout}`);
  }
}

function stageUploadFiles(fileInputs, options) {
  const now = options.now || new Date();
  const stagingDir = createBatchStagingDir(options.factoryDir, options.batchId);
  const stagedFiles = [];
  const warnings = [];
  let totalBytes = 0;

  (fileInputs || []).forEach((fileInput) => {
    const originalFilename = fileInput.originalFilename || fileInput.name || path.basename(fileInput.path || '');
    const extension = path.extname(originalFilename).toLowerCase();
    const sourcePath = fileInput.path || fileInput.sourcePath || '';
    const size = Number(fileInput.size || (sourcePath && fs.existsSync(sourcePath) ? fs.statSync(sourcePath).size : 0));
    totalBytes += size;
    const tooLarge = size > uploadLimits.maxSingleFileBytes;
    if (tooLarge) warnings.push(`${originalFilename}: Einzeldatei ueberschreitet 250 MB und wird blockiert.`);
    if (stagedFiles.length >= uploadLimits.maxFilesPerBatch) {
      warnings.push('Maximale Dateianzahl pro Batch erreicht.');
      return;
    }
    if (extension === '.zip' && sourcePath && fs.existsSync(sourcePath)) {
      stagedFiles.push(...stageZipFile(fileInput, stagingDir, options.batchId, now, warnings));
      return;
    }
    const targetPath = path.join(stagingDir, 'files', sanitizeFilename(originalFilename));
    ensureDir(path.dirname(targetPath));
    if (sourcePath && fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, targetPath);
    const safety = inspectPathSafety(originalFilename);
    stagedFiles.push({
      ...fileInput,
      originalFilename,
      name: originalFilename,
      sourcePath: targetPath,
      path: targetPath,
      size,
      sha256: hashFile(targetPath),
      staging: { batchId: options.batchId, stagedAt: now.toISOString(), fromZip: false },
      blocked: safety.blocked || tooLarge,
      ignored: safety.ignored,
      warnings: [
        ...safety.warnings,
        ...(tooLarge ? ['Einzeldatei ueberschreitet 250 MB und wird blockiert.'] : [])
      ]
    });
  });

  if (totalBytes > uploadLimits.maxBatchBytes) warnings.push('Upload-Batch ueberschreitet 2 GB.');
  return {
    files: stagedFiles.slice(0, uploadLimits.maxFilesPerBatch),
    warnings,
    storageSummary: {
      stagingDir,
      inputBytes: totalBytes,
      fileCount: stagedFiles.length,
      zipCount: (fileInputs || []).filter((file) => /\.zip$/i.test(file.name || file.originalFilename || '')).length
    }
  };
}

function stageZipFile(fileInput, stagingDir, batchId, now, warnings) {
  const originalFilename = fileInput.originalFilename || fileInput.name || path.basename(fileInput.path || '');
  const zipPath = fileInput.path || fileInput.sourcePath;
  const zipId = sanitizeFilename(path.basename(originalFilename, '.zip')) || `zip-${Date.now()}`;
  const zipRoot = path.join(stagingDir, 'zips', zipId);
  const extractedDir = path.join(zipRoot, 'extracted');
  ensureDir(zipRoot);
  const originalCopy = path.join(zipRoot, originalFilename);
  fs.copyFileSync(zipPath, originalCopy);

  const entries = listZipEntries(zipPath).filter((entry) => !String(entry.FullName || '').endsWith('/'));
  const extractedBytes = entries.reduce((sum, entry) => sum + Number(entry.Length || 0), 0);
  if (entries.length > uploadLimits.maxFilesPerBatch) warnings.push(`${originalFilename}: ZIP enthaelt mehr als 1.000 Dateien.`);
  if (extractedBytes > uploadLimits.maxZipExtractedBytes) warnings.push(`${originalFilename}: entpackte Groesse ueberschreitet 3 GB.`);
  entries.forEach((entry) => {
    const safety = inspectPathSafety(entry.FullName);
    if (!safety.safe) warnings.push(`${originalFilename}: ${entry.FullName} blockiert (${safety.warnings.join(', ')})`);
    if (Number(entry.Length || 0) > uploadLimits.maxSingleFileBytes) {
      warnings.push(`${originalFilename}: ${entry.FullName} ueberschreitet 250 MB und wird blockiert.`);
    }
    if (safety.normalized.split('/').filter((part) => part.toLowerCase().endsWith('.zip')).length > uploadLimits.maxZipDepth) {
      warnings.push(`${originalFilename}: maximale ZIP-Verschachtelung ueberschritten.`);
    }
  });
  if (warnings.some((warning) => warning.startsWith(`${originalFilename}:`) && /Zip-Slip|3 GB|1\.000|Verschachtelung/.test(warning))) {
    return [];
  }

  extractZip(zipPath, extractedDir);
  return entries.map((entry) => {
    const safety = inspectPathSafety(entry.FullName);
    const extractedPath = path.join(extractedDir, safety.normalized);
    return {
      name: path.basename(safety.normalized),
      originalFilename: path.basename(safety.normalized),
      sourcePath: extractedPath,
      path: extractedPath,
      size: Number(entry.Length || 0),
      sha256: hashFile(extractedPath),
      uploadArea: fileInput.uploadArea,
      originalZipFilename: originalFilename,
      zipEntryPath: safety.normalized,
      blocked: safety.blocked || Number(entry.Length || 0) > uploadLimits.maxSingleFileBytes,
      ignored: safety.ignored,
      warnings: [
        ...safety.warnings,
        ...(Number(entry.Length || 0) > uploadLimits.maxSingleFileBytes ? ['Einzeldatei ueberschreitet 250 MB und wird blockiert.'] : [])
      ],
      staging: { batchId, stagedAt: now.toISOString(), fromZip: true, originalZip: originalCopy, zipEntryPath: safety.normalized }
    };
  });
}

function sanitizeFilename(value) {
  return String(value || 'file').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''");
}

module.exports = {
  uploadLimits,
  normalizeZipEntryPath,
  inspectPathSafety,
  stageUploadFiles,
  listZipEntries
};
