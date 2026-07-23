const fs = require('fs');
const path = require('path');
const { readZipPackage } = require('./document-processing/safe-zip-package');

function parseCoursePlan(filePath, options = {}) {
  const fileName = path.basename(filePath || options.fileName || 'unterrichtsplan.xlsx');
  const warnings = [];
  if (!filePath || !fs.existsSync(filePath)) {
    return fallbackPlan(fileName, options, ['Unterrichtsplan konnte nicht gelesen werden. Fallback-Plan erzeugt.']);
  }

  const extension = path.extname(filePath).toLowerCase();
  if (!['.xlsx', '.xlsm'].includes(extension)) {
    return fallbackPlan(fileName, options, ['Nur .xlsx/.xlsm werden produktiv geparst. Fallback-Plan erzeugt.']);
  }

  try {
    const workbook = readWorkbookXml(filePath);
    const selection = selectCoursePlanSheet(workbook.sheets, options.selectedSheet);
    if (!selection.sheet) return fallbackPlan(fileName, options, [selection.message]);
    const selectedSheet = selection.sheet.name;
    const sheet = selection.sheet;
    if (!sheet || !sheet.rows.length) {
      return fallbackPlan(fileName, options, ['Keine lesbaren Zeilen im Unterrichtsplan gefunden.']);
    }
    return parseRows(sheet.rows, {
      ...options,
      fileName,
      selectedSheet,
      availableSheets: workbook.sheets.map((entry) => entry.name),
      warnings: [...warnings, ...(selection.ambiguous ? ['Mehrere Tabellenblätter sind ähnlich geeignet. Bitte Blattauswahl prüfen.'] : [])],
      sheetSelection: { suggestedSheet: selectedSheet, scores: selection.scores, ambiguous: selection.ambiguous }
    });
  } catch (error) {
    return fallbackPlan(fileName, options, [`Unterrichtsplanparser-Fallback: ${error.message}`]);
  }
}

function selectCoursePlanSheet(sheets = [], selectedSheet = '') {
  const scores = scoreSheets(sheets);
  if (selectedSheet) { const exact = sheets.find((sheet) => sheet.name === selectedSheet); if (exact) return { sheet: exact, scores, ambiguous: false, explicit: true }; }
  const ranked = scores.filter((item) => !item.hidden).sort((a, b) => b.score - a.score);
  if (!ranked.length || ranked[0].score < 2) return { sheet: null, scores, ambiguous: false, message: 'Kein fachlich geeignetes Tabellenblatt gefunden. Bitte ein Blatt manuell auswählen.' };
  return { sheet: sheets.find((sheet) => sheet.name === ranked[0].name), scores, ambiguous: Boolean(ranked[1] && ranked[0].score - ranked[1].score <= 1) };
}
function scoreSheets(sheets = []) { const positive = /\b(tag|ue|unterrichtseinheit|thema|lernziel|kompetenz|zeit|dauer|material|methode|arbeitsform)\b/gi; const negative = /(änderungshistorie|anleitung|checkliste|versionshistorie|hinweise|kennzahlen)/gi; return sheets.map((sheet) => { const sample = `${sheet.name} ${(sheet.rows || []).slice(0, 15).flat().join(' ')}`; const positives = new Set((sample.match(positive) || []).map((value) => value.toLowerCase())).size; const negatives = new Set((sample.match(negative) || []).map((value) => value.toLowerCase())).size; return { name: sheet.name, hidden: Boolean(sheet.hidden), score: positives * 2 - negatives * 3 - (sheet.hidden ? 1 : 0), positiveMatches: positives, negativeMatches: negatives }; }); }

function readWorkbookXml(filePath) {
  const entries = Object.fromEntries(readZipPackage(filePath).filter((entry) => /^xl\/(workbook|sharedStrings|worksheets\/sheet[0-9]+)\.xml$/.test(entry.name)).map((entry) => [entry.name, entry.data.toString('utf8')]));
  const shared = parseSharedStrings(entries['xl/sharedStrings.xml'] || '');
  const workbookSheets = parseWorkbookSheets(entries['xl/workbook.xml'] || '');
  const sheetEntries = Object.entries(entries)
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const sheets = sheetEntries.map(([entryName, xml], index) => ({
    name: workbookSheets[index]?.name || `Tabelle${index + 1}`,
    hidden: Boolean(workbookSheets[index]?.hidden),
    entryName,
    rows: parseSheetRows(xml, shared)
  }));
  return { sheets };
}

function parseWorkbookSheets(xml) {
  return Array.from(String(xml || '').matchAll(/<sheet\b([^>]*)name="([^"]+)"([^>]*)/g)).map((match) => {
    const attrs = `${match[1]} ${match[3]}`;
    return { name: decodeXml(match[2]), hidden: /state="(?:hidden|veryHidden)"/i.test(attrs) };
  });
}

function parseSharedStrings(xml) {
  return Array.from(String(xml || '').matchAll(/<si\b[\s\S]*?<\/si>/g)).map((match) => {
    const text = Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part) => decodeXml(part[1])).join('');
    return text.trim();
  });
}

function parseSheetRows(xml, shared) {
  return Array.from(String(xml || '').matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)).map((rowMatch) => {
    const cells = [];
    Array.from(rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)).forEach((cellMatch) => {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1] || '';
      const index = columnIndex(ref);
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] || /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] || '';
      const value = attrs.includes('t="s"') ? shared[Number(raw)] || '' : decodeXml(raw);
      cells[index] = String(value || '').trim();
    });
    return cells.map((cell) => cell || '');
  }).filter((row) => row.some(Boolean));
}

function parseRows(rows, options) {
  const blockPlan = parseBlockCoursePlan(rows, options);
  if (blockPlan) return blockPlan;
  const headerIndex = rows.findIndex((row) => row.some((cell) => /tag|day|datum|ue|thema|lernziel/i.test(cell)));
  const header = rows[Math.max(headerIndex, 0)] || [];
  const dataRows = rows.slice(Math.max(headerIndex + 1, 1));
  const indexes = {
    day: findHeader(header, ['tag', 'day', 'tagnummer']),
    ue: findHeader(header, ['ue', 'unterrichtseinheit', 'einheit']),
    time: findHeader(header, ['zeit', 'time']),
    format: findHeader(header, ['lernform', 'format', 'methode']),
    topic: findHeader(header, ['thema', 'topic', 'inhalt']),
    goal: findHeader(header, ['lernziel', 'ziel']),
    teacher: findHeader(header, ['lehraufgabe', 'dozent', 'trainer', 'teacher']),
    learner: findHeader(header, ['lernaufgabe', 'teilnehmer', 'learner', 'aufgabe']),
    evaluation: findHeader(header, ['evaluation', 'kontrolle', 'ergebnis']),
    resources: findHeader(header, ['ressource', 'material', 'unterlage']),
    notes: findHeader(header, ['hinweis', 'notiz', 'bemerkung'])
  };
  const dayMap = new Map();
  dataRows.forEach((row, rowIndex) => {
    const dayNumber = Number(row[indexes.day] || detectDay(row.join(' ')) || rowIndex + 1);
    if (!Number.isFinite(dayNumber) || dayNumber < 1) return;
    const topic = getCell(row, indexes.topic) || `Themenblock ${dayNumber}`;
    const goal = getCell(row, indexes.goal);
    const entry = dayMap.get(dayNumber) || {
      dayNumber,
      title: `Tag ${dayNumber} - ${topic}`,
      mainTopic: topic,
      subTopics: [],
      learningGoals: [],
      ueBlocks: [],
      pauses: [],
      warnings: []
    };
    if (topic && entry.mainTopic !== topic && !entry.subTopics.includes(topic)) entry.subTopics.push(topic);
    if (goal && !entry.learningGoals.includes(goal)) entry.learningGoals.push(goal);
    const block = {
      ue: Number(getCell(row, indexes.ue)) || entry.ueBlocks.length + 1,
      time: getCell(row, indexes.time),
      learningFormat: getCell(row, indexes.format),
      topic,
      teacherTask: getCell(row, indexes.teacher),
      learnerTask: getCell(row, indexes.learner),
      evaluation: getCell(row, indexes.evaluation),
      resources: getCell(row, indexes.resources),
      notes: getCell(row, indexes.notes),
      isBreak: /pause/i.test(row.join(' '))
    };
    if (block.isBreak) entry.pauses.push({ time: block.time, label: block.topic || 'Pause' });
    else entry.ueBlocks.push(block);
    dayMap.set(dayNumber, entry);
  });
  const days = Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber);
  if (!days.length) return fallbackPlan(options.fileName, options, ['Keine Tage erkannt. Fallback-Plan erzeugt.']);
  days.forEach((day) => {
    if (!day.learningGoals.length) day.learningGoals.push('Lernziel aus Unterrichtsplan pruefen.');
    if (!day.ueBlocks.length) day.warnings.push('Keine UE-Bloecke erkannt.');
  });
  return {
    courseTitle: options.courseTitle || path.basename(options.fileName, path.extname(options.fileName)).replace(/[_-]+/g, ' '),
    selectedSheet: options.selectedSheet,
    availableSheets: options.availableSheets || [options.selectedSheet || 'Tabelle1'],
    totalDays: days.length,
    totalUE: days.reduce((sum, day) => sum + day.ueBlocks.length, 0),
    sourceFile: options.fileName,
    sheetSelection: options.sheetSelection || null,
    parseStatus: 'parsed',
    days,
    warnings: options.warnings || []
  };
}

function parseBlockCoursePlan(rows, options) {
  const findControlValue = (label) => {
    const row = rows.find((entry) => normalize(entry[0]) === normalize(label));
    const value = Number(String(row?.[1] || '').replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
  };
  const totalDays = Math.round(findControlValue('Anzahl Tage'));
  const totalUE = Math.round(findControlValue('Anzahl UE'));
  const durationHeader = rows.findIndex((row) => normalize(row[0]) === normalize('Dauer in UE'));
  const contentRow = rows.slice(durationHeader + 1).find((row) => Number(row[0]) === totalUE && String(row[1] || '').trim());
  if (durationHeader < 0 || !contentRow || totalDays < 1 || totalUE < totalDays) return null;

  const courseTitle = String(rows.find((row) => normalize(row[0]) === normalize('Lernfeldtitel'))?.[1] || options.courseTitle || path.basename(options.fileName, path.extname(options.fileName))).trim();
  const learningGoals = rows
    .filter((row) => /^lernziele?:?$/i.test(String(row[0] || '').trim()))
    .flatMap((row) => String(row[1] || '').split(/\r?\n/))
    .map((value) => value.trim())
    .filter(Boolean);
  const topics = splitNumberedTopics(String(contentRow[1] || ''));
  const groupedTopics = distributeTopics(topics, totalDays);
  const unitsByDay = Array.from({ length: totalDays }, (_, index) => Math.floor(totalUE / totalDays) + (index < totalUE % totalDays ? 1 : 0));
  const days = groupedTopics.map((dayTopics, index) => {
    const mainTopic = dayTopics[0] || courseTitle;
    const unitCount = unitsByDay[index];
    return {
      dayNumber: index + 1,
      title: `Tag ${index + 1} - ${mainTopic}`,
      mainTopic,
      subTopics: dayTopics.slice(1),
      learningGoals: learningGoals.length ? [...learningGoals] : [`Die Inhalte von ${mainTopic} fachgerecht anwenden.`],
      ueBlocks: Array.from({ length: unitCount }, (_, unitIndex) => ({
        ue: unitIndex + 1,
        time: '',
        learningFormat: '',
        topic: dayTopics[unitIndex % dayTopics.length] || mainTopic,
        teacherTask: '',
        learnerTask: '',
        evaluation: '',
        resources: '',
        notes: '',
        isBreak: false
      })),
      pauses: [],
      warnings: []
    };
  });
  return {
    courseTitle,
    selectedSheet: options.selectedSheet,
    availableSheets: options.availableSheets || [options.selectedSheet || 'Tabelle1'],
    totalDays,
    totalUE,
    sourceFile: options.fileName,
    sheetSelection: options.sheetSelection || null,
    parseStatus: 'parsed',
    days,
    warnings: options.warnings || []
  };
}

function splitNumberedTopics(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  const matches = Array.from(normalized.matchAll(/(?:^|\n)(\d+(?:\.\d+)*)\.\s+([^\n]+)/g));
  if (!matches.length) return normalized.split(/\n+/).map((value) => value.trim()).filter(Boolean);
  return matches.map((match, index) => {
    const start = match.index + match[0].indexOf(match[2]);
    const end = matches[index + 1]?.index ?? normalized.length;
    return normalized.slice(start, end).replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}

function distributeTopics(topics, dayCount) {
  const groups = Array.from({ length: dayCount }, () => []);
  topics.forEach((topic, index) => groups[Math.min(dayCount - 1, Math.floor(index * dayCount / Math.max(topics.length, 1)))].push(topic));
  for (let index = 0; index < groups.length; index += 1) {
    if (!groups[index].length) groups[index].push(topics[Math.min(index, topics.length - 1)] || `Tag ${index + 1}`);
  }
  return groups;
}

function fallbackPlan(fileName, options = {}, warnings = []) {
  const title = options.courseTitle || path.basename(fileName, path.extname(fileName)).replace(/[_-]+/g, ' ');
  return {
    courseTitle: title,
    selectedSheet: options.selectedSheet || 'Tabelle1',
    availableSheets: ['Tabelle1'],
    totalDays: 1,
    totalUE: 1,
    sourceFile: fileName,
    days: [{
      dayNumber: 1,
      title: `Tag 1 - ${title}`,
      mainTopic: title,
      subTopics: [],
      learningGoals: ['Aus dem Unterrichtsplan ableiten und pruefen.'],
      ueBlocks: [{
        ue: 1,
        time: '',
        learningFormat: '',
        topic: title,
        teacherTask: 'Dozentenhinweis noch ergaenzen',
        learnerTask: 'Aufgabe noch ergaenzen',
        evaluation: 'Lernzielkontrolle noch ergaenzen',
        resources: 'Material noch ergaenzen',
        notes: '',
        isBreak: false
      }],
      pauses: [],
      warnings
    }],
    warnings,
    parseStatus: 'manual_review_required'
  };
}

function findHeader(header, candidates) {
  const normalized = header.map((cell) => normalize(cell));
  return normalized.findIndex((cell) => candidates.some((candidate) => cell.includes(candidate)));
}

function getCell(row, index) {
  return index >= 0 ? String(row[index] || '').trim() : '';
}

function detectDay(text) {
  const match = /(?:tag|day)\s*(\d{1,2})/i.exec(text) || /(?:^|[^\d])(\d{1,2})(?:[^\d]|$)/.exec(text);
  return match ? Number(match[1]) : null;
}

function columnIndex(ref) {
  return String(ref || 'A').split('').reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
}

function decodeXml(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function escapePowerShell(value) {
  return String(value || '').replace(/'/g, "''");
}

module.exports = {
  parseCoursePlan,
  readWorkbookXml,
  parseRows,
  fallbackPlan,
  selectCoursePlanSheet,
  scoreSheets
};
