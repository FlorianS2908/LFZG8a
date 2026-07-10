import type { CoursePlanDay } from './types.ts';

export type PlanDayDraft = {
  teacherWebHtml: string;
  participantWebHtml: string;
  teacherTasksHtml: string;
  participantTasksHtml: string;
  solutionsHtml: string;
  quizJson: string;
  reviewJson: string;
};

export function createDayDraftFromPlan(day: CoursePlanDay, courseName: string): PlanDayDraft {
  const blocks = day.ueBlocks || [];
  const learnerTasks = blocks.map((block) => block.learnerTask).filter(Boolean);
  const teacherHints = blocks.map((block) => block.teacherTask || block.evaluation).filter(Boolean);
  const resources = blocks.map((block) => block.resources).filter(Boolean);
  const warnings = [];
  if (!learnerTasks.length) warnings.push('Keine Lernaufgabe im Unterrichtsplan erkannt.');
  if (!resources.length) warnings.push('Keine Ressourcen im Unterrichtsplan erkannt.');

  return {
    teacherWebHtml: htmlPage(`${courseName} - ${day.title}`, `
      <p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p>
      <h1>${escapeHtml(day.title)}</h1>
      <h2>Tagesziel</h2>
      ${list(day.learningGoals)}
      <h2>Themen</h2>
      <p>${escapeHtml(day.mainTopic)}</p>
      ${list(day.subTopics)}
      <h2>UE-Bloecke</h2>
      ${blockTable(blocks, true)}
      <h2>Dozentenhinweise</h2>
      ${list(teacherHints)}
      <h2>Ressourcen</h2>
      ${list(resources)}
      ${warnings.length ? `<h2>Offene Punkte</h2>${list(warnings)}` : ''}
    `),
    participantWebHtml: htmlPage(`${courseName} - ${day.title}`, `
      <p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p>
      <h1>${escapeHtml(day.title)}</h1>
      <h2>Tagesziel</h2>
      ${list(day.learningGoals)}
      <h2>Themen</h2>
      <p>${escapeHtml(day.mainTopic)}</p>
      ${list(day.subTopics)}
      <h2>Lernaufgaben</h2>
      ${list(learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen'])}
      <h2>Materialien/Ressourcen</h2>
      ${list(resources.length ? resources : ['Material noch ergaenzen'])}
    `),
    teacherTasksHtml: htmlPage(`${courseName} - Aufgaben ${day.title}`, `
      <p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p>
      <h1>Aufgaben</h1>
      ${list(learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen'])}
    `),
    participantTasksHtml: htmlPage(`${courseName} - Aufgaben ${day.title}`, `
      <p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p>
      <h1>Aufgaben</h1>
      ${list(learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen'])}
    `),
    solutionsHtml: htmlPage(`${courseName} - Loesungen ${day.title}`, `
      <p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p>
      <h1>Loesungshinweise</h1>
      ${list(teacherHints.length ? teacherHints : ['Loesung noch ergaenzen'])}
    `),
    quizJson: JSON.stringify({
      dayNumber: day.dayNumber,
      status: 'draft',
      generatedFrom: 'course-plan',
      questions: [],
      note: 'Quiz noch zu ergaenzen. Es wurden keine fachlichen Fragen erfunden.'
    }, null, 2),
    reviewJson: JSON.stringify({
      dayNumber: day.dayNumber,
      status: 'draft',
      generatedFrom: 'course-plan',
      warnings,
      needsHumanReview: true
    }, null, 2)
  };
}

function htmlPage(title: string, body: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

function list(items: Array<string | undefined>): string {
  const clean = items.map((item) => String(item || '').trim()).filter(Boolean);
  return `<ul>${(clean.length ? clean : ['Noch zu ergaenzen']).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function blockTable(blocks: NonNullable<CoursePlanDay['ueBlocks']>, teacher: boolean): string {
  if (!blocks.length) return '<p>Keine UE-Bloecke erkannt.</p>';
  return `<table><thead><tr><th>Zeit</th><th>Thema</th><th>${teacher ? 'Lehraufgabe' : 'Lernaufgabe'}</th><th>Ressourcen</th></tr></thead><tbody>${blocks.map((block) => `<tr><td>${escapeHtml(block.time || '')}</td><td>${escapeHtml(block.topic || '')}</td><td>${escapeHtml((teacher ? block.teacherTask : block.learnerTask) || '')}</td><td>${escapeHtml(block.resources || '')}</td></tr>`).join('')}</tbody></table>`;
}

function escapeHtml(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
