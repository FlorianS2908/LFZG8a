(function registerCourseNavigation(global, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  global.LFZQ8aCourseNavigation = api;
})(typeof window !== 'undefined' ? window : globalThis, function createCourseNavigation() {
  function showView({ view, panels, buttons, titleElement, translate, viewTitles }) {
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== view;
    });

    buttons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === view);
    });

    titleElement.textContent = translate(viewTitles[view] || 'coursePlatform');
  }

  return {
    showView
  };
});
