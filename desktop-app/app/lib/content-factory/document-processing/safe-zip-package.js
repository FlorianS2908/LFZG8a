const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readZipPackage(filePath, options = {}) {
  const buffer = fs.readFileSync(filePath);
  const eocd = findEocd(buffer);
  if (eocd < 0) throw coded('DOCUMENT_CORRUPT', 'ZIP-Zentralverzeichnis wurde nicht gefunden.');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw coded('DOCUMENT_CORRUPT', 'ZIP-Zentralverzeichnis ist beschädigt.');
    const flags = buffer.readUInt16LE(offset + 8);
    if (flags & 1) throw coded('DOCUMENT_ENCRYPTED', 'Die Datei ist verschlüsselt oder passwortgeschützt.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replace(/\\/g, '/');
    validateArchivePath(name);
    if (uncompressedSize > Number(options.maxEntryBytes || 250 * 1024 * 1024)) throw coded('DOCUMENT_TOO_LARGE', `Archiveintrag ist zu groß: ${name}`);
    entries.push({ name, data: inflate(buffer, { name, method, compressedSize, localOffset }) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function writeZipPackage(filePath, entries) {
  const localParts = []; const centralParts = []; let offset = 0;
  for (const entry of entries) {
    validateArchivePath(entry.name);
    const name = Buffer.from(entry.name, 'utf8'); const data = Buffer.from(entry.data); const crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    centralParts.push(central, name); offset += local.length + name.length + data.length;
  }
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralParts.reduce((sum, part) => sum + part.length, 0), 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(filePath, Buffer.concat([...localParts, ...centralParts, end]));
}

function validateArchivePath(name) {
  const normalized = path.posix.normalize(String(name || '').replace(/\\/g, '/'));
  if (!normalized || normalized.startsWith('../') || normalized.includes('/../') || normalized.startsWith('/') || /^[a-z]:/i.test(normalized)) throw coded('ARCHIVE_PATH_TRAVERSAL', 'Das Archiv enthält einen unsicheren Pfad.');
}
function inflate(buffer, entry) {
  if (buffer.readUInt32LE(entry.localOffset) !== 0x04034b50) throw coded('DOCUMENT_CORRUPT', `ZIP-Eintrag ist beschädigt: ${entry.name}`);
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26); const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const compressed = buffer.subarray(entry.localOffset + 30 + nameLength + extraLength, entry.localOffset + 30 + nameLength + extraLength + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(compressed);
  if (entry.method === 8) return zlib.inflateRawSync(compressed);
  throw coded('DOCUMENT_CORRUPT', `Nicht unterstützte ZIP-Kompression: ${entry.method}`);
}
function findEocd(buffer) { for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) if (buffer.readUInt32LE(offset) === 0x06054b50) return offset; return -1; }
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { readZipPackage, writeZipPackage, validateArchivePath };
