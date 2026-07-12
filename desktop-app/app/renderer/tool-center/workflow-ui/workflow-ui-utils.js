(function initWorkflowUiUtils(globalScope) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function asList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function statusLabel(status) {
    const labels = {
      open: 'offen',
      active: 'in Bearbeitung',
      ready: 'pruefbereit',
      done: 'abgeschlossen',
      warning: 'Warnung',
      error: 'Fehler',
      locked: 'gesperrt'
    };
    return labels[status] || labels.open;
  }

  const api = { escapeHtml, asList, statusLabel };
  globalScope.ContentFactoryWorkflowUtils = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
