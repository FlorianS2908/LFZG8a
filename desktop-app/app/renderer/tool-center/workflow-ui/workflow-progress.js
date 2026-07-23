(function initWorkflowProgress(globalScope) {
  const terminalStatuses = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled', 'timed_out', 'not_found']);
  const labels = { source_validation: 'Quellen prüfen', document_preparation: 'Dokumente vorbereiten', document_analysis: 'Dokumentinhalte analysieren', topic_consolidation: 'Themen zusammenführen', planning_input: 'Eingabedaten vorbereiten', provider_request: 'Planungsanfrage übermitteln', provider_wait: 'Auf KI-Ergebnis warten', provider_response: 'KI-Antwort empfangen', result_parsing: 'Ergebnis parsen', plan_validation: 'Unterrichtsplan validieren', draft_persistence: 'Planungsversion speichern', project_reload: 'Kursprojekt erneut laden', review_preparation: 'Struktur-Review vorbereiten', completed: 'Abgeschlossen' };
  const status = { queued: ['○', 'In der Warteschlange'], running: ['◌', 'Wird verarbeitet'], completed: ['✓', 'Abgeschlossen'], completed_with_warnings: ['⚠', 'Abgeschlossen mit Warnungen'], failed: ['✕', 'Fehlgeschlagen'], cancelled: ['■', 'Abgebrochen'], timed_out: ['✕', 'Zeitüberschreitung'], not_found: ['✕', 'Nicht gefunden'] };
  const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const visiblePhases = {
    analysis: [
      { id: 'source_validation', label: 'Quellen prüfen', phases: ['source_validation'] },
      { id: 'document_preparation', label: 'Dokumente vorbereiten', phases: ['document_preparation'] },
      { id: 'document_analysis', label: 'Dokumentinhalte analysieren', phases: ['document_analysis'] },
      { id: 'topic_consolidation', label: 'Themen zusammenführen', phases: ['topic_consolidation'] },
      { id: 'completed', label: 'Abgeschlossen', phases: ['completed'] }
    ],
    planning: [
      { id: 'planning_input', label: 'Eingabedaten vorbereiten', phases: ['planning_input'] },
      { id: 'course_plan_generation', label: 'Unterrichtsplan erstellen', phases: ['provider_request', 'provider_wait', 'provider_response', 'result_parsing', 'plan_validation'] },
      { id: 'planning_persistence', label: 'Plan speichern und bereitstellen', phases: ['draft_persistence', 'project_reload', 'review_preparation', 'completed'] }
    ]
  };
  function phaseModel(progress) {
    const phases = visiblePhases[progress.kind === 'planning' ? 'planning' : 'analysis'];
    const currentIndex = Math.max(0, phases.findIndex((item) => item.phases.includes(progress.phase)));
    const completed = ['completed', 'completed_with_warnings'].includes(progress.status);
    const failedTerminal = terminalStatuses.has(progress.status) && !completed;
    const done = completed ? phases.length : currentIndex;
    return { phases, currentIndex, done, failedTerminal, completed };
  }
  function measurable(progress) {
    const model = phaseModel(progress);
    return { percent: clamp(Math.round(model.done / model.phases.length * 100)), done: model.done, total: model.phases.length };
  }
  function formatElapsed(progress) { const ms = Number(progress.elapsedMs) || Math.max(0, Date.now() - Date.parse(progress.startedAt || new Date().toISOString())); const seconds = Math.floor(ms / 1000); const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); return hours ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function renderSteps(progress) {
    const model = phaseModel(progress);
    return model.phases.map((item, index) => {
      const done = model.completed || index < model.currentIndex;
      const current = index === model.currentIndex && !model.completed;
      const failed = current && ['failed', 'timed_out'].includes(progress.status);
      const cancelled = current && progress.status === 'cancelled';
      const css = done ? 'done' : failed ? 'failed' : cancelled ? 'cancelled' : current ? 'running' : 'queued';
      const text = done ? 'Abgeschlossen' : failed ? status[progress.status][1] : cancelled ? 'Abgebrochen' : current ? 'Wird verarbeitet' : 'Ausstehend';
      return `<li class="step-${css}"><span aria-hidden="true">${done ? '✓' : failed ? '✕' : cancelled ? '■' : current ? '◌' : '○'}</span><span><strong>${escape(item.label)}</strong><small>${text}</small></span></li>`;
    }).join('');
  }
  function render(progress = {}) {
    const planning = progress.kind === 'planning'; const terminal = terminalStatuses.has(progress.status); const measure = measurable(progress); const state = status[progress.status] || status.running; const warningCount = Number(progress.warningCount || 0); const errorCount = Number(progress.errorCount ?? progress.failed ?? 0); const completed = ['completed', 'completed_with_warnings'].includes(progress.status);
    return `<section class="workflow-progress-card" role="dialog" aria-modal="true" aria-labelledby="workflow-progress-title" aria-describedby="workflow-progress-message">
      <header><div><strong id="workflow-progress-title">${planning ? 'Unterrichtsplanerstellung' : 'Dokumentanalyse'} – ${completed ? 'Abgeschlossen' : state[1]}</strong><p id="workflow-progress-message">${escape(progress.message || progress.step || 'Auftrag wird vorbereitet')}</p></div></header>
      ${measure ? `<label>Gesamtfortschritt <progress max="100" value="${measure.percent}">${measure.percent}%</progress><span>${measure.percent}%${measure.total ? ` · ${measure.done} von ${measure.total}` : ''}</span></label>` : '<div class="workflow-progress-indeterminate" role="progressbar" aria-label="Fortschritt wird ermittelt"><span></span></div>'}
      ${progress.currentDocument ? `<p><strong>Aktuelles Dokument:</strong> ${escape(progress.currentDocument)}</p>` : ''}
      <ol class="workflow-progress-steps">${renderSteps(progress)}</ol>
      ${(progress.errors || []).length ? `<details><summary>Fehlerdetails anzeigen</summary><ul>${progress.errors.map((item) => `<li>${escape(item.message || item)}</li>`).join('')}</ul></details>` : ''}
      ${progress.status === 'completed_with_warnings' ? `<aside class="workflow-warning-card" role="alert"><span aria-hidden="true">⚠</span><div><strong>Abgeschlossen mit Warnungen</strong><p>${warningCount} Warnung${warningCount === 1 ? '' : 'en'} · ${errorCount} Fehler</p></div></aside>` : ''}
      <div class="button-row workflow-progress-actions">${!terminal ? '<button class="secondary-button" type="button" data-document-analysis-cancel>Vorgang abbrechen</button>' : ''}${['failed','timed_out'].includes(progress.status) ? '<button class="primary-button" type="button" data-progress-retry>Erneut versuchen</button><button class="secondary-button" type="button" data-progress-back>Zurück</button>' : ''}${completed ? '<button class="primary-button" type="button" data-progress-continue>Weiter</button>' : ''}<output class="workflow-elapsed" aria-live="off">Verstrichene Zeit: ${formatElapsed(progress)}</output></div>
    </section>`;
  }
  globalScope.CourseForgeWorkflowProgress = globalScope.ContentFactoryWorkflowProgress = { render, measurable, labels, status, terminalStatuses, formatElapsed, visiblePhases };
  if (typeof module !== 'undefined') module.exports = { render, measurable, labels, status, terminalStatuses, formatElapsed, visiblePhases };
})(typeof window !== 'undefined' ? window : globalThis);
