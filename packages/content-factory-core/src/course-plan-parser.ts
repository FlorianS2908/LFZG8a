import type { CoursePlan, CoursePlanDay, DepartmentKey, UploadedFileDescriptor } from './types.ts';

export function createFallbackCoursePlan(file: UploadedFileDescriptor): CoursePlan {
  const title = file.fileName.replace(/\.(xlsx|xlsm|docx|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Neuer Kurs';
  return {
    courseTitle: title,
    courseId: slugify(title),
    department: detectDepartment(file.fileName),
    warnings: ['Excel-Inhalte werden im MVP noch nicht vollstaendig gelesen. Bitte Vorschau pruefen und Tage manuell ergaenzen.'],
    unclearRows: [],
    days: [
      {
        dayNumber: 1,
        title: 'Tag 1',
        mainTopic: title,
        subTopics: [],
        learningGoals: ['Automatisch ergaenzt: nicht direkt im Ausgangsmaterial gefunden.'],
        notes: 'Aus Dateiname erzeugter Fallback.'
      }
    ]
  };
}

export function parseCoursePlanFromCsvText(text: string, fileName = 'unterrichtsplan.xlsx'): CoursePlan {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const warnings: string[] = [];
  const unclearRows: string[] = [];
  const days: CoursePlanDay[] = [];

  rows.slice(1).forEach((row, index) => {
    const cells = row.split(/[;\t,]/).map((cell) => cell.trim());
    const dayNumber = Number(cells[0] || index + 1);
    if (!Number.isFinite(dayNumber)) {
      unclearRows.push(row);
      return;
    }
    days.push({
      dayNumber,
      title: cells[1] || `Tag ${dayNumber}`,
      mainTopic: cells[2] || cells[1] || `Thema Tag ${dayNumber}`,
      subTopics: splitList(cells[3]),
      learningGoals: splitList(cells[4]),
      ue: cells[5] ? Number(cells[5]) : undefined,
      projectContext: cells[6],
      requiredOutputs: splitList(cells[7]),
      notes: cells[8]
    });
  });

  if (!days.length) {
    warnings.push('Keine strukturierten Tage erkannt. Fallback-Tag wurde erzeugt.');
    days.push(createFallbackCoursePlan({ fileName }).days[0]);
  }

  const courseTitle = fileName.replace(/\.(xlsx|xlsm|csv|docx|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Neuer Kurs';
  return {
    courseTitle,
    courseId: slugify(courseTitle),
    department: detectDepartment(fileName),
    days,
    warnings,
    unclearRows
  };
}

function splitList(value?: string): string[] {
  return String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
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
