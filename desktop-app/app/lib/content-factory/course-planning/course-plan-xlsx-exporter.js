const path = require('path');
const fs = require('fs');
const { writeZipPackage } = require('../document-processing/safe-zip-package');
const { normalizeCanonicalPlan } = require('./canonical-course-plan');

const HEADERS = ['Tag', 'UE', 'Fortlaufende UE', 'Dauer', 'Thema', 'Inhalt', 'Kompetenzziel', 'Arbeitsform', 'Lehrhandlung', 'Lernhandlung', 'Aufgaben', 'Materialien', 'Lernstandsprüfung', 'Differenzierung', 'Erwartetes Ergebnis', 'Evaluation', 'Bemerkungen', 'Quellenbezug', 'Warnungen', 'Status'];

function exportCoursePlanXlsx(plan, outputPath, options = {}) {
  if (path.extname(outputPath).toLowerCase() !== '.xlsx') throw coded('COURSE_PLAN_EXPORT_EXTENSION', 'Der Unterrichtsplan muss als .xlsx gespeichert werden.');
  if (fs.existsSync(outputPath) && !options.overwrite) throw coded('COURSE_PLAN_EXPORT_EXISTS', 'Die Zieldatei existiert bereits und wurde nicht überschrieben.');
  const value = normalizeCanonicalPlan(plan, plan); const rows = value.days.flatMap((day) => day.units.map((unit) => [day.dayNumber, unit.unitNumber, unit.globalUnitNumber, unit.durationMinutes, unit.topic, unit.content, unit.competencyGoal, unit.workFormat.label, unit.teacherActivity, unit.learnerActivity, join(unit.tasks), join(unit.materials), join(unit.assessments), join(unit.differentiation), unit.expectedOutcome, unit.evaluation, unit.notes, join(unit.sourceReferences), join(unit.warnings), unit.status]));
  const sheets = [
    ['Unterrichtsplan', [HEADERS, ...rows]],
    ['Kursübersicht', [['Kurs-ID', value.courseId], ['Titel', value.title], ['Kurstage', value.totalDays], ['Unterrichtseinheiten', value.totalUnits], ['UE-Dauer', value.unitDurationMinutes]]],
    ['Konfiguration', Object.entries(options.configuration || {}).map(([key, val]) => [key, serial(val)]).length ? Object.entries(options.configuration || {}).map(([key, val]) => [key, serial(val)]) : [['Hinweis', 'Keine zusätzliche Konfiguration gespeichert']]],
    ['Offene Punkte und Warnungen', [['Tag', 'UE', 'Warnung'], ...value.days.flatMap((day) => day.units.flatMap((unit) => unit.warnings.map((warning) => [day.dayNumber, unit.unitNumber, serial(warning)])))]],
    ['Quellen', [['Dokument-ID', 'Fundstelle'], ...uniqueSources(value).map((ref) => [ref.documentId || '', ref.location || ref.sourceRef || ref.page || ref.section || ''])]]
  ];
  writeZipPackage(outputPath, workbookEntries(sheets));
  return { outputPath, rowCount: rows.length, sheetNames: sheets.map(([name]) => name), exportedAt: new Date().toISOString() };
}

function workbookEntries(sheets) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], i) => `<sheet name="${xml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`;
  return [entry('[Content_Types].xml', contentTypes), entry('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`), entry('xl/workbook.xml', workbook), entry('xl/_rels/workbook.xml.rels', rels), ...sheets.map(([, rows], i) => entry(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(rows)))];
}
function sheetXml(rows) { const widths = [8,8,14,10,24,42,36,22,34,34,28,28,25,25,34,28,28,26,28,14]; return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.slice(0, Math.max(1, ...(rows.map((r) => r.length)))).map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join('')}</cols><autoFilter ref="A1:${columnName(Math.max(1, ...(rows.map((r) => r.length))))}${Math.max(1, rows.length)}"/><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(r + 1, c + 1, value)).join('')}</row>`).join('')}</sheetData></worksheet>`; }
function cell(row, column, value) { if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${columnName(column)}${row}"><v>${value}</v></c>`; return `<c r="${columnName(column)}${row}" t="inlineStr"><is><t xml:space="preserve">${xml(serial(value))}</t></is></c>`; }
function columnName(number) { let result = ''; while (number) { number -= 1; result = String.fromCharCode(65 + number % 26) + result; number = Math.floor(number / 26); } return result; }
function uniqueSources(plan) { return [...new Map(plan.days.flatMap((day) => day.units.flatMap((unit) => unit.sourceReferences)).map((ref) => [`${ref.documentId}|${ref.location || ref.sourceRef || ref.page || ''}`, ref])).values()]; }
function join(values) { return (values || []).map(serial).join(' | '); }
function serial(value) { return typeof value === 'string' ? value : value && typeof value === 'object' ? value.label || value.title || value.type || value.message || JSON.stringify(value) : String(value ?? ''); }
function xml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function entry(name, data) { return { name, data: Buffer.from(data, 'utf8') }; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }

module.exports = { HEADERS, exportCoursePlanXlsx };
