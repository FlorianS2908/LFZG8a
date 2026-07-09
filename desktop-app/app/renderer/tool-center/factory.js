const desktop = window.lfzq8aDesktop;

const state = {
  containers: [],
  importBatches: [],
  targetAreas: [],
  targetAreaLabels: {},
  selectedBatchId: ''
};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showPanel(panelName) {
  $all('[data-factory-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.factoryTab === panelName));
  $all('[data-factory-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.factoryPanel === panelName));
}

function renderValidation(target, validation) {
  if (!validation) {
    target.innerHTML = '';
    return;
  }
  target.innerHTML = `
    <strong>${validation.isValid ? 'Validierung bestanden' : 'Validierung mit Fehlern'}</strong>
    ${(validation.errors || []).map((item) => `<p class="status-line status-error">${escapeHtml(item)}</p>`).join('')}
    ${(validation.warnings || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}
    ${(validation.suggestions || []).map((item) => `<p class="status-line">${escapeHtml(item)}</p>`).join('')}
  `;
}

function renderContainers() {
  $('[data-container-list]').innerHTML = state.containers.map((container) => {
    const manifest = container.manifest;
    const counts = ['routes', 'materials', 'assets', 'tasks', 'solutions', 'quizzes']
      .map((key) => `${key}: ${(container[key] || []).length}`)
      .join(' | ');
    const generated = container.generated ? '' : 'Original / System';
    return `
      <article class="factory-card">
        <div class="factory-card-header">
          <strong>${escapeHtml(manifest.name)}</strong>
          <span class="status-badge status-${escapeHtml(manifest.status)}">${escapeHtml(manifest.status)}</span>
        </div>
        <p>${escapeHtml(manifest.description)}</p>
        <dl class="factory-meta">
          <div><dt>ID</dt><dd>${escapeHtml(manifest.id)}</dd></div>
          <div><dt>Kategorie</dt><dd>${escapeHtml(manifest.category)}</dd></div>
          <div><dt>Version</dt><dd>${escapeHtml(manifest.version)}</dd></div>
          <div><dt>Typ</dt><dd>${escapeHtml(manifest.containerType)}</dd></div>
          <div><dt>Landingpage</dt><dd>${manifest.visibleInLauncher ? 'ja' : 'nein'}</dd></div>
          <div><dt>Quelle</dt><dd>${escapeHtml(manifest.sourceContainerId || generated || '-')}</dd></div>
        </dl>
        <small>${escapeHtml((manifest.tags || []).join(', '))}</small>
        <small>${escapeHtml(counts)}</small>
        <div class="button-row">
          ${container.generated && manifest.status === 'draft' ? `<button class="primary-button" type="button" data-publish="${escapeHtml(manifest.id)}">Veroeffentlichen</button>` : ''}
          ${container.generated ? `<button class="secondary-button" type="button" data-disable="${escapeHtml(manifest.id)}">Deaktivieren</button><button class="secondary-button" type="button" data-archive="${escapeHtml(manifest.id)}">Archivieren</button>` : ''}
        </div>
      </article>
    `;
  }).join('');

  $('[data-duplicate-source]').innerHTML = state.containers.map((container) => (
    `<option value="${escapeHtml(container.manifest.id)}">${escapeHtml(container.manifest.name)} (${escapeHtml(container.manifest.id)})</option>`
  )).join('');

  $all('[data-publish]').forEach((button) => button.addEventListener('click', () => publishContainer(button.dataset.publish)));
  $all('[data-disable]').forEach((button) => button.addEventListener('click', () => updateContainerStatus(button.dataset.disable, 'disable')));
  $all('[data-archive]').forEach((button) => button.addEventListener('click', () => updateContainerStatus(button.dataset.archive, 'archive')));
}

function renderBatches() {
  $('[data-batch-list]').innerHTML = state.importBatches.length
    ? state.importBatches.map((batch) => `
      <article class="factory-card">
        <div class="factory-card-header">
          <strong>${escapeHtml(batch.name)}</strong>
          <span class="status-badge status-${escapeHtml(batch.status)}">${escapeHtml(batch.status)}</span>
        </div>
        <p>${escapeHtml(batch.files.length)} Datei(en), erstellt ${escapeHtml(new Date(batch.createdAt).toLocaleString('de-DE'))}</p>
        <button class="secondary-button" type="button" data-open-batch="${escapeHtml(batch.id)}">Zuordnung bearbeiten</button>
      </article>
    `).join('')
    : '<article class="empty-state"><strong>Noch keine Imports</strong><span>Importiere Rohdaten, um hier Batches zu sehen.</span></article>';

  $all('[data-open-batch]').forEach((button) => button.addEventListener('click', () => openBatch(button.dataset.openBatch)));
}

function renderMapping(batch) {
  $('[data-batch-detail]').hidden = false;
  $('[data-batch-title]').textContent = batch.name;
  $('[data-batch-container-name]').value = batch.name.replace(/^Import\s*/i, '').trim() || 'Neuer Unterrichtscontainer';
  $('[data-batch-container-description]').value = 'Aus importierten Rohdaten erzeugter Unterrichtscontainer';
  $('[data-mapping-list]').innerHTML = batch.files.map((file) => `
    <article class="mapping-item" data-file-id="${escapeHtml(file.id)}">
      <strong>${escapeHtml(file.originalFilename)}</strong>
      <small>${escapeHtml(file.extension)} | ${escapeHtml(file.fileKind)} | ${escapeHtml(file.mappingSource === 'manual' ? 'manuell festgelegt' : 'automatisch vorgeschlagen')}</small>
      <div class="factory-form-grid">
        <label>Zielbereich<select data-map-target>${state.targetAreas.map((area) => `<option value="${escapeHtml(area)}" ${file.selectedTarget === area ? 'selected' : ''}>${escapeHtml(state.targetAreaLabels[area] || area)}</option>`).join('')}</select></label>
        <label>Tag<input data-map-day type="number" min="1" max="99" value="${escapeHtml(file.dayNumber ?? '')}"></label>
        <label>Titel<input data-map-title value="${escapeHtml(file.title || '')}"></label>
        <label>Schwierigkeit<select data-map-difficulty><option value="">-</option><option value="leicht" ${file.difficulty === 'leicht' ? 'selected' : ''}>leicht</option><option value="normal" ${file.difficulty === 'normal' ? 'selected' : ''}>normal</option><option value="schwer" ${file.difficulty === 'schwer' ? 'selected' : ''}>schwer</option></select></label>
      </div>
      <label>Notizen<input data-map-notes value="${escapeHtml(file.notes || '')}"></label>
      <button class="secondary-button" type="button" data-save-mapping>Mapping speichern</button>
      ${(file.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
      ${(file.errors || []).map((error) => `<p class="status-line status-error">${escapeHtml(error)}</p>`).join('')}
    </article>
  `).join('');
  renderValidation($('[data-batch-validation]'), batch.validation);
  $all('[data-save-mapping]').forEach((button) => button.addEventListener('click', () => saveMapping(button.closest('[data-file-id]'))));
}

async function loadState() {
  const data = await desktop.factory.getState();
  state.containers = data.containers || [];
  state.importBatches = data.importBatches || [];
  state.targetAreas = data.targetAreas || [];
  state.targetAreaLabels = data.targetAreaLabels || {};
  renderContainers();
  renderBatches();
  if (state.selectedBatchId) {
    const batch = state.importBatches.find((item) => item.id === state.selectedBatchId);
    if (batch) renderMapping(batch);
  }
}

async function duplicateContainer() {
  const status = $('[data-duplicate-status]');
  status.textContent = 'Entwurf wird erzeugt ...';
  try {
    const saved = await desktop.factory.duplicateContainer({
      sourceContainerId: $('[data-duplicate-source]').value,
      newName: $('[data-duplicate-name]').value,
      newDescription: $('[data-duplicate-description]').value,
      newId: $('[data-duplicate-id]').value,
      copyMode: $('[data-duplicate-copy-mode]').value,
      tags: $('[data-duplicate-tags]').value.split(',').map((item) => item.trim()).filter(Boolean),
      includeRoutes: $('[data-include-routes]').checked,
      includeMaterials: $('[data-include-materials]').checked,
      includeAssets: $('[data-include-assets]').checked,
      includeTasks: $('[data-include-tasks]').checked,
      includeSolutions: $('[data-include-solutions]').checked,
      includeQuizzes: $('[data-include-quizzes]').checked,
      visibleInLauncher: $('[data-duplicate-visible]').checked
    });
    status.textContent = `Draft erzeugt: ${saved.manifest.id}`;
    await loadState();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function importRawFiles() {
  const status = $('[data-import-status]');
  const files = Array.from($('[data-import-files]').files || []).map((file) => ({
    name: file.name,
    path: file.path || '',
    size: file.size,
    type: file.type
  }));
  status.textContent = 'Dateien werden importiert ...';
  try {
    const batch = await desktop.factory.importFiles({
      name: $('[data-import-name]').value,
      files
    });
    status.textContent = `Import-Batch erstellt: ${batch.files.length} Datei(en).`;
    state.selectedBatchId = batch.id;
    await loadState();
    showPanel('batches');
  } catch (error) {
    status.textContent = error.message;
  }
}

function openBatch(batchId) {
  state.selectedBatchId = batchId;
  const batch = state.importBatches.find((item) => item.id === batchId);
  if (batch) renderMapping(batch);
}

async function saveMapping(item) {
  const fileId = item.dataset.fileId;
  await desktop.factory.updateMapping(state.selectedBatchId, fileId, {
    selectedTarget: item.querySelector('[data-map-target]').value,
    dayNumber: item.querySelector('[data-map-day]').value,
    title: item.querySelector('[data-map-title]').value,
    difficulty: item.querySelector('[data-map-difficulty]').value,
    notes: item.querySelector('[data-map-notes]').value,
    mappingLocked: true
  });
  await loadState();
}

async function validateBatch() {
  const batch = await desktop.factory.validateBatch(state.selectedBatchId);
  renderMapping(batch);
  await loadState();
}

async function createContainerFromBatch() {
  const options = {
    name: $('[data-batch-container-name]').value,
    id: $('[data-batch-container-id]').value,
    description: $('[data-batch-container-description]').value,
    category: 'Unterricht',
    tags: $('[data-batch-container-tags]').value.split(',').map((item) => item.trim()).filter(Boolean),
    visibleInLauncher: false
  };
  try {
    await desktop.factory.createContainerFromBatch(state.selectedBatchId, options);
    await loadState();
    showPanel('overview');
  } catch (error) {
    $('[data-batch-validation]').innerHTML = `<p class="status-line status-error">${escapeHtml(error.message)}</p>`;
  }
}

async function publishContainer(containerId) {
  const firstResult = await desktop.factory.publishContainer(containerId, {});
  if (firstResult.requiresConfirmation) {
    const confirmed = window.confirm(`Warnungen vorhanden:\n${firstResult.validation.warnings.join('\n')}\n\nTrotzdem veroeffentlichen?`);
    if (!confirmed) return;
    await desktop.factory.publishContainer(containerId, { confirmWarnings: true });
  }
  await loadState();
}

async function updateContainerStatus(containerId, action) {
  if (action === 'disable') {
    await desktop.factory.disableContainer(containerId);
  } else {
    await desktop.factory.archiveContainer(containerId);
  }
  await loadState();
}

async function init() {
  if (!desktop?.factory) {
    document.body.innerHTML = '<main class="tool-card"><h1>Factory API nicht verfuegbar</h1></main>';
    return;
  }
  $all('[data-factory-tab]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.factoryTab)));
  $all('[data-open-factory-section]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.openFactorySection)));
  $('[data-open-landing]').addEventListener('click', () => desktop.openLanding());
  $('[data-refresh]').addEventListener('click', loadState);
  $('[data-run-duplicate]').addEventListener('click', duplicateContainer);
  $('[data-run-import]').addEventListener('click', importRawFiles);
  $('[data-validate-batch]').addEventListener('click', validateBatch);
  $('[data-create-from-batch]').addEventListener('click', createContainerFromBatch);
  await loadState();
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${escapeHtml(error.message)}</p>`);
});
