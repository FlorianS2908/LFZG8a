import type { CodeLanguage, ContentCategory, FileAnalysis, TechnicalType, UploadedFileDescriptor } from './types.ts';

const executableExtensions = new Set(['.exe', '.bat', '.cmd', '.ps1', '.sh', '.msi']);
const blockedNames = new Set(['.env', '.env.local', '.env.production']);
const ignoredPathParts = new Set(['.git', 'node_modules', 'vendor', 'bin', 'obj', 'target', '.vs', '.idea', '.vscode']);

export function normalizeArchivePath(input: string): { safe: boolean; normalized: string; warnings: string[] } {
  const warnings: string[] = [];
  const normalized = input.replace(/\\/g, '/').split('/').filter(Boolean).join('/');
  const parts = normalized.split('/');
  if (input.includes('\0') || normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || parts.includes('..')) {
    return { safe: false, normalized, warnings: ['Unsicherer Archivpfad blockiert: moeglicher ZIP-Slip.'] };
  }
  if (parts.some((part) => ignoredPathParts.has(part))) {
    warnings.push('Datei liegt in einem ignorierten technischen Ordner.');
  }
  if (blockedNames.has(parts.at(-1)?.toLowerCase() || '')) {
    warnings.push('Secret-/Env-Datei wird nicht exportiert.');
  }
  return { safe: true, normalized, warnings };
}

export function getExtension(fileName: string): string {
  const cleanName = fileName.split(/[\\/]/).pop() || fileName;
  const index = cleanName.lastIndexOf('.');
  return index >= 0 ? cleanName.slice(index).toLowerCase() : '';
}

export function classifyUploadedFile(file: UploadedFileDescriptor): FileAnalysis {
  const sourcePath = file.relativePath || file.fileName;
  const safePath = normalizeArchivePath(sourcePath);
  const fileName = sourcePath.split(/[\\/]/).pop() || file.fileName;
  const lowerPath = sourcePath.toLowerCase();
  const lowerName = fileName.toLowerCase();
  const extension = getExtension(fileName);
  const warnings = [...safePath.warnings];
  let technicalType: TechnicalType = 'unknown';
  let language: CodeLanguage | undefined = 'unknown';
  let contentCategory: ContentCategory = 'other';
  let confidence = 0.45;
  let ignored = false;
  let blocked = false;

  if (!safePath.safe) {
    blocked = true;
    warnings.push(...safePath.warnings);
  }
  if (blockedNames.has(lowerName)) {
    blocked = true;
    warnings.push('Secret-Datei blockiert.');
  }
  if (executableExtensions.has(extension)) {
    blocked = true;
    warnings.push('Ausfuehrbare Datei blockiert oder nur mit Warnung uebernehmen.');
  }
  if (safePath.normalized.split('/').some((part) => ignoredPathParts.has(part))) {
    ignored = true;
  }

  if (['.xlsx', '.xlsm'].includes(extension) || file.uploadArea === 'course-plan') {
    technicalType = 'course-plan';
    contentCategory = 'course-plan';
    language = undefined;
    confidence = 0.95;
  } else if (['.zip'].includes(extension)) {
    technicalType = 'archive';
    contentCategory = 'other';
    confidence = 0.8;
  } else if (extension === '.pptx') {
    technicalType = 'presentation';
    contentCategory = 'presentation';
    confidence = 0.85;
  } else if (extension === '.epub') {
    technicalType = 'document';
    contentCategory = 'reference-literature';
    confidence = 0.86;
  } else if (['.pdf', '.docx'].includes(extension)) {
    technicalType = 'document';
    contentCategory = detectCategoryFromWords(lowerPath, /(referenz|reference|literatur|fachquelle|fachbuch|quelle)/i.test(lowerPath) ? 'reference-literature' : 'handout');
    confidence = 0.76;
  } else if (extension === '.md') {
    technicalType = 'document';
    language = 'markdown';
    contentCategory = detectCategoryFromWords(lowerPath, 'participant-material');
    confidence = 0.78;
  } else if (extension === '.ipynb') {
    technicalType = 'notebook';
    contentCategory = detectCategoryFromWords(lowerPath, 'task');
    confidence = 0.78;
  } else if (extension === '.html' || extension === '.htm') {
    language = 'html';
    contentCategory = detectCategoryFromWords(lowerPath, lowerPath.includes('webvariante') ? 'webvariant' : 'source-code');
    technicalType = contentCategory === 'webvariant' ? 'web-document' : 'source-code';
    confidence = lowerPath.includes('webvariante') ? 0.9 : 0.78;
  } else if (['.css', '.js', '.ts', '.tsx', '.jsx', '.php', '.java', '.cs', '.py'].includes(extension)) {
    technicalType = 'source-code';
    language = detectLanguage(extension);
    contentCategory = 'source-code';
    confidence = 0.9;
  } else if (extension === '.sql') {
    technicalType = 'database';
    language = 'sql';
    contentCategory = detectDatabaseCategory(lowerPath);
    confidence = 0.9;
  } else if (['.json', '.xml', '.txt', '.docx'].includes(extension) && file.uploadArea === 'quiz') {
    language = extension === '.xml' ? 'xml' : extension === '.json' ? 'json' : undefined;
    technicalType = 'quiz';
    contentCategory = 'quiz';
    confidence = 0.88;
  } else if (extension === '.json') {
    language = 'json';
    if (lowerPath.includes('quiz') || lowerPath.includes('fragen') || lowerPath.includes('question')) {
      technicalType = 'quiz';
      contentCategory = 'quiz';
      confidence = 0.92;
    } else {
      technicalType = 'asset';
      contentCategory = 'asset';
      confidence = 0.65;
    }
  } else if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(extension)) {
    technicalType = 'image';
    contentCategory = 'asset';
    language = undefined;
    confidence = 0.9;
  }

  if (file.uploadArea && file.uploadArea !== 'other') {
    contentCategory = categoryFromUploadArea(file.uploadArea, contentCategory);
    confidence = Math.max(confidence, 0.82);
  }

  const detectedDay = detectDayNumber(lowerPath);
  const detectedTopics = detectTopics(lowerPath);
  if (!detectedDay && ['task', 'solution', 'quiz', 'webvariant'].includes(contentCategory)) {
    warnings.push('Keine eindeutige Tagnummer erkannt.');
  }

  return {
    fileId: file.fileId || createStableId(sourcePath),
    fileName,
    sourcePath,
    extension,
    technicalType,
    language,
    contentCategory,
    detectedDay,
    detectedTopics,
    confidence,
    needsReview: confidence < 0.72 || warnings.length > 0,
    warnings,
    ignored,
    blocked
  };
}

function detectLanguage(extension: string): CodeLanguage {
  const map: Record<string, CodeLanguage> = {
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.php': 'php',
    '.java': 'java',
    '.cs': 'csharp',
    '.py': 'python'
  };
  return map[extension] || 'unknown';
}

function detectCategoryFromWords(path: string, fallback: ContentCategory): ContentCategory {
  if (/(loesung|lösung|solution|muster)/i.test(path)) return path.includes('projekt') ? 'project-solution' : 'solution';
  if (/(aufgabe|task|uebung|übung)/i.test(path)) return 'task';
  if (/(dozent|trainer|hinweis)/i.test(path)) return 'trainer-info';
  if (/(teilnehmer|handout|material)/i.test(path)) return 'participant-material';
  if (/(starter|startdatei)/i.test(path)) return 'project-starter';
  if (/(szenario|ausgangssituation)/i.test(path)) return 'project-scenario';
  if (/quiz|fragenpool|questions/i.test(path)) return 'quiz';
  return fallback;
}

function detectDatabaseCategory(path: string): ContentCategory {
  if (/solution|loesung|lösung/i.test(path)) return 'database-solution';
  if (/seed|testdaten|insert/i.test(path)) return 'database-seed';
  if (/query|select|dql/i.test(path)) return 'database-query';
  return 'database-schema';
}

function categoryFromUploadArea(area: string, fallback: ContentCategory): ContentCategory {
  const map: Record<string, ContentCategory> = {
    'course-plan': 'course-plan',
    materials: 'participant-material',
    tasks: 'task',
    solutions: 'solution',
    quiz: 'quiz',
    project: fallback.startsWith('project-') ? fallback : 'project-scenario',
    'source-code': 'source-code',
    database: fallback.startsWith('database-') ? fallback : 'database-schema',
    assets: 'asset',
    'reference-literature': 'reference-literature',
    'ai-materials': 'participant-material'
  };
  return map[area] || fallback;
}

function detectDayNumber(path: string): number | undefined {
  const match = path.match(/(?:tag|day|d)[\s_-]*(\d{1,2})/i) || path.match(/(?:^|[^\d])(\d{1,2})(?:[^\d]|$)/);
  return match ? Number(match[1]) : undefined;
}

function detectTopics(path: string): string[] {
  return ['html', 'css', 'sql', 'javascript', 'datenbank', 'projekt', 'formular', 'layout', 'responsive']
    .filter((topic) => path.includes(topic));
}

function createStableId(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return `file-${Math.abs(hash).toString(36)}`;
}
