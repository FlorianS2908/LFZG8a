const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function readZipTextEntries(zipPath, pattern) {
  const buffer = fs.readFileSync(zipPath);
  const matcher = new RegExp(pattern, 'i');
  const entries = readCentralDirectory(buffer);
  return entries
    .filter((entry) => matcher.test(entry.FullName))
    .map((entry) => ({ FullName: entry.FullName, Text: inflateEntry(buffer, entry).toString('utf8') }));
}

function xmlText(xml) {
  return String(xml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlTextRuns(xml) {
  return Array.from(String(xml || '').matchAll(/<[^:>]*:?t[^>]*>([\s\S]*?)<\/[^:>]*:?t>/g))
    .map((match) => xmlText(match[1]))
    .filter(Boolean);
}

function readCentralDirectory(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) throw new Error('ZIP-Zentralverzeichnis wurde nicht gefunden.');
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const FullName = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replace(/\\/g, '/');
    const normalizedName = path.posix.normalize(FullName);
    if (normalizedName.startsWith('../') || normalizedName.includes('/../') || normalizedName.startsWith('/') || /^[a-z]:/i.test(normalizedName)) throw new Error('Archiv enthält einen unsicheren Pfad.');
    entries.push({ FullName, compressionMethod, compressedSize, uncompressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(buffer) {
  const min = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= min; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function inflateEntry(buffer, entry) {
  if (entry.uncompressedSize > 250 * 1024 * 1024) {
    throw new Error(`ZIP-Eintrag ist zu gross: ${entry.FullName}`);
  }
  if (buffer.readUInt32LE(entry.localOffset) !== 0x04034b50) {
    throw new Error(`ZIP-Eintrag ist beschaedigt: ${entry.FullName}`);
  }
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const dataStart = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`ZIP-Kompression wird nicht unterstuetzt: ${entry.compressionMethod}`);
}

module.exports = {
  readZipTextEntries,
  xmlText,
  xmlTextRuns
};
