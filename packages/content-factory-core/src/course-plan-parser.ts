import type { CoursePlan, CoursePlanDay, DepartmentKey, UploadedFileDescriptor } from './types.ts';

export type CoursePlanSheetOption = {
  name: string;
  rowCount: number;
  confidence: number;
  warnings: string[];
};

export function createFallbackCoursePlan(file: UploadedFileDescriptor): CoursePlan {
  const title = file.fileName.replace(/\.(xlsx|xlsm|docx|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Neuer Kurs';
  return {
    courseTitle: title,
    courseId: slugify(title),
    department: detectDepartment(file.fileName),
    selectedSheet: 'Fallback',
    availableSheets: ['Fallback'],
    sourceFile: file.fileName,
    totalDays: 1,
    warnings: ['Excel-Inhalte werden im MVP noch nicht vollstaendig gelesen. Bitte Vorschau pruefen und Tage manuell ergaenzen.'],
    unclearRows: [],
    days: [
      {
        dayNumber: 1,
        title: 'Tag 1',
        mainTopic: title,
        subTopics: [],
        learningGoals: ['Automatisch ergaenzt: nicht direkt im Ausgangsmaterial gefunden.'],
        ueBlocks: [],
        pauses: [],
        notes: 'Aus Dateiname erzeugter Fallback.'
      }
    ]
  };
}

export function listCoursePlanSheets(input: { fileName: string; text?: string }): CoursePlanSheetOption[] {
  if (!input.text?.trim()) {
    return [{ name: 'Tabelle1', rowCount: 0, confidence: 0.45, warnings: ['Sheetliste per Fallback erzeugt, weil im Browser keine Excel-Engine aktiv ist.'] }];
  }
  return splitWorkbookText(input.text).map((sheet) => ({
    name: sheet.name,
    rowCount: sheet.text.split(/\r?\n/).filter(Boolean).length,
    confidence: sheet.text.match(/tag|thema|lern|ue|zeit/i) ? 0.85 : 0.55,
    warnings: sheet.text.match(/tag|thema|lern|ue|zeit/i) ? [] : ['Tabellenkopf ist unklar.']
  }));
}

export function parseCoursePlanFromWorkbookText(input: {
  text: string;
  fileName?: string;
  selectedSheet?: string;
  courseTitle?: string;
  courseId?: string;
  department?: DepartmentKey;
}): CoursePlan {
  const sheets = splitWorkbookText(input.text);
  const selected = sheets.find((sheet) => sheet.name === input.selectedSheet) || sheets[0];
  return parseCoursePlanFromCsvText(selected?.text || input.text, input.fileName || 'unterrichtsplan.xlsx', {
    selectedSheet: selected?.name || input.selectedSheet || 'Tabelle1',
    availableSheets: sheets.map((sheet) => sheet.name),
    courseTitle: input.courseTitle,
    courseId: input.courseId,
    department: input.department
  });
}

export function parseCoursePlanFromCsvText(text: string, fileName = 'unterrichtsplan.xlsx', options: {
  selectedSheet?: string;
  availableSheets?: string[];
  courseTitle?: string;
  courseId?: string;
  department?: DepartmentKey;
} = {}): CoursePlan {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const warnings: string[] = [];
  const unclearRows: string[] = [];
  const days: CoursePlanDay[] = [];
  const header = rows[0]?.split(/[;\t,]/).map(normalizeHeader) || [];
  const column = (aliases: string[]) => header.findIndex((cell) => aliases.some((alias) => cell.includes(alias)));
  const dayIndex = column(['tag', 'day']);
  const titleIndex = column(['titel', 'title']);
  const topicIndex = column(['thema', 'topic', 'inhalt']);
  const goalIndex = column(['lernziel', 'ziel']);
  const ueIndex = column(['ue', 'unterrichtseinheit']);
  const timeIndex = column(['zeit', 'time']);
  const teacherIndex = column(['lehraufgabe', 'dozent', 'teacher']);
  const learnerIndex = column(['lernaufgabe', 'teilnehmer', 'learner']);
  const evaluationIndex = column(['evaluation', 'kontrolle']);
  const resourcesIndex = column(['ressource', 'material']);
  const notesIndex = column(['notiz', 'hinweis', 'anmerk']);
  if (dayIndex < 0) warnings.push('Spalte fuer Tag wurde nicht sicher erkannt. Erste Spalte wird als Tag interpretiert.');

  rows.slice(1).forEach((row, index) => {
    const cells = row.split(/[;\t,]/).map((cell) => cell.trim());
    const dayNumber = Number(cells[dayIndex >= 0 ? dayIndex : 0] || index + 1);
    if (!Number.isFinite(dayNumber)) {
      unclearRows.push(row);
      return;
    }
    const time = valueAt(cells, timeIndex);
    const topic = valueAt(cells, topicIndex) || valueAt(cells, titleIndex) || `Thema Tag ${dayNumber}`;
    const teacherTask = valueAt(cells, teacherIndex);
    const learnerTask = valueAt(cells, learnerIndex);
    const resources = valueAt(cells, resourcesIndex);
    const notes = valueAt(cells, notesIndex);
    const isBreak = /pause|mittag/i.test(topic);
    const ue = valueAt(cells, ueIndex) ? Number(valueAt(cells, ueIndex)) : undefined;
    days.push({
      dayNumber,
      title: valueAt(cells, titleIndex) || `Tag ${dayNumber} - ${topic}`,
      mainTopic: topic,
      subTopics: splitList(valueAt(cells, topicIndex)),
      learningGoals: splitList(valueAt(cells, goalIndex) || learnerTask),
      ue,
      ueBlocks: [{
        ue,
        time,
        topic,
        teacherTask,
        learnerTask,
        evaluation: valueAt(cells, evaluationIndex),
        resources,
        notes,
        isBreak
      }],
      pauses: isBreak && time ? [{ time, label: topic }] : [],
      projectContext: '',
      requiredOutputs: splitList(resources),
      notes
    });
  });

  if (!days.length) {
    warnings.push('Keine strukturierten Tage erkannt. Fallback-Tag wurde erzeugt.');
    days.push(createFallbackCoursePlan({ fileName }).days[0]);
  }

  const courseTitle = options.courseTitle || fileName.replace(/\.(xlsx|xlsm|csv|docx|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Neuer Kurs';
  const totalUE = days.reduce((sum, day) => sum + (day.ue || 0), 0) || undefined;
  return {
    courseTitle,
    courseId: options.courseId || slugify(courseTitle),
    department: options.department || detectDepartment(fileName),
    selectedSheet: options.selectedSheet || 'Tabelle1',
    availableSheets: options.availableSheets || ['Tabelle1'],
    sourceFile: fileName,
    totalUE,
    totalDays: days.length,
    days,
    warnings,
    unclearRows
  };
}

export function createPlanOnlyMappings(coursePlan: CoursePlan) {
  return coursePlan.days.map((planDay) => ({
    dayNumber: planDay.dayNumber,
    planDay,
    files: [],
    tasks: [],
    solutions: [],
    quizzes: [],
    projectFiles: [],
    sourceCode: [],
    databaseFiles: [],
    assets: [],
    unclearFiles: [],
    conflicts: []
  }));
}

function splitList(value?: string): string[] {
  return String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
}

function valueAt(cells: string[], index: number): string {
  return index >= 0 ? cells[index] || '' : '';
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function splitWorkbookText(text: string): Array<{ name: string; text: string }> {
  const parts = text.split(/^---\s*sheet:\s*(.+?)\s*---$/gim);
  if (parts.length <= 1) return [{ name: 'Tabelle1', text }];
  const sheets: Array<{ name: string; text: string }> = [];
  for (let index = 1; index < parts.length; index += 2) {
    sheets.push({ name: parts[index].trim(), text: parts[index + 1] || '' });
  }
  return sheets.length ? sheets : [{ name: 'Tabelle1', text }];
}

function detectDepartment(value: string): DepartmentKey {
  const upper = value.toUpperCase();
  if (upper.includes('FISI')) return 'FISI';
  if (upper.includes('KAB') || upper.includes('KABUE')) return 'KABUE';
  if (upper.includes('KITS')) return 'KITS';
  if (upper.includes('FIAE')) return 'FIAE';
  return 'ALLGEMEIN';
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kurs';
}
