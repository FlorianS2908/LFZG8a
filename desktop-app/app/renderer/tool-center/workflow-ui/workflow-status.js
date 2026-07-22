(function initWorkflowStatus(globalScope) {
  function getWorkflowStatus(gates = []) {
    if (gates.some((gate) => gate.status === 'error')) return 'error';
    if (gates.some((gate) => gate.status === 'warning')) return 'warning';
    if (gates.length && gates.every((gate) => gate.done || gate.optional)) return 'done';
    if (gates.some((gate) => gate.done)) return 'active';
    return 'open';
  }

  function buildChecklist(items = []) {
    return items.map((item) => ({ label: item.label || item, done: Boolean(item.done), optional: Boolean(item.optional), warning: item.warning || '' }));
  }

  const api = { getWorkflowStatus, buildChecklist };
  globalScope.CourseForgeWorkflowStatus = api; globalScope.ContentFactoryWorkflowStatus = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
