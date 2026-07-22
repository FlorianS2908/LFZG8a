(function initContentFactoryNavigation(globalScope) {
  function activatePanel(panelName, options = {}) {
    const root = options.root || document;
    root.querySelectorAll('[data-factory-tab]').forEach((button) => {
      const active = button.dataset.factoryTab === panelName;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-factory-panel]').forEach((panel) => {
      const active = panel.dataset.factoryPanel === panelName;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
    const expertNavigation = root.querySelector('[data-expert-navigation]');
    if (expertNavigation && ['duplicate', 'import', 'batches'].includes(panelName)) expertNavigation.open = true;
    if (options.focus !== false) root.querySelector('#main-content')?.focus({ preventScroll: true });
    return panelName;
  }

  const api = { activatePanel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.CourseForgeAppNavigation = api; globalScope.ContentFactoryAppNavigation = api;
})(typeof window !== 'undefined' ? window : globalThis);
