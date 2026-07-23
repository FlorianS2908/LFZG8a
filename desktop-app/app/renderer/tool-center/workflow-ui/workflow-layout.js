(function initWorkflowLayout(globalScope) {
  const utils = globalScope.CourseForgeWorkflowUtils || globalScope.ContentFactoryWorkflowUtils || (typeof require !== 'undefined' ? require('./workflow-ui-utils') : {});
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
    const phases = [
      { label: 'Grundlagen', steps: ['course', 'durationAudience', 'didactics', 'containerProfile'] },
      { label: 'Unterrichtsplan', steps: ['anchor', 'analysis'] },
      { label: 'Inhalte und Materialien', steps: ['materials', 'aiMode'] },
      { label: 'Kursstruktur', steps: ['curriculumReview'] },
      { label: 'Generierung', steps: ['generation'] },
      { label: 'Prüfen und Exportieren', steps: ['preflight', 'containerDraft'] }
    ];
    const activePhaseIndex = Math.max(0, phases.findIndex((phase) => phase.steps.includes(activeStep)));
    return `
      <p class="workflow-phase-progress" role="status">Phase ${activePhaseIndex + 1} von 6: ${escapeHtml(phases[activePhaseIndex].label)}</p>
      <nav class="workflow-stepper" aria-label="Phasen der Kurserstellung">
        ${phases.map((phase, phaseIndex) => {
          const phaseGates = phase.steps.map((id) => gateById.get(id)).filter(Boolean);
          const phaseDone = phaseGates.length > 0 && phaseGates.every((gate) => gate.done);
          const phaseActive = phase.steps.includes(activeStep);
          const selectableGate = phaseGates.find((gate) => gate.active) || phaseGates[0] || { id: phase.steps[0], active: false, missing: 'Vorherige Voraussetzungen fehlen.' };
          const missing = phaseGates.find((gate) => !gate.active)?.missing || selectableGate.missing || '';
          const classes = [
            'workflow-step',
            phaseActive ? 'workflow-step-active' : '',
            phaseDone ? 'workflow-step-done' : '',
            selectableGate.active ? '' : 'workflow-step-locked'
          ].filter(Boolean).join(' ');
          return `
            <button class="${classes}" type="button" data-plan-step="${escapeHtml(phaseActive ? activeStep : selectableGate.id)}" ${selectableGate.active ? '' : 'disabled'} ${phaseActive ? 'aria-current="step"' : ''} aria-label="Phase ${phaseIndex + 1}: ${escapeHtml(phase.label)}${phaseDone ? ', abgeschlossen' : phaseActive ? ', aktuell' : selectableGate.active ? '' : `, gesperrt: ${escapeHtml(missing)}`}">
              <span class="workflow-step-label">${phaseIndex + 1}. ${escapeHtml(phase.label)}</span>
              <span class="workflow-step-state">${escapeHtml(phaseDone ? '✓ Vollständig' : phaseActive ? 'Aktion erforderlich' : selectableGate.active ? 'Optional' : 'Noch nicht verfügbar')}</span>
            </button>
          `;
        }).join('')}
      </nav>
    `;
  }

  function renderWorkflowHelp(step = {}) {
    const hasHelp = Boolean(step.goal || step.why || step.result || asList(step.help).length || asList(step.requiredInputs).length || asList(step.optionalInputs).length || asList(step.typicalMistakes).length);
    if (!hasHelp) return '';
    return `
      <aside class="workflow-help">
        <h3>Hilfe</h3>
        <section>
          <strong>Kurz erklärt</strong>
          <p>${escapeHtml(asList(step.help)[0] || step.goal || 'Dieser Schritt führt den Workflow weiter.')}</p>
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

  function renderWorkflowActionBar({ canBack = false, canNext = false, canSave = false, canCheck = false, canSkip = false, nextLabel = 'Weiter', backLabel = 'Zurück' } = {}) {
    return `
      <div class="workflow-actionbar">
        <button class="secondary-button" type="button" data-wizard-prev ${canBack ? '' : 'disabled'}>${escapeHtml(backLabel)}</button>
        ${canCheck ? '<button class="secondary-button" type="button" data-workflow-check>Prüfen</button>' : ''}
        ${canSave ? '<button class="secondary-button" type="button" data-workflow-save>Speichern</button>' : ''}
        ${canSkip ? '<button class="secondary-button" type="button" data-wizard-skip-step>Optionalen Schritt überspringen</button>' : ''}
        <button class="primary-button" type="button" data-wizard-next ${canNext ? '' : 'disabled'}>${escapeHtml(nextLabel)}</button>
      </div>
    `;
  }

  function renderWorkflowStepShell({ workflow, step, contentHtml = '', helpHtml = '', statusHtml = '', actionsHtml = '' }) {
    return `
      <section class="workflow-shell" data-workflow="${escapeHtml(workflow.id)}" data-workflow-step="${escapeHtml(step.id)}">
        <button class="secondary-button workflow-help-toggle" type="button" data-workflow-help-toggle aria-expanded="true">Hilfe ein-/ausblenden</button>
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
        ${nextAction ? `<p class="workflow-next-action"><strong>Nächster sinnvoller Klick:</strong> ${escapeHtml(nextAction)}</p>` : ''}
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
  globalScope.CourseForgeWorkflowLayout = api; globalScope.ContentFactoryWorkflowLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
