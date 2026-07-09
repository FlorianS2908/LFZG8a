const desktop = window.lfzq8aDesktop;

function $(selector) {
  return document.querySelector(selector);
}

function getToolId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('toolId') || '';
}

function renderState(state) {
  $('[data-tool-title]').textContent = state.guide.title;
  $('[data-tool-summary]').textContent = state.guide.summary;
  $('[data-tool-what]').textContent = state.guide.whatItDoes;
  $('[data-tool-when]').textContent = state.guide.whenToUse;
  $('[data-tool-steps]').innerHTML = state.guide.steps.map((step) => `<li>${step}</li>`).join('');
  $('[data-tool-config]').value = JSON.stringify(state.config, null, 2);
}

async function saveConfig(toolId) {
  $('[data-config-status]').textContent = 'Konfiguration wird gespeichert ...';
  try {
    const config = JSON.parse($('[data-tool-config]').value || '{}');
    await desktop.adminTools.saveConfig(toolId, config);
    $('[data-config-status]').textContent = 'Konfiguration gespeichert.';
  } catch (error) {
    $('[data-config-status]').textContent = error.message;
  }
}

async function runPreview(toolId) {
  $('[data-tool-result]').textContent = 'Vorschau wird erzeugt ...';
  try {
    const result = await desktop.adminTools.runPreview(toolId);
    $('[data-tool-result]').textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    $('[data-tool-result]').textContent = error.message;
  }
}

async function init() {
  if (!desktop?.adminTools) {
    document.body.innerHTML = '<main class="tool-card"><h1>Admin-Tool API nicht verfuegbar</h1></main>';
    return;
  }
  const toolId = getToolId();
  const state = await desktop.adminTools.getState(toolId);
  renderState(state);
  $('[data-open-landing]').addEventListener('click', () => desktop.openLanding());
  $('[data-save-config]').addEventListener('click', () => saveConfig(toolId));
  $('[data-run-preview]').addEventListener('click', () => runPreview(toolId));
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${error.message}</p>`);
});
