(() => {
  'use strict';

  const root = document.querySelector('[data-task-packages]');
  if (!root) {
    return;
  }

  const groupDefinitions = [
    {
      title: 'Allgemeine Aufgaben',
      children: [
        { title: 'normal', filter: (task) => task.category === 'allgemein' && task.difficulty === 'normal' },
        { title: 'schwer', filter: (task) => task.category === 'allgemein' && task.difficulty === 'schwer' }
      ]
    },
    {
      title: 'Projektaufgaben Akkordeon',
      filter: (task) => task.category === 'projekt' && task.project === 'akkordeon'
    },
    {
      title: 'Projektaufgaben Wunderland',
      filter: (task) => task.category === 'projekt' && task.project === 'wunderland'
    }
  ];

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function renderTaskCard(task) {
    const card = createElement('article', 'participant-task-card');
    card.appendChild(createElement('span', 'task-pill', `${task.number} · ${task.difficulty}`));
    card.appendChild(createElement('h3', '', task.title));
    card.appendChild(createElement('p', '', task.shortInfo || `Bearbeitungszeit: ca. ${task.estimatedMinutes} Minuten`));
    card.appendChild(createElement('p', 'task-meta-line', `Bearbeitungszeit: ca. ${task.estimatedMinutes} Minuten`));

    const actions = createElement('div', 'participant-task-actions');
    const taskLink = createElement('a', 'task-link', 'Aufgabe ansehen');
    taskLink.href = `/api/task-packages/view?id=${encodeURIComponent(task.id)}&kind=task`;
    taskLink.target = '_blank';
    actions.appendChild(taskLink);

    if (task.solutionUnlocked) {
      const solutionLink = createElement('a', 'task-link secondary', 'Loesung ansehen');
      solutionLink.href = `/api/task-packages/view?id=${encodeURIComponent(task.id)}&kind=solution`;
      solutionLink.target = '_blank';
      actions.appendChild(solutionLink);
    }

    card.appendChild(actions);
    return card;
  }

  function appendTaskList(parent, title, tasks) {
    if (!tasks.length) {
      return;
    }
    parent.appendChild(createElement('h3', 'participant-task-subtitle', title));
    const list = createElement('div', 'participant-task-list');
    tasks.forEach((task) => list.appendChild(renderTaskCard(task)));
    parent.appendChild(list);
  }

  function appendGroupedTasks(daySection, dayTasks) {
    groupDefinitions.forEach((group) => {
      if (group.children) {
        const matchingChildren = group.children
          .map((child) => ({ ...child, tasks: dayTasks.filter(child.filter) }))
          .filter((child) => child.tasks.length);
        if (!matchingChildren.length) {
          return;
        }
        daySection.appendChild(createElement('h3', 'participant-task-area-title', group.title));
        matchingChildren.forEach((child) => appendTaskList(daySection, child.title, child.tasks));
        return;
      }
      appendTaskList(daySection, group.title, dayTasks.filter(group.filter));
    });
  }

  function renderTasks(tasks, daysOpen) {
    root.innerHTML = '';
    const openDays = [1, 2, 3, 4, 5].filter((day) => daysOpen && daysOpen[day]);
    if (!openDays.length) {
      root.appendChild(createElement('p', 'task-empty', 'Noch keine Aufgabenbereiche freigegeben.'));
      return;
    }

    openDays.forEach((day) => {
      const dayTasks = tasks.filter((task) => task.day === day);
      const daySection = createElement('section', 'participant-task-group');
      daySection.appendChild(createElement('h2', '', `Aufgaben Tag ${day}`));

      if (!dayTasks.length) {
        daySection.appendChild(createElement('p', 'task-empty', 'Der Aufgabenbereich ist freigegeben. Einzelne Aufgaben werden vom Dozenten noch freigeschaltet.'));
        root.appendChild(daySection);
        return;
      }

      appendGroupedTasks(daySection, dayTasks);
      root.appendChild(daySection);
    });
  }

  fetch('/api/task-packages')
    .then((response) => response.json())
    .then((data) => renderTasks(data.tasks || [], data.daysOpen || {}))
    .catch(() => {
      root.innerHTML = '<p class="task-empty">Aufgaben konnten nicht geladen werden.</p>';
    });
})();
