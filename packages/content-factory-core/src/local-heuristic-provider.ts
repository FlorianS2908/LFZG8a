import type { DayMapping, DayPreview } from './types.ts';

export function createDayPreview(mapping: DayMapping, correctionText = ''): DayPreview {
  const fileList = mapping.files.map((file) => `<li>${escapeHtml(file.fileName)} (${escapeHtml(file.contentCategory)})</li>`).join('');
  const warningList = mapping.unclearFiles.map((file) => `Bitte pruefen: ${file.fileName}`);
  return {
    dayNumber: mapping.dayNumber,
    title: mapping.planDay.title,
    warnings: [...mapping.conflicts, ...warningList],
    correctionText,
    html: `<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><title>${escapeHtml(mapping.planDay.title)}</title></head>
<body>
  <h1>${escapeHtml(mapping.planDay.title)}</h1>
  <h2>${escapeHtml(mapping.planDay.mainTopic)}</h2>
  <p><strong>Automatisch ergaenzt:</strong> nicht direkt im Ausgangsmaterial gefunden.</p>
  <h3>Unterthemen</h3>
  <ul>${mapping.planDay.subTopics.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  <h3>Lernziele</h3>
  <ul>${mapping.planDay.learningGoals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  <h3>Zugeordnete Quellen</h3>
  <ul>${fileList || '<li>Keine Quellen zugeordnet.</li>'}</ul>
  ${correctionText ? `<h3>Korrektur</h3><p>${escapeHtml(correctionText)}</p>` : ''}
</body>
</html>`
  };
}

function escapeHtml(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
