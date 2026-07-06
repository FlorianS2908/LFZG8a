const assert = require('node:assert/strict');
const courseNavigation = require('../app/renderer/course-navigation');

function createClassList() {
  const classes = new Set();
  return {
    contains: (className) => classes.has(className),
    toggle(className, enabled) {
      if (enabled) {
        classes.add(className);
      } else {
        classes.delete(className);
      }
    }
  };
}

test('course navigation switches visible panel and active button by selected view', () => {
  const panels = ['dashboard', 'days', 'projects'].map((view) => ({
    dataset: { panel: view },
    hidden: false
  }));
  const buttons = ['dashboard', 'days', 'projects'].map((view) => ({
    dataset: { view },
    classList: createClassList()
  }));
  const titleElement = { textContent: '' };
  const viewTitles = {
    dashboard: 'dashboardTitle',
    days: 'daysTitle',
    projects: 'projectsTitle'
  };
  const labels = {
    dashboardTitle: 'Uebersicht',
    daysTitle: 'Kurstage',
    projectsTitle: 'Projekte'
  };

  courseNavigation.showView({
    view: 'projects',
    panels,
    buttons,
    titleElement,
    translate: (key) => labels[key],
    viewTitles
  });

  assert.deepEqual(panels.map((panel) => [panel.dataset.panel, panel.hidden]), [
    ['dashboard', true],
    ['days', true],
    ['projects', false]
  ]);
  assert.deepEqual(buttons.map((button) => [button.dataset.view, button.classList.contains('is-active')]), [
    ['dashboard', false],
    ['days', false],
    ['projects', true]
  ]);
  assert.equal(titleElement.textContent, 'Projekte');
});
