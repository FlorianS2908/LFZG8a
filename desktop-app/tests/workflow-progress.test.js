const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const progress = require('../app/renderer/tool-center/workflow-ui/workflow-progress');

test('Analyse und Planung verwenden dieselbe konfigurierbare Fortschrittskomponente', () => { const analysis = progress.render({ status: 'running', kind: 'analysis', message: 'Inhalte werden analysiert', currentDocument: 'Sehr langer Dokumentname.pdf', phase: 'document_analysis' }); const planning = progress.render({ status: 'running', kind: 'planning', message: 'Themen werden verteilt', phase: 'planning_input' }); assert.match(analysis, /Dokumentanalyse.*Wird verarbeitet/); assert.match(analysis, /40% · 2 von 5/); assert.match(analysis, /Sehr langer Dokumentname/); assert.match(planning, /Unterrichtsplanerstellung.*Wird verarbeitet/); assert.match(planning, /0% · 0 von 3/); });
test('Warteschlange, Fehler, Abbruch und deutsche Statuswerte sind verständlich', () => { assert.match(progress.render({ status: 'queued' }), /In der Warteschlange/); assert.match(progress.render({ status: 'failed', errors: ['Sichere Fehlermeldung'] }), /Erneut versuchen/); assert.match(progress.render({ status: 'cancelled' }), /Abgebrochen/); assert.match(progress.render({ status: 'timed_out' }), /Zeitüberschreitung/); });
test('Terminale Statuswerte lassen keine blaue laufende Kachel zurück', () => { for (const state of ['completed', 'completed_with_warnings', 'failed', 'cancelled']) { const html = progress.render({ status: state, phase: 'plan_validation', history: [{ phase: 'planning_input' }, { phase: 'plan_validation' }], overallProgress: state.startsWith('completed') ? 1 : .8 }); assert.doesNotMatch(html, /step-running/); } assert.match(progress.render({ status: 'running', phase: 'plan_validation', history: [{ phase: 'plan_validation' }] }), /step-running/); });
test('Fortschrittsdialog zeigt genau einen Balken, keine redundanten Statusblöcke und eine sekundengenaue Aktionszeile', () => { const html = progress.render({ status: 'running', kind: 'analysis', startedAt: '2026-01-01T00:00:00.000Z', elapsedMs: 2000, overallProgress: .42, phase: 'document_analysis', history: [{ phase: 'document_analysis' }] }); assert.equal((html.match(/<progress\b/g) || []).length, 1); assert.doesNotMatch(html, /Aktueller Arbeitsschritt|Verarbeitung aktiv/); assert.match(html, /workflow-progress-actions[\s\S]*Vorgang abbrechen[\s\S]*Verstrichene Zeit: 00:02/); assert.equal(progress.formatElapsed({ elapsedMs: 3600000 }), '01:00:00'); });
test('Abschluss mit Warnungen wird genau einmal als gelbe Warnkarte dargestellt', () => { const html = progress.render({ status: 'completed_with_warnings', kind: 'analysis', overallProgress: 1, warningCount: 2, failed: 0, phase: 'completed', history: [{ phase: 'completed' }] }); assert.equal((html.match(/Abgeschlossen mit Warnungen/g) || []).length, 1); assert.match(html, /workflow-warning-card[\s\S]*2 Warnungen · 0 Fehler/); assert.match(html, /Dokumentanalyse – Abgeschlossen/); });
test('Renderer bindet nur die gemeinsame Fortschrittskomponente ein', () => { const root = path.join(__dirname, '..', 'app', 'renderer', 'tool-center'); const ui = fs.readFileSync(path.join(root, 'factory.js'), 'utf8'); const html = fs.readFileSync(path.join(root, 'factory.html'), 'utf8'); assert.match(ui, /workflowProgress\.render\(wizard\.analysisProgress\)/); assert.doesNotMatch(ui, /class="analysis-progress"/); assert.match(html, /workflow-ui\/workflow-progress\.js/); });
test('Sichtbare Phasen, Zähler und Balken bleiben synchron', () => {
  const analysis = progress.render({ status: 'running', kind: 'analysis', phase: 'topic_consolidation', totalSegments: 1, segmentCompleted: 0 });
  assert.match(analysis, /60% · 3 von 5/);
  assert.equal((analysis.match(/step-done/g) || []).length, 3);
  assert.doesNotMatch(analysis, /Segment 0 von 1|workflow-progress-icon/);
  const planning = progress.render({ status: 'running', kind: 'planning', phase: 'draft_persistence' });
  assert.match(planning, /67% · 2 von 3/);
  assert.equal((planning.match(/step-done/g) || []).length, 2);
  assert.doesNotMatch(planning, /Auf KI-Ergebnis warten|KI-Antwort empfangen/);
  const complete = progress.render({ status: 'completed_with_warnings', kind: 'planning', phase: 'completed', warningCount: 1 });
  assert.match(complete, /100% · 3 von 3/);
  assert.equal((complete.match(/step-done/g) || []).length, 3);
});
