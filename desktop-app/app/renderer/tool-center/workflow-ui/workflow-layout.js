(function initWorkflowLayout(globalScope) {
  const utils = globalScope.ContentFactoryWorkflowUtils || (typeof require !== 'undefined' ? require('./workflow-ui-utils') : {});
  const escapeHtml = utils.escapeHtml || ((value) => String(value ?? ''));
  const asList = utils.asList || ((value) => Array.isArray(value) ? value : [value].filter(Boolean));
  const statusLabel = utils.statusLabel || ((value) => value || 'offen');

  function renderWorkflowHeader(workflow, status = 'open') {
    return `
      <header class="workflow-header">
        <div>
          <p class="eyebrow">${escapeHtml(workflow.audience || 'Workflow')}</p>
          <h2>${escapeHtml(workflow.title)}</h2>
          <p>${escapeHtml(workflow.subtitle || '')}</p>
        </div>
        <span class="workflow-status-badge workflow-status-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
        <div class="workflow-status-strip">
          <span><strong>Ziel</strong>${escapeHtml(workflow.primaryGoal || '-')}</span>
          <span><strong>Ergebnis</strong>${escapeHtml(workflow.result || '-')}</span>
          <span><strong>Modus</strong>${escapeHtml(workflow.difficulty || 'standard')}</span>
        </div>
      </header>
    `;
  }

  function renderWorkflowStepper(workflow, activeStep, gates = []) {
    const gateById = new Map(gates.map((gate) => [gate.id, gate]));
    return `
      <nav class="workflow-stepper" aria-label="${escapeHtml(workflow.title)} Schritte">
        ${(workflow.steps || []).map((step) => {
          const gate = gateById.get(step.id) || { active: true, done: false, missing: step.lockedWhen || '' };
          const classes = [
            'workflow-step',
            step.id === activeStep ? 'workflow-step-active' : '',
            gate.done ? 'workflow-step-done' : '',
            gate.active ? '' : 'workflow-step-locked',
            step.optional ? 'workflow-step-optional' : ''
          ].filter(Boolean).join(' ');
          return `
            <button class="${classes}" type="button" data-plan-step="${escapeHtml(step.id)}" ${gate.active ? '' : 'disabled'} title="${escapeHtml(gate.active ? step.goal : gate.missing)}">
              <span>${escapeHtml(step.shortLabel || step.label)}</span>
              <small>${escapeHtml(gate.done ? 'erledigt' : gate.active ? (step.optional ? 'optional' : 'aktiv') : 'gesperrt')}</small>
            </button>
          `;
        }).join('')}
      </nav>
    `;
  }

  function renderWorkflowHelp(step = {}) {
    return `
      <aside class="workflow-help">
        <h3>Hilfe</h3>
        <section>
          <strong>Kurz erklaert</strong>
          <p>${escapeHtml(asList(step.help)[0] || step.goal || 'Dieser Schritt fuehrt den Workflow weiter.')}</p>
        </section>
        <section>
          <strong>Warum wichtig?</strong>
          <p>${escapeHtml(step.why || '-')}</p>
        </section>
        ${renderList('Pflichtangaben', step.requiredInputs)}
        ${renderList('Optional', step.optionalInputs)}
        ${renderList('Typische Fehler', step.typicalMistakes)}
        <section>
          <strong>Ergebnis</strong>
          <p>${escapeHtml(step.result || '-')}</p>
        </section>
      </aside>
    `;
  }

  function renderList(title, items) {
    const list = asList(items);
    if (!list.length) return '';
    return `<section><strong>${escapeHtml(title)}</strong><ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
  }

  function renderWorkflowActionBar({ canBack = false, canNext = false, canSave = false, canCheck = false, canSkip = false, nextLabel = 'Weiter', backLabel = 'Zurueck' } = {}) {
    return `
      <div class="workflow-actionbar">
        <button class="secondary-button" type="button" data-wizard-prev ${canBack ? '' : 'disabled'}>${escapeHtml(backLabel)}</button>
        ${canCheck ? '<button class="secondary-button" type="button" data-workflow-check>Pruefen</button>' : ''}
        ${canSave ? '<button class="secondary-button" type="button" data-workflow-save>Speichern</button>' : ''}
        ${canSkip ? '<button class="secondary-button" type="button" data-wizard-skip-step>Schritt ueberspringen</button>' : ''}
        <button class="primary-button" type="button" data-wizard-next ${canNext ? '' : 'disabled'}>${escapeHtml(nextLabel)}</button>
      </div>
    `;
  }

  function renderWorkflowStepShell({ workflow, step, contentHtml = '', helpHtml = '', statusHtml = '', actionsHtml = '' }) {
    return `
      <section class="workflow-shell" data-workflow="${escapeHtml(workflow.id)}" data-workflow-step="${escapeHtml(step.id)}">
        <div class="workflow-body">
          <main class="workflow-main">
            ${statusHtml}
            ${contentHtml}
          </main>
          ${helpHtml || renderWorkflowHelp(step)}
        </div>
        ${actionsHtml}
      </section>
    `;
  }

  function renderWorkflowEmptyState({ title, text, actionLabel } = {}) {
    return `<article class="workflow-result-card"><strong>${escapeHtml(title || 'Noch nichts vorhanden')}</strong><p>${escapeHtml(text || '')}</p>${actionLabel ? `<button class="secondary-button" type="button">${escapeHtml(actionLabel)}</button>` : ''}</article>`;
  }

  function renderWorkflowLockedState({ title, missingRequirements = [] } = {}) {
    return `<article class="workflow-result-card workflow-locked"><strong>${escapeHtml(title || 'Gesperrt')}</strong>${renderList('Fehlende Voraussetzungen', missingRequirements)}</article>`;
  }

  function renderWorkflowResultCard({ title, result, warnings = [], nextAction } = {}) {
    return `
      <article class="workflow-result-card">
        <strong>${escapeHtml(title || 'Ergebnis')}</strong>
        <p>${escapeHtml(result || '-')}</p>
        ${asList(warnings).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
        ${nextAction ? `<p class="workflow-next-action"><strong>Naechster sinnvoller Klick:</strong> ${escapeHtml(nextAction)}</p>` : ''}
      </article>
    `;
  }

  const api = {
    renderWorkflowHeader,
    renderWorkflowStepper,
    renderWorkflowStepShell,
    renderWorkflowHelp,
    renderWorkflowActionBar,
    renderWorkflowEmptyState,
    renderWorkflowLockedState,
    renderWorkflowResultCard
  };
  globalScope.ContentFactoryWorkflowLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
