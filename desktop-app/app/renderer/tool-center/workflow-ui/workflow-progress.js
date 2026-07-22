(function initWorkflowProgress(globalScope) {
  const terminalStatuses = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled', 'timed_out', 'not_found']);
  const labels = { source_validation: 'Quellen prüfen', document_preparation: 'Dokumente vorbereiten', document_analysis: 'Dokumentinhalte analysieren', topic_consolidation: 'Themen zusammenführen', planning_input: 'Eingabedaten vorbereiten', provider_request: 'Planungsanfrage übermitteln', provider_wait: 'Auf KI-Ergebnis warten', provider_response: 'KI-Antwort empfangen', result_parsing: 'Ergebnis parsen', plan_validation: 'Unterrichtsplan validieren', draft_persistence: 'Planungsversion speichern', project_reload: 'Kursprojekt erneut laden', review_preparation: 'Struktur-Review vorbereiten', completed: 'Abgeschlossen' };
  const status = { queued: ['○', 'In der Warteschlange'], running: ['◌', 'Wird verarbeitet'], completed: ['✓', 'Abgeschlossen'], completed_with_warnings: ['⚠', 'Abgeschlossen mit Warnungen'], failed: ['✕', 'Fehlgeschlagen'], cancelled: ['■', 'Abgebrochen'], timed_out: ['✕', 'Zeitüberschreitung'], not_found: ['✕', 'Nicht gefunden'] };
  const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  function measurable(progress) {
    if (Number.isFinite(Number(progress.overallProgress))) return { percent: terminalStatuses.has(progress.status) ? clamp(Math.round(Number(progress.overallProgress) * 100)) : Math.min(99, clamp(Math.round(Number(progress.overallProgress) * 100))), done: Number(progress.currentItem || progress.completed || 0), total: Number(progress.totalItems || progress.total || 0) };
    const total = Number(progress.total || 0); const done = Number(progress.completed || 0) + Number(progress.warningCount || 0) + Number(progress.failed || 0);
    return total > 0 ? { percent: clamp(Math.round(done / total * 100)), done, total } : null;
  }
  function formatElapsed(progress) { const ms = Number(progress.elapsedMs) || Math.max(0, Date.now() - Date.parse(progress.startedAt || new Date().toISOString())); const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function renderSteps(progress, terminal) {
    const history = [...new Map((progress.history || []).map((item) => [item.phase, item])).values()];
    if (!history.length) history.push({ phase: progress.phase, step: progress.message || progress.step });
    return history.map((item) => {
      const current = item.phase === progress.phase; const running = !terminal && current;
      const failed = terminal && current && ['failed', 'timed_out'].includes(progress.status); const cancelled = terminal && current && progress.status === 'cancelled';
      const css = running ? 'running' : failed ? 'failed' : cancelled ? 'cancelled' : 'done';
      const text = running ? 'Wird verarbeitet' : failed ? status[progress.status][1] : cancelled ? 'Abgebrochen' : 'Abgeschlossen';
      return `<li class="step-${css}"><span aria-hidden="true">${running ? '◌' : failed ? '✕' : cancelled ? '■' : '✓'}</span><span><strong>${escape(labels[item.phase] || item.phaseLabel || item.step || 'Arbeitsschritt')}</strong><small>${text}</small></span></li>`;
    }).join('');
  }
  function render(progress = {}) {
    const planning = progress.kind === 'planning'; const terminal = terminalStatuses.has(progress.status); const measure = measurable(progress); const state = status[progress.status] || status.running;
    return `<section class="workflow-progress-card" role="dialog" aria-modal="true" aria-labelledby="workflow-progress-title" aria-describedby="workflow-progress-message">
      <header><span class="workflow-progress-icon" aria-hidden="true">${state[0]}</span><div><strong id="workflow-progress-title">${planning ? 'Unterrichtsplanerstellung' : 'Dokumentanalyse'} – ${state[1]}</strong><p id="workflow-progress-message">${escape(progress.message || progress.step || 'Auftrag wird vorbereitet')}</p></div></header>
      ${measure ? `<label>Gesamtfortschritt <progress max="100" value="${measure.percent}">${measure.percent}%</progress><span>${measure.percent}%${measure.total ? ` · ${measure.done} von ${measure.total}` : ''}</span></label>` : '<div class="workflow-progress-indeterminate" role="progressbar" aria-label="Fortschritt wird ermittelt"><span></span></div>'}
      ${!terminal ? '<div class="workflow-progress-indeterminate" aria-hidden="true"><span></span></div>' : ''}
      <p><strong>Aktueller Arbeitsschritt:</strong> ${escape(progress.phaseLabel || labels[progress.phase] || progress.phase || '-')}</p>
      ${progress.currentDocument ? `<p><strong>Aktuelles Dokument:</strong> ${escape(progress.currentDocument)}</p>` : ''}
      ${progress.totalSegments || progress.segmentTotal ? `<p>Segment ${escape(progress.segmentCompleted || progress.currentSegment || 0)} von ${escape(progress.totalSegments || progress.segmentTotal)}</p>` : ''}
      <p><strong>Verstrichene Zeit:</strong> ${formatElapsed(progress)} Minuten · <strong>${progress.stale ? 'Status wird erneut geprüft' : terminal ? state[1] : 'Verarbeitung aktiv'}</strong></p>
      <p>Warnungen: ${Number(progress.warningCount || 0)} · Fehler: ${Number(progress.errorCount ?? progress.failed ?? 0)}</p>
      <ol class="workflow-progress-steps">${renderSteps(progress, terminal)}</ol>
      ${(progress.errors || []).length ? `<details><summary>Fehlerdetails anzeigen</summary><ul>${progress.errors.map((item) => `<li>${escape(item.message || item)}</li>`).join('')}</ul></details>` : ''}
      <div class="button-row">${!terminal ? '<button class="secondary-button" type="button" data-document-analysis-cancel>Vorgang abbrechen</button>' : ''}${['failed','timed_out'].includes(progress.status) ? '<button class="primary-button" type="button" data-progress-retry>Erneut versuchen</button><button class="secondary-button" type="button" data-progress-back>Zurück</button>' : ''}${['completed','completed_with_warnings'].includes(progress.status) ? '<button class="primary-button" type="button" data-progress-continue>Weiter</button>' : ''}</div>
    </section>`;
  }
  globalScope.CourseForgeWorkflowProgress = globalScope.ContentFactoryWorkflowProgress = { render, measurable, labels, status, terminalStatuses, formatElapsed };
  if (typeof module !== 'undefined') module.exports = { render, measurable, labels, status, terminalStatuses, formatElapsed };
})(typeof window !== 'undefined' ? window : globalThis);
