const state = {
  catalog: null,
  releases: {},
  currentContent: null,
  activeView: 'dashboard',
  language: 'de',
  translations: {}
};

const releaseLabels = {
  tag_01: 'Tag 1',
  tag_02: 'Tag 2',
  tag_03: 'Tag 3',
  tag_04: 'Tag 4',
  tag_05: 'Tag 5',
  project_materials: 'Projektmaterialien',
  project_submission: 'Abgabecheckliste',
  tool_quiz: 'Quiztool',
  tool_tags: 'HTML/CSS Tag-Tool',
  additional_tasks: 'Zusatzaufgaben'
};

const viewTitles = {
  dashboard: 'dashboardTitle',
  days: 'daysTitle',
  projects: 'projectsTitle',
  tools: 'toolsTitle',
  participants: 'participantsTitle',
  releases: 'releasesTitle'
};

function t(key, replacements = {}) {
  const template = state.translations[key] || key;
  return Object.entries(replacements).reduce((text, [name, value]) => (
    text.replaceAll(`{${name}}`, String(value))
  ), template);
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  document.title = t('appTitle');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
}

function byData(selector) {
  return document.querySelector(selector);
}

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

function clearElement(element) {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}

function fileFrom(item, key = 'path') {
  return item && item[`${key}File`];
}

function isReleased(item) {
  return !item.releaseKey || state.releases[item.releaseKey] === true;
}

function setStatus(text) {
  const status = byData('[data-release-status]');
  if (status) {
    status.textContent = text;
  }
}

function showView(view) {
  state.activeView = view;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === view);
  });
  byData('[data-view-title]').textContent = t(viewTitles[view] || 'coursePlatform');
}

function loadContent(title, kind, fileInfo) {
  if (!fileInfo || fileInfo.kind === 'directory') {
    return;
  }
  state.currentContent = { title, kind, fileInfo };
  byData('[data-current-title]').textContent = title;
  byData('[data-current-kind]').textContent = kind || t('integratedContent');
  byData('[data-viewer]').src = fileInfo.url;
  window.lfzq8aDesktop.addHistory({
    type: 'course-content',
    title,
    target: fileInfo.path
  });
}

async function openCurrentInWindow() {
  if (!state.currentContent) {
    return;
  }
  await window.lfzq8aDesktop.openTeacherInfo(state.currentContent.fileInfo.url);
}

function createCard(item, options = {}) {
  const card = createElement('article', 'course-card');
  if (options.accent) {
    card.dataset.accent = options.accent;
  }

  card.appendChild(createElement('span', 'pill', item.kind || options.kind || 'Inhalt'));
  card.appendChild(createElement('h3', '', item.title));
  card.appendChild(createElement('p', '', item.description || item.theme || t('integratedContent')));

  if (!isReleased(item) && options.showReleaseState) {
    card.appendChild(createElement('p', 'status-line', t('notReleased', { label: releaseLabels[item.releaseKey] || item.releaseKey })));
  }

  const actions = createElement('div', 'button-row');
  const openButton = createElement('button', 'card-button', t('openInApp'));
  openButton.type = 'button';
  openButton.addEventListener('click', () => loadContent(item.title, item.kind, fileFrom(item)));
  actions.appendChild(openButton);

  if (fileFrom(item)) {
    const windowButton = createElement('button', 'card-button', t('window'));
    windowButton.type = 'button';
    windowButton.addEventListener('click', () => window.lfzq8aDesktop.openTeacherInfo(fileFrom(item).url));
    actions.appendChild(windowButton);
  }

  card.appendChild(actions);
  return card;
}

function createDayCard(day, index) {
  const accents = ['cyan', 'blue', 'green', 'orange', 'violet'];
  const card = createElement('article', 'course-card');
  card.dataset.accent = accents[index] || 'cyan';
  card.appendChild(createElement('span', 'pill', releaseLabels[day.releaseKey]));
  card.appendChild(createElement('h3', '', day.title));
  card.appendChild(createElement('p', '', day.theme));

  const actions = createElement('div', 'button-row');
  [
    [t('webVariant'), 'web', t('webVariant')],
    [t('tasks'), 'tasks', t('tasks')],
    [t('solutions'), 'solutions', t('solutions')],
    ['Quiz 25', 'quiz25', t('quiz')],
    ['Quiz 50', 'quiz50', t('quiz')]
  ].forEach(([label, key, kind]) => {
    const button = createElement('button', 'card-button', label);
    button.type = 'button';
    button.addEventListener('click', () => loadContent(`${day.title} - ${label}`, kind, fileFrom(day, key)));
    actions.appendChild(button);
  });
  card.appendChild(actions);
  return card;
}

function createProjectCard(project) {
  const card = createElement('article', 'course-card');
  card.dataset.accent = 'green';
  card.appendChild(createElement('span', 'pill', t('project')));
  card.appendChild(createElement('h3', '', project.title));
  card.appendChild(createElement('p', '', t('projectCardText')));

  const actions = createElement('div', 'button-row');
  const overviewButton = createElement('button', 'card-button', t('taskPackage'));
  overviewButton.type = 'button';
  overviewButton.addEventListener('click', () => loadContent(project.title, 'Aufgabenpaket', fileFrom(project, 'overview')));
  actions.appendChild(overviewButton);

  const workspaceButton = createElement('button', 'card-button', t('workspaceInVsCode'));
  workspaceButton.type = 'button';
  workspaceButton.addEventListener('click', () => window.lfzq8aDesktop.openInEditor(project.workspace));
  actions.appendChild(workspaceButton);

  if (project.solutionFile) {
    const solutionButton = createElement('button', 'card-button', t('finalResult'));
    solutionButton.type = 'button';
    solutionButton.addEventListener('click', () => loadContent(`${project.title} - ${t('finalResult')}`, t('finalResult'), fileFrom(project, 'solution')));
    actions.appendChild(solutionButton);
  }

  card.appendChild(actions);
  return card;
}

function appendSectionTitle(panel, title, description) {
  const sectionTitle = createElement('article', 'wide-card section-title-card');
  sectionTitle.appendChild(createElement('h2', '', title));
  if (description) {
    sectionTitle.appendChild(createElement('p', '', description));
  }
  panel.appendChild(sectionTitle);
}

function renderDashboard() {
  const panel = byData('[data-panel="dashboard"]');
  clearElement(panel);

  const intro = createElement('article', 'wide-card');
  intro.appendChild(createElement('span', 'pill', t('targetArchitecture')));
  intro.appendChild(createElement('h2', '', t('allInApp')));
  intro.appendChild(createElement('p', '', t('allInAppText')));
  panel.appendChild(intro);

  appendSectionTitle(panel, t('courseDays'), t('dashboardDaysText'));
  state.catalog.teacher.days.forEach((day, index) => panel.appendChild(createDayCard(day, index)));

  appendSectionTitle(panel, t('projects'), t('dashboardProjectsText'));
  state.catalog.teacher.projects.forEach((project) => panel.appendChild(createProjectCard(project)));

  appendSectionTitle(panel, t('tools'), t('dashboardToolsText'));
  [...state.catalog.teacher.guides, ...state.catalog.teacher.quickLinks.filter((item) => item.kind === 'Tool')]
    .forEach((item) => panel.appendChild(createCard(item, { showReleaseState: true })));
}

function renderDays() {
  const panel = byData('[data-panel="days"]');
  clearElement(panel);
  state.catalog.teacher.days.forEach((day, index) => panel.appendChild(createDayCard(day, index)));
}

function renderProjects() {
  const panel = byData('[data-panel="projects"]');
  clearElement(panel);
  state.catalog.teacher.projects.forEach((project) => panel.appendChild(createProjectCard(project)));
  state.catalog.participant.projects.forEach((project) => {
    const card = createProjectCard(project);
    card.dataset.accent = 'blue';
    panel.appendChild(card);
  });
}

function renderTools() {
  const panel = byData('[data-panel="tools"]');
  clearElement(panel);
  [...state.catalog.teacher.guides, ...state.catalog.teacher.quickLinks.filter((item) => item.kind === 'Tool')]
    .forEach((item) => panel.appendChild(createCard(item)));
}

function renderReleases() {
  const panel = byData('[data-panel="releases"]');
  clearElement(panel);
  const card = createElement('article', 'wide-card');
  card.appendChild(createElement('span', 'pill', t('teacherControl')));
  card.appendChild(createElement('h2', '', t('releasesForParticipants')));
  card.appendChild(createElement('p', '', t('releasesText')));

  const list = createElement('div', 'release-list');
  Object.entries(releaseLabels).forEach(([key, label]) => {
    const option = createElement('label', 'release-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = state.releases[key] === true;
    input.dataset.releaseKey = key;
    option.appendChild(input);
    option.appendChild(createElement('span', '', label));
    list.appendChild(option);
  });
  card.appendChild(list);

  const actions = createElement('div', 'button-row');
  const saveButton = createElement('button', 'card-button', t('saveReleases'));
  saveButton.type = 'button';
  saveButton.addEventListener('click', saveReleases);
  actions.appendChild(saveButton);
  card.appendChild(actions);
  const status = createElement('div', 'status-line', '');
  status.dataset.releaseStatus = '';
  card.appendChild(status);
  panel.appendChild(card);
}

async function renderParticipants() {
  const panel = byData('[data-panel="participants"]');
  clearElement(panel);
  const card = createElement('article', 'wide-card');
  card.appendChild(createElement('span', 'pill', t('classroomServer')));
  card.appendChild(createElement('h2', '', t('participantStatus')));

  const info = await window.lfzq8aDesktop.getClassroomInfo();
  card.appendChild(createElement('p', '', info.urls && info.urls.length ? t('participantAddress', { url: info.urls[0] }) : t('serverStarting')));

  const table = createElement('table', 'participant-table');
  table.innerHTML = `<thead><tr><th>${t('tableName')}</th><th>${t('tableStatus')}</th><th>${t('tableTask')}</th><th>${t('tableProgress')}</th><th>${t('tableLastActivity')}</th></tr></thead><tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  const participants = await window.lfzq8aDesktop.listParticipants();
  if (!participants.length) {
    tbody.innerHTML = `<tr><td colspan="5">${t('noParticipants')}</td></tr>`;
  } else {
    participants.forEach((participant) => {
      const row = document.createElement('tr');
      const status = participant.status || {};
      [
        participant.displayName || t('participantFallback'),
        `${participant.online ? t('online') : t('offline')}${status.needsHelp ? ` / ${t('help')}` : ''}`,
        status.currentTask || '-',
        `${status.progress || 0}%`,
        participant.lastSeenAt || '-'
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  }
  card.appendChild(table);
  panel.appendChild(card);
}

async function saveReleases() {
  const nextReleases = {};
  document.querySelectorAll('[data-release-key]').forEach((input) => {
    nextReleases[input.dataset.releaseKey] = input.checked;
  });
  state.releases = await window.lfzq8aDesktop.saveParticipantReleases(nextReleases);
  setStatus(t('releasesSaved'));
  renderDashboard();
}

function renderAll() {
  renderDashboard();
  renderDays();
  renderProjects();
  renderTools();
  renderReleases();
  renderParticipants();
}

async function loadInitialState() {
  const courseState = await window.lfzq8aDesktop.getCourseState();
  state.catalog = courseState.catalog;
  state.releases = courseState.releases || {};
  state.language = courseState.settings?.teacherLanguage || 'de';
  state.translations = courseState.translations || {};
  applyTranslations();
  showView(state.activeView);
  renderAll();
  loadContent(t('teacherWorkspace'), t('start'), state.catalog.teacher.quickLinks[0].pathFile);
}

document.addEventListener('click', (event) => {
  const navButton = event.target.closest('[data-view]');
  if (navButton) {
    showView(navButton.dataset.view);
  }

  if (event.target.closest('[data-open-current-window]')) {
    openCurrentInWindow();
  }

  if (event.target.closest('[data-clear-viewer]')) {
    state.currentContent = null;
    byData('[data-current-title]').textContent = t('viewerEmptyTitle');
    byData('[data-current-kind]').textContent = t('viewerReady');
    byData('[data-viewer]').removeAttribute('src');
  }

  if (event.target.closest('[data-open-data-dir]')) {
    window.lfzq8aDesktop.openDataDir();
  }
});

setInterval(() => {
  if (state.activeView === 'participants') {
    renderParticipants();
  }
}, 5000);

loadInitialState().catch((error) => {
  document.body.innerHTML = `<main class="workspace"><h1>Kursplattform konnte nicht geladen werden</h1><p>${error.message}</p></main>`;
});
