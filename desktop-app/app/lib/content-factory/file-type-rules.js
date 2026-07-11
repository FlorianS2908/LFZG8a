const path = require('path');

const textPreviewExtensions = new Set(['.json', '.csv', '.xml', '.txt', '.md', '.html', '.css', '.js', '.ts', '.tsx']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']);
const supportedExtensions = new Set([
  ...textPreviewExtensions,
  '.xlsx',
  '.xlsm',
  '.pdf',
  '.epub',
  '.docx',
  '.pptx',
  ...imageExtensions,
  '.mp4',
  '.mp3',
  '.zip'
]);

function normalizeFilename(fileName) {
  return String(fileName || '').toLowerCase();
}

function extractDayNumber(fileName) {
  const value = normalizeFilename(fileName);
  const patterns = [
    /(?:^|[^a-z0-9])tag[_\-\s]?0?(\d{1,2})(?!\d)/i,
    /(?:^|[^a-z0-9])day[_\-\s]?0?(\d{1,2})(?!\d)/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

function detectTargetArea(fileName) {
  const value = normalizeFilename(fileName);
  const extension = path.extname(value);
  if (extension === '.epub' || extension === '.pdf') return 'referenceLiterature';
  if (/(referenz|reference|literatur|fachquelle|quelle|buch|book)/i.test(value)) return 'referenceLiterature';

  if (/(loesung|lösung|solution|antwort)/i.test(value)) return 'solution';
  if (/(aufgabe|task|exercise|uebung|übung)/i.test(value)) return 'task';
  if (/(quiz|fragenpool|questions|test)/i.test(value)) return 'quiz';
  if (/(dozent|trainer|lehrer)/i.test(value)) return 'trainerInfo';
  if (/(teilnehmer|student|\btn\b)/i.test(value)) return 'participantMaterial';
  if (/(klassenbuch|classbook)/i.test(value)) return 'classbookTemplate';
  if (/(bericht|report)/i.test(value)) return 'report';
  if (extension === '.css') return 'style';
  if (['.js', '.ts', '.tsx'].includes(extension)) return 'script';
  if (imageExtensions.has(extension)) return 'asset';
  if (extension === '.pptx') return 'presentation';
  if (extension === '.docx') return 'documentation';
  if (extension === '.pdf' || extension === '.epub') return 'referenceLiterature';
  if (['.xlsx', '.xlsm'].includes(extension)) return 'material';
  if (/(webvariante|web|index|tag)/i.test(value) && ['.html', '.md', '.txt'].includes(extension)) return 'webvariant';
  if (extension === '.zip') return 'other';
  return 'other';
}

function detectFileKind(fileName) {
  const extension = path.extname(normalizeFilename(fileName));
  if (textPreviewExtensions.has(extension)) return 'text';
  if (imageExtensions.has(extension)) return 'image';
  if (['.xlsx', '.xlsm'].includes(extension)) return 'spreadsheet';
  if (extension === '.pptx') return 'presentation';
  if (['.pdf', '.epub', '.docx'].includes(extension)) return 'document';
  if (['.mp4', '.mp3'].includes(extension)) return 'media';
  if (extension === '.zip') return 'archive';
  return 'unknown';
}

function isSupportedExtension(fileName) {
  return supportedExtensions.has(path.extname(normalizeFilename(fileName)));
}

module.exports = {
  textPreviewExtensions,
  imageExtensions,
  supportedExtensions,
  extractDayNumber,
  detectTargetArea,
  detectFileKind,
  isSupportedExtension
};
