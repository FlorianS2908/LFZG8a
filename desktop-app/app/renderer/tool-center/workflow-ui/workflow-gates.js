(function initWorkflowGates(globalScope) {
  function mergeWorkflowGates(workflow, gateState = {}) {
    return (workflow?.steps || []).map((step) => {
      const state = gateState[step.id] || {};
      return {
        id: step.id,
        label: step.label,
        shortLabel: step.shortLabel || step.label,
        optional: Boolean(step.optional),
        active: state.active !== false,
        done: Boolean(state.done),
        missing: state.missing || step.lockedWhen || 'Vorherige Voraussetzungen fehlen.',
        status: state.status || (state.done ? 'done' : state.active === false ? 'locked' : 'open')
      };
    });
  }

  const api = { mergeWorkflowGates };
  globalScope.ContentFactoryWorkflowGates = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
