const state = {
  catalog: null,
  releases: {},
  currentContent: null,
  activeView: 'dashboard',
  language: 'de',
  translations: {},
  settings: {},
  supportedLanguages: [],
  displays: [],
  testReports: []
};

const releaseLabels = {
  tag_01: 'Tag 1',
  tag_01_web: 'Tag 1 - Webvariante',
  tag_01_tasks: 'Tag 1 - Aufgabenuebersicht',
  tag_01_solutions: 'Tag 1 - Loesungen',
  tag_01_quiz25: 'Tag 1 - Quiz 25',
  tag_01_quiz50: 'Tag 1 - Quiz 50',
  tag_02: 'Tag 2',
  tag_02_web: 'Tag 2 - Webvariante',
  tag_02_tasks: 'Tag 2 - Aufgabenuebersicht',
  tag_02_solutions: 'Tag 2 - Loesungen',
  tag_02_quiz25: 'Tag 2 - Quiz 25',
  tag_02_quiz50: 'Tag 2 - Quiz 50',
  tag_03: 'Tag 3',
  tag_03_web: 'Tag 3 - Webvariante',
  tag_03_tasks: 'Tag 3 - Aufgabenuebersicht',
  tag_03_solutions: 'Tag 3 - Loesungen',
  tag_03_quiz25: 'Tag 3 - Quiz 25',
  tag_03_quiz50: 'Tag 3 - Quiz 50',
  tag_04: 'Tag 4',
  tag_04_web: 'Tag 4 - Webvariante',
  tag_04_tasks: 'Tag 4 - Aufgabenuebersicht',
  tag_04_solutions: 'Tag 4 - Loesungen',
  tag_04_quiz25: 'Tag 4 - Quiz 25',
  tag_04_quiz50: 'Tag 4 - Quiz 50',
  tag_05: 'Tag 5',
  tag_05_web: 'Tag 5 - Webvariante',
  tag_05_tasks: 'Tag 5 - Aufgabenuebersicht',
  tag_05_solutions: 'Tag 5 - Loesungen',
  tag_05_quiz25: 'Tag 5 - Quiz 25',
  tag_05_quiz50: 'Tag 5 - Quiz 50',
  tag_01_task_tag_sheet: 'Allgemeine Uebung Tag 1 - Aufgabenblatt',
  tag_01_task_html_css_tag_overview: 'Allgemeine Uebung Tag 1 - HTML/CSS Tags Uebersicht',
  tag_01_task_wunderland_farben_abstaende: 'Wunderland einfach 04 - Farben und Abstaende',
  tag_01_task_wunderland_custom_properties: 'Wunderland schwer 01 - Custom Properties Designsystem',
  tag_01_task_akkordeon_checked_selector: 'Akkordeon schwer 01 - :checked Selektor',
  tag_02_task_tag_sheet: 'Allgemeine Uebung Tag 2 - Aufgabenblatt',
  tag_02_task_wunderland_header_logo_navigation: 'Wunderland einfach 01 - Header, Logo und Navigation',
  tag_02_task_wunderland_hero_button: 'Wunderland einfach 02 - Hero Button',
  tag_02_task_akkordeon_radio_label: 'Akkordeon einfach 01 - Radio und Label',
  tag_02_task_akkordeon_basislayout: 'Akkordeon einfach 03 - Basislayout',
  tag_02_task_akkordeon_active_panel: 'Akkordeon einfach 04 - Aktives Panel stylen',
  tag_03_task_tag_sheet: 'Allgemeine Uebung Tag 3 - Aufgabenblatt',
  tag_03_task_wunderland_attraktionskarten: 'Wunderland einfach 03 - Attraktionskarten',
  tag_03_task_wunderland_bildkarten_hover: 'Wunderland schwer 03 - Bildkarten Hover',
  tag_03_task_akkordeon_transition_fokus: 'Akkordeon schwer 02 - Transition und Fokus',
  tag_04_task_tag_sheet: 'Allgemeine Uebung Tag 4 - Aufgabenblatt',
  tag_04_task_wunderland_grid_gallery_responsive: 'Wunderland schwer 02 - Grid Gallery Responsive',
  tag_04_task_akkordeon_bilder_hintergrund: 'Akkordeon einfach 02 - Bilder als Hintergrund',
  tag_04_task_akkordeon_responsive: 'Akkordeon schwer 03 - Responsive Akkordeon',
  tag_05_task_tag_sheet: 'Allgemeine Uebung Tag 5 - Aufgabenblatt',
  tag_05_task_wunderland_seitenabnahme: 'Wunderland schwer 04 - Seitenabnahme',
  tag_05_task_akkordeon_barrierearm: 'Akkordeon schwer 04 - Barrierearme Interaktion',
  project_materials: 'Projektmaterialien',
  project_accordion_tasks: 'Akkordeon - Aufgabenpaket',
  project_accordion_workspace: 'Akkordeon - Arbeitsordner',
  project_accordion_result: 'Akkordeon - Endergebnis',
  project_wunderland_tasks: 'Wunderland - Aufgabenpaket',
  project_wunderland_workspace: 'Wunderland - Arbeitsordner',
  project_wunderland_result: 'Wunderland - Endergebnis',
  project_submission: 'Abgabecheckliste',
  tool_quiz: 'Quiztool',
  tool_tags: 'HTML/CSS Tag-Tool',
  additional_tasks: 'Zusatzaufgaben'
};

const releaseSections = [
  {
    title: 'Tag 1',
    rows: [
      { type: 'Material', key: 'tag_01_web', title: 'Webvariante' },
      { type: 'Material', key: 'tag_01_tasks', title: 'Aufgabenuebersicht' },
      { type: 'Material', key: 'tag_01_solutions', title: 'Loesungen' },
      { type: 'Allgemeine Uebungsaufgabe', key: 'tag_01_task_tag_sheet', title: releaseLabels.tag_01_task_tag_sheet },
      { type: 'Allgemeine Uebungsaufgabe', key: 'tag_01_task_html_css_tag_overview', title: releaseLabels.tag_01_task_html_css_tag_overview },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_01_task_wunderland_farben_abstaende', title: releaseLabels.tag_01_task_wunderland_farben_abstaende },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_01_task_wunderland_custom_properties', title: releaseLabels.tag_01_task_wunderland_custom_properties },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_01_task_akkordeon_checked_selector', title: releaseLabels.tag_01_task_akkordeon_checked_selector }
    ]
  },
  {
    title: 'Tag 2',
    rows: [
      { type: 'Material', key: 'tag_02_web', title: 'Webvariante' },
      { type: 'Material', key: 'tag_02_tasks', title: 'Aufgabenuebersicht' },
      { type: 'Material', key: 'tag_02_solutions', title: 'Loesungen' },
      { type: 'Allgemeine Uebungsaufgabe', key: 'tag_02_task_tag_sheet', title: releaseLabels.tag_02_task_tag_sheet },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_02_task_wunderland_header_logo_navigation', title: releaseLabels.tag_02_task_wunderland_header_logo_navigation },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_02_task_wunderland_hero_button', title: releaseLabels.tag_02_task_wunderland_hero_button },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_02_task_akkordeon_radio_label', title: releaseLabels.tag_02_task_akkordeon_radio_label },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_02_task_akkordeon_basislayout', title: releaseLabels.tag_02_task_akkordeon_basislayout },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_02_task_akkordeon_active_panel', title: releaseLabels.tag_02_task_akkordeon_active_panel }
    ]
  },
  {
    title: 'Tag 3',
    rows: [
      { type: 'Material', key: 'tag_03_web', title: 'Webvariante' },
      { type: 'Material', key: 'tag_03_tasks', title: 'Aufgabenuebersicht' },
      { type: 'Material', key: 'tag_03_solutions', title: 'Loesungen' },
      { type: 'Allgemeine Uebungsaufgabe', key: 'tag_03_task_tag_sheet', title: releaseLabels.tag_03_task_tag_sheet },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_03_task_wunderland_attraktionskarten', title: releaseLabels.tag_03_task_wunderland_attraktionskarten },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_03_task_wunderland_bildkarten_hover', title: releaseLabels.tag_03_task_wunderland_bildkarten_hover },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_03_task_akkordeon_transition_fokus', title: releaseLabels.tag_03_task_akkordeon_transition_fokus }
    ]
  },
  {
    title: 'Tag 4',
    rows: [
      { type: 'Material', key: 'tag_04_web', title: 'Webvariante' },
      { type: 'Material', key: 'tag_04_tasks', title: 'Aufgabenuebersicht' },
      { type: 'Material', key: 'tag_04_solutions', title: 'Loesungen' },
      { type: 'Allgemeine Uebungsaufgabe', key: 'tag_04_task_tag_sheet', title: releaseLabels.tag_04_task_tag_sheet },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_04_task_wunderland_grid_gallery_responsive', title: releaseLabels.tag_04_task_wunderland_grid_gallery_responsive },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_04_task_akkordeon_bilder_hintergrund', title: releaseLabels.tag_04_task_akkordeon_bilder_hintergrund },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_04_task_akkordeon_responsive', title: releaseLabels.tag_04_task_akkordeon_responsive }
    ]
  },
  {
    title: 'Tag 5',
    rows: [
      { type: 'Material', key: 'tag_05_web', title: 'Webvariante' },
      { type: 'Material', key: 'tag_05_tasks', title: 'Aufgabenuebersicht' },
      { type: 'Material', key: 'tag_05_solutions', title: 'Loesungen' },
      { type: 'Allgemeine Uebungsaufgabe', key: 'tag_05_task_tag_sheet', title: releaseLabels.tag_05_task_tag_sheet },
      { type: 'Projektvorbereitung Wunderland', key: 'tag_05_task_wunderland_seitenabnahme', title: releaseLabels.tag_05_task_wunderland_seitenabnahme },
      { type: 'Projektvorbereitung Akkordeon', key: 'tag_05_task_akkordeon_barrierearm', title: releaseLabels.tag_05_task_akkordeon_barrierearm }
    ]
  },
  {
    title: 'Fragenpools',
    rows: [
      { type: 'Tag 1', key: 'tag_01_quiz25', title: 'Tag 1 - Quiz 25' },
      { type: 'Tag 1', key: 'tag_01_quiz50', title: 'Tag 1 - Quiz 50' },
      { type: 'Tag 2', key: 'tag_02_quiz25', title: 'Tag 2 - Quiz 25' },
      { type: 'Tag 2', key: 'tag_02_quiz50', title: 'Tag 2 - Quiz 50' },
      { type: 'Tag 3', key: 'tag_03_quiz25', title: 'Tag 3 - Quiz 25' },
      { type: 'Tag 3', key: 'tag_03_quiz50', title: 'Tag 3 - Quiz 50' },
      { type: 'Tag 4', key: 'tag_04_quiz25', title: 'Tag 4 - Quiz 25' },
      { type: 'Tag 4', key: 'tag_04_quiz50', title: 'Tag 4 - Quiz 50' },
      { type: 'Tag 5', key: 'tag_05_quiz25', title: 'Tag 5 - Quiz 25' },
      { type: 'Tag 5', key: 'tag_05_quiz50', title: 'Tag 5 - Quiz 50' }
    ]
  },
  {
    title: 'Projekt Wunderland',
    rows: [
      { type: 'Projektteil', key: 'project_materials', title: 'Projektmaterialien' },
      { type: 'Projektteil', key: 'project_wunderland_tasks', title: 'Aufgabenpaket' },
      { type: 'Projektteil', key: 'project_wunderland_workspace', title: 'Arbeitsordner' },
      { type: 'Projektteil', key: 'project_wunderland_result', title: 'Endergebnis' },
      { type: 'Vorbereitung einfach', key: 'tag_02_task_wunderland_header_logo_navigation', title: releaseLabels.tag_02_task_wunderland_header_logo_navigation },
      { type: 'Vorbereitung einfach', key: 'tag_02_task_wunderland_hero_button', title: releaseLabels.tag_02_task_wunderland_hero_button },
      { type: 'Vorbereitung einfach', key: 'tag_03_task_wunderland_attraktionskarten', title: releaseLabels.tag_03_task_wunderland_attraktionskarten },
      { type: 'Vorbereitung einfach', key: 'tag_01_task_wunderland_farben_abstaende', title: releaseLabels.tag_01_task_wunderland_farben_abstaende },
      { type: 'Vorbereitung schwer', key: 'tag_01_task_wunderland_custom_properties', title: releaseLabels.tag_01_task_wunderland_custom_properties },
      { type: 'Vorbereitung schwer', key: 'tag_04_task_wunderland_grid_gallery_responsive', title: releaseLabels.tag_04_task_wunderland_grid_gallery_responsive },
      { type: 'Vorbereitung schwer', key: 'tag_03_task_wunderland_bildkarten_hover', title: releaseLabels.tag_03_task_wunderland_bildkarten_hover },
      { type: 'Vorbereitung schwer', key: 'tag_05_task_wunderland_seitenabnahme', title: releaseLabels.tag_05_task_wunderland_seitenabnahme }
    ]
  },
  {
    title: 'Projekt Akkordeon',
    rows: [
      { type: 'Projektteil', key: 'project_materials', title: 'Projektmaterialien' },
      { type: 'Projektteil', key: 'project_accordion_tasks', title: 'Aufgabenpaket' },
      { type: 'Projektteil', key: 'project_accordion_workspace', title: 'Arbeitsordner' },
      { type: 'Projektteil', key: 'project_accordion_result', title: 'Endergebnis' },
      { type: 'Vorbereitung einfach', key: 'tag_02_task_akkordeon_radio_label', title: releaseLabels.tag_02_task_akkordeon_radio_label },
      { type: 'Vorbereitung einfach', key: 'tag_04_task_akkordeon_bilder_hintergrund', title: releaseLabels.tag_04_task_akkordeon_bilder_hintergrund },
      { type: 'Vorbereitung einfach', key: 'tag_02_task_akkordeon_basislayout', title: releaseLabels.tag_02_task_akkordeon_basislayout },
      { type: 'Vorbereitung einfach', key: 'tag_02_task_akkordeon_active_panel', title: releaseLabels.tag_02_task_akkordeon_active_panel },
      { type: 'Vorbereitung schwer', key: 'tag_01_task_akkordeon_checked_selector', title: releaseLabels.tag_01_task_akkordeon_checked_selector },
      { type: 'Vorbereitung schwer', key: 'tag_03_task_akkordeon_transition_fokus', title: releaseLabels.tag_03_task_akkordeon_transition_fokus },
      { type: 'Vorbereitung schwer', key: 'tag_04_task_akkordeon_responsive', title: releaseLabels.tag_04_task_akkordeon_responsive },
      { type: 'Vorbereitung schwer', key: 'tag_05_task_akkordeon_barrierearm', title: releaseLabels.tag_05_task_akkordeon_barrierearm }
    ]
  },
  {
    title: 'Tools und Zusatzbereiche',
    rows: [
      { type: 'Tool', key: 'project_submission', title: 'Abgabecheckliste' },
      { type: 'Tool', key: 'tool_quiz', title: 'Quiztool' },
      { type: 'Tool', key: 'tool_tags', title: 'HTML/CSS Tag-Tool' },
      { type: 'Zusatzbereich', key: 'additional_tasks', title: 'Zusatzaufgaben' }
    ]
  }
];

const viewTitles = {
  dashboard: 'dashboardTitle',
  days: 'daysTitle',
  projects: 'projectsTitle',
  tools: 'toolsTitle',
  participants: 'participantsTitle',
  releases: 'releasesTitle'
};

const fallbackContentGroups = {
  getTeacherTools: (catalog) => catalog.teacher.quickLinks.filter((item) => item.kind === 'Tool'),
  getTeacherSupportItems(catalog) {
    return [...catalog.teacher.guides, ...this.getTeacherTools(catalog)];
  },
  getTeacherProjects: (catalog) => catalog.teacher.projects,
  getParticipantProjects: (catalog) => catalog.participant.projects,
  getTeacherDays: (catalog) => catalog.teacher.days
};

const contentGroups = window.LFZQ8aCourseContent || fallbackContentGroups;
const fallbackCourseNavigation = {
  showView({ view, panels, buttons, titleElement, translate, viewTitles }) {
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== view;
    });
    buttons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === view);
    });
    titleElement.textContent = translate(viewTitles[view] || 'coursePlatform');
  }
};

const courseNavigation = window.LFZQ8aCourseNavigation || fallbackCourseNavigation;

function getInitialView() {
  const requestedView = new URLSearchParams(window.location.search).get('view');
  return viewTitles[requestedView] ? requestedView : 'dashboard';
}

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

function initials(name) {
  return String(name || 'LF')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'LF';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file || !file.size) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result || ''));
    reader.addEventListener('error', () => resolve(''));
    reader.readAsDataURL(file);
  });
}

function renderOptions(select, options, selectedValue) {
  clearElement(select);
  options.forEach((optionData) => {
    const option = document.createElement('option');
    option.value = String(optionData.value ?? optionData.code);
    option.textContent = optionData.label;
    option.selected = option.value === String(selectedValue);
    select.appendChild(option);
  });
}

function updateProfileEntry() {
  const profile = state.settings.teacherProfile || {};
  const avatar = byData('[data-profile-avatar]');
  const name = profile.displayName || 'Dozent';
  byData('[data-profile-name]').textContent = name;
  clearElement(avatar);
  if (profile.avatarDataUrl) {
    const image = document.createElement('img');
    image.alt = '';
    image.src = profile.avatarDataUrl;
    avatar.appendChild(image);
  } else {
    avatar.textContent = initials(name);
  }
}

function renderReportList() {
  const list = byData('[data-settings-reports]');
  clearElement(list);
  if (!state.testReports.length) {
    list.appendChild(createElement('p', 'muted', t('noReports')));
    return;
  }
  state.testReports.slice(0, 6).forEach((report) => {
    const item = createElement('div', 'report-item');
    item.appendChild(createElement('strong', '', report.createdAt || report.id));
    item.appendChild(createElement('span', 'muted', `JSON: ${report.files?.json || '-'} | HTML: ${report.files?.html || '-'}`));
    list.appendChild(item);
  });
}

function populateSettingsDialog() {
  const profile = state.settings.teacherProfile || {};
  byData('[data-setting-display-name]').value = profile.displayName || '';
  byData('[data-setting-email]').value = profile.email || '';
  renderOptions(
    byData('[data-setting-teacher-language]'),
    state.supportedLanguages,
    state.settings.teacherLanguage || 'de'
  );
  renderOptions(
    byData('[data-setting-participant-language]'),
    state.supportedLanguages,
    state.settings.participantLanguage || 'de'
  );
  renderOptions(
    byData('[data-setting-monitor]'),
    state.displays.map((display) => ({
      value: display.index,
      label: `${display.label}${display.primary ? ' (Hauptmonitor)' : ''}`
    })),
    state.settings.monitorIndex ?? 0
  );
  byData('[data-setting-second-monitor]').checked = state.settings.openTeacherOnSecondMonitor !== false;
  byData('[data-setting-network]').checked = state.settings.includeDeviceNetworkData === true;
  renderReportList();
}

function openSettingsDialog() {
  populateSettingsDialog();
  byData('[data-settings-dialog]').hidden = false;
}

function closeSettingsDialog() {
  byData('[data-settings-dialog]').hidden = true;
}

async function saveSettingsFromDialog(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const previousProfile = state.settings.teacherProfile || {};
  const avatarDataUrl = await readFileAsDataUrl(formData.get('avatar'));
  state.settings = await window.lfzq8aDesktop.saveSetup({
    monitorIndex: Number(formData.get('monitorIndex')),
    openTeacherOnSecondMonitor: formData.get('openTeacherOnSecondMonitor') === 'on',
    includeDeviceNetworkData: formData.get('includeDeviceNetworkData') === 'on',
    teacherLanguage: String(formData.get('teacherLanguage') || 'de'),
    participantLanguage: String(formData.get('participantLanguage') || 'de'),
    teacherProfile: {
      displayName: String(formData.get('displayName') || '').trim() || 'Dozent',
      email: String(formData.get('email') || '').trim(),
      avatarDataUrl: avatarDataUrl || previousProfile.avatarDataUrl || ''
    }
  });
  const courseState = await window.lfzq8aDesktop.getCourseState();
  state.settings = courseState.settings || state.settings;
  state.translations = courseState.translations || state.translations;
  state.supportedLanguages = courseState.supportedLanguages || state.supportedLanguages;
  state.displays = courseState.displays || state.displays;
  state.testReports = courseState.testReports || state.testReports;
  state.language = state.settings.teacherLanguage || 'de';
  applyTranslations();
  updateProfileEntry();
  populateSettingsDialog();
  byData('[data-settings-status]').textContent = 'Settings gespeichert.';
}

async function createReportFromSettings() {
  const report = await window.lfzq8aDesktop.createTestReport();
  state.testReports = await window.lfzq8aDesktop.listTestReports();
  renderReportList();
  byData('[data-settings-status]').textContent = t('reportSaved', {
    json: report.paths?.json || report.files?.json || '-',
    html: report.paths?.html || report.files?.html || '-'
  });
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
  state.activeView = 'dashboard';
  courseNavigation.showView({
    view: state.activeView,
    panels: document.querySelectorAll('[data-panel]'),
    buttons: document.querySelectorAll('[data-view]'),
    titleElement: byData('[data-view-title]'),
    translate: t,
    viewTitles
  });
}

function loadContent(title, kind, fileInfo) {
  if (!fileInfo || fileInfo.kind === 'directory') {
    return;
  }
  state.currentContent = { title, kind, fileInfo };
  if (byData('[data-viewer-shell]')) {
    byData('[data-viewer-shell]').hidden = false;
  }
  byData('[data-current-title]').textContent = title;
  byData('[data-current-kind]').textContent = kind || t('integratedContent');
  byData('[data-viewer]').src = fileInfo.url;
  byData('[data-viewer-shell]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.lfzq8aDesktop.addHistory({
    type: 'course-content',
    title,
    target: fileInfo.path
  }).catch(() => {});
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

async function renderDashboard() {
  const panel = byData('[data-panel="dashboard"]');
  clearElement(panel);

  await renderParticipants(panel);
  renderReleases(panel);
  contentGroups.getTeacherSupportItems(state.catalog).forEach((item) => panel.appendChild(createCard(item)));
}

function renderDays() {
  const panel = byData('[data-panel="days"]');
  clearElement(panel);
  contentGroups.getTeacherDays(state.catalog).forEach((day, index) => panel.appendChild(createDayCard(day, index)));
}

function renderProjects() {
  const panel = byData('[data-panel="projects"]');
  clearElement(panel);
  contentGroups.getTeacherProjects(state.catalog).forEach((project) => panel.appendChild(createProjectCard(project)));
  contentGroups.getParticipantProjects(state.catalog).forEach((project) => {
    const card = createProjectCard(project);
    card.dataset.accent = 'blue';
    panel.appendChild(card);
  });
}

function renderTools(targetPanel) {
  const panel = targetPanel || byData('[data-panel="tools"]');
  if (!panel) {
    return;
  }
  clearElement(panel);
  contentGroups.getTeacherSupportItems(state.catalog).forEach((item) => panel.appendChild(createCard(item)));
}

function renderReleases(targetPanel) {
  const panel = targetPanel || byData('[data-panel="releases"]');
  if (!panel) {
    return;
  }
  if (!targetPanel) {
    clearElement(panel);
  }
  const card = createElement('article', 'wide-card');
  card.appendChild(createElement('span', 'pill', t('teacherControl')));
  card.appendChild(createElement('h2', '', t('releasesForParticipants')));
  card.appendChild(createElement('p', '', t('releasesText')));

  const list = createElement('div', 'release-list');
  releaseSections.forEach((sectionData, sectionIndex) => {
    const section = createElement('details', 'release-section');
    section.open = sectionIndex === 0;
    const summary = createElement('summary', 'release-section-summary');
    summary.appendChild(createElement('span', '', sectionData.title));
    summary.appendChild(createElement('small', '', `${sectionData.rows.length} Eintraege`));
    section.appendChild(summary);
    const table = createElement('table', 'release-table');
    table.innerHTML = '<thead><tr><th>Freigabe</th><th>Bereich</th><th>Titel</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    sectionData.rows.forEach((rowData) => {
      const row = document.createElement('tr');
      const releaseCell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state.releases[rowData.key] === true;
      input.dataset.releaseKey = rowData.key;
      input.setAttribute('aria-label', `${rowData.title} freigeben`);
      input.addEventListener('change', () => {
        document.querySelectorAll(`[data-release-key="${rowData.key}"]`).forEach((peerInput) => {
          peerInput.checked = input.checked;
        });
      });
      releaseCell.appendChild(input);
      const typeCell = document.createElement('td');
      typeCell.textContent = rowData.type;
      const titleCell = document.createElement('td');
      titleCell.textContent = rowData.title || releaseLabels[rowData.key] || rowData.key;
      row.append(releaseCell, typeCell, titleCell);
      tbody.appendChild(row);
    });
    section.appendChild(table);
    list.appendChild(section);
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

async function renderParticipants(targetPanel) {
  const panel = targetPanel || byData('[data-panel="participants"]');
  if (!panel) {
    return;
  }
  if (!targetPanel) {
    clearElement(panel);
  }
  const card = createElement('article', 'wide-card');
  card.dataset.dashboardSection = 'participants';
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
  if (targetPanel) {
    const existingCard = panel.querySelector('[data-dashboard-section="participants"]');
    if (existingCard) {
      existingCard.replaceWith(card);
      return;
    }
  }
  panel.appendChild(card);
}

async function saveReleases() {
  const nextReleases = {};
  document.querySelectorAll('[data-release-key]').forEach((input) => {
    if (typeof input.checked === 'boolean') {
      nextReleases[input.dataset.releaseKey] = input.checked;
    }
  });
  state.releases = await window.lfzq8aDesktop.saveParticipantReleases(nextReleases);
  setStatus(t('releasesSaved'));
  await renderDashboard();
}

async function handleParticipantReleasesChanged(releases) {
  state.releases = releases || {};
  await renderDashboard();
}

async function renderAll() {
  await renderDashboard();
}

async function loadInitialState() {
  const courseState = await window.lfzq8aDesktop.getCourseState();
  state.catalog = courseState.catalog;
  state.releases = courseState.releases || {};
  state.settings = courseState.settings || {};
  state.supportedLanguages = courseState.supportedLanguages || [];
  state.displays = courseState.displays || [];
  state.testReports = courseState.testReports || [];
  state.language = courseState.settings?.teacherLanguage || 'de';
  state.translations = courseState.translations || {};
  state.activeView = getInitialView();
  applyTranslations();
  updateProfileEntry();
  showView(state.activeView);
  await renderAll();
  window.lfzq8aDesktop.onParticipantReleasesChanged?.(handleParticipantReleasesChanged);
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

  if (event.target.closest('[data-open-settings]')) {
    openSettingsDialog();
  }

  if (event.target.closest('[data-close-settings]')) {
    closeSettingsDialog();
  }

  if (event.target.closest('[data-create-report]')) {
    createReportFromSettings();
  }

  if (event.target.closest('[data-open-report-dir]')) {
    window.lfzq8aDesktop.openTestReportDir();
  }
});

byData('[data-settings-form]').addEventListener('submit', saveSettingsFromDialog);

setInterval(() => {
  if (state.activeView === 'dashboard') {
    renderParticipants(byData('[data-panel="dashboard"]'));
  }
}, 5000);

loadInitialState().catch((error) => {
  document.body.innerHTML = `<main class="workspace"><h1>Dozentenview konnte nicht geladen werden</h1><p>${error.message}</p></main>`;
});
