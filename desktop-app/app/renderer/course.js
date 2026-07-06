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
  testReports: [],
  taskPackages: { packages: [], tasks: [] },
  taskReleases: {},
  taskFilters: {
    category: '',
    project: '',
    packageType: '',
    day: '',
    difficulty: '',
    status: '',
    query: ''
  },
  taskOpenSections: new Set(['task-day-1', 'task-day-1-general', 'task-day-1-general-normal']),
  taskClosedSections: new Set(),
  courseOpenSections: new Set(['course-day-1', 'course-day-1-materials', 'course-day-1-tasks']),
  courseClosedSections: new Set(),
  breakPopup: window.LFZQ8aCourseSchedule?.createBreakPopupState?.() || {
    activeBreakId: null,
    dismissedBreakId: null,
    hiddenUntilEndBreakId: null,
    lastEndedBreakId: null
  },
  breakPopupTimer: null,
  breakToastTimer: null,
  breakPreviousFocus: null,
  dashboardRenderId: 0
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

function isMaterialReleaseRow(row) {
  return !/^tag_\d{2}_(?:tasks|solutions)$/.test(row.key)
    && !/^tag_\d{2}_task_/.test(row.key)
    && !/^project_(?:accordion|wunderland)_tasks$/.test(row.key);
}

const materialReleaseSections = releaseSections
  .map((section) => ({
    ...section,
    rows: section.rows.filter(isMaterialReleaseRow)
  }))
  .filter((section) => section.rows.length);

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

function taskFileInfo(task, kind) {
  const field = kind === 'solution' ? 'solutionFileInfo' : 'taskFileInfo';
  const source = task[field];
  const target = kind === 'solution' ? task.solutionFile : task.taskFile;
  if (!source || !target) {
    return null;
  }
  const hash = String(target).includes('#') ? `#${String(target).split('#').slice(1).join('#')}` : '';
  return {
    ...source,
    path: target,
    url: `${source.url}${hash}`
  };
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

function dayNumber(day) {
  return Number(String(day.releaseKey || day.id || '').match(/\d+/)?.[0] || 0);
}

function releaseKeyForDay(day, suffix) {
  return `${day.releaseKey}_${suffix}`;
}

function createCourseDetails(id, className, defaultOpen = false) {
  const details = createElement('details', className);
  details.dataset.courseSectionId = id;
  details.open = state.courseOpenSections.has(id) || (defaultOpen && !state.courseClosedSections.has(id));
  details.addEventListener('toggle', () => {
    if (details.open) {
      state.courseOpenSections.add(id);
      state.courseClosedSections.delete(id);
    } else {
      state.courseOpenSections.delete(id);
      state.courseClosedSections.add(id);
    }
  });
  return details;
}

function appendCourseSummary(details, title, meta) {
  const summary = createElement('summary', 'course-section-summary');
  summary.appendChild(createElement('span', '', title));
  if (meta) {
    summary.appendChild(createElement('small', '', meta));
  }
  details.appendChild(summary);
}

async function saveParticipantReleaseKey(key, enabled) {
  state.releases = await window.lfzq8aDesktop.saveParticipantReleases({ [key]: enabled });
  await renderDashboard();
}

function createReleaseToggle(label, key) {
  return createTaskToggle(label, state.releases[key] === true, (checked) => saveParticipantReleaseKey(key, checked));
}

function createMaterialReleaseCard(title, kind, fileInfo, releaseKey) {
  const card = createElement('article', 'material-release-card');
  card.appendChild(createElement('span', 'pill', kind));
  card.appendChild(createElement('h4', '', title));
  card.appendChild(createElement('p', 'muted', releaseKey ? 'Freigabe direkt in diesem Tagesbereich.' : 'Nur fuer die Dozentenansicht.'));

  const actions = createElement('div', 'task-card-actions');
  actions.appendChild(taskActionButton('In App oeffnen', () => loadContent(title, kind, fileInfo)));
  if (fileInfo?.url) {
    actions.appendChild(taskActionButton('Fenster', () => window.lfzq8aDesktop.openTeacherInfo(fileInfo.url)));
  }
  if (releaseKey) {
    actions.appendChild(createReleaseToggle('Teilnehmer', releaseKey));
  }
  card.appendChild(actions);
  return card;
}

function renderDayMaterials(dayDetails, day) {
  const dayId = dayNumber(day);
  const section = createCourseDetails(`course-day-${dayId}-materials`, 'course-subsection', dayId === 1);
  appendCourseSummary(section, 'Materialien', 'Web, Uebersicht, Quizpools');
  const list = createElement('div', 'course-card-list');
  [
    ['Webvariante', 'Webvariante', 'web', releaseKeyForDay(day, 'web')],
    ['Aufgabenuebersicht', 'Aufgabenuebersicht', 'tasks', releaseKeyForDay(day, 'tasks')],
    ['Quiz 25', 'Quiz', 'quiz25', releaseKeyForDay(day, 'quiz25')],
    ['Quiz 50', 'Quiz', 'quiz50', releaseKeyForDay(day, 'quiz50')]
  ].forEach(([title, kind, fileKey, releaseKey]) => {
    list.appendChild(createMaterialReleaseCard(`${releaseLabels[day.releaseKey]} - ${title}`, kind, fileFrom(day, fileKey), releaseKey));
  });
  section.appendChild(list);
  dayDetails.appendChild(section);
}

function createSolutionReleaseCard(task) {
  const release = taskRelease(task);
  const card = createElement('article', 'solution-release-card');
  card.dataset.taskId = task.id;
  card.appendChild(createElement('span', 'task-id', task.id));
  card.appendChild(createElement('h4', '', task.title));
  card.appendChild(createElement('p', 'task-card-meta', `Tag ${task.day} Â· ${taskAreaLabel(task)} Â· ${taskDifficultyLabel(task)}`));
  const actions = createElement('div', 'task-card-actions');
  if (task.solutionFile) {
    actions.appendChild(taskActionButton('Loesung ansehen', () => loadContent(`Loesung: ${task.title}`, 'Loesung', taskFileInfo(task, 'solution'))));
  }
  actions.appendChild(createTaskToggle('Loesung', release.solutionUnlocked, (checked) => saveSingleTaskRelease(task.id, { solutionUnlocked: checked })));
  card.appendChild(actions);
  return card;
}

function createSolutionList(tasks) {
  const list = createElement('div', 'task-release-list');
  if (!tasks.length) {
    list.appendChild(createElement('p', 'muted task-empty', 'Keine Loesungen in diesem Bereich.'));
    return list;
  }
  tasks.forEach((task) => list.appendChild(createSolutionReleaseCard(task)));
  return list;
}

function renderSolutionDifficultyGroup(target, day, label, difficulty, dayTasks) {
  const id = `solution-day-${day}-general-${difficulty}`;
  const filter = { day, category: 'allgemein', difficulty };
  const tasks = dayTasks.filter((task) => taskMatchesGroup(task, { filter }));
  const details = createTaskDetails(id, 'task-subgroup', day === 1 && difficulty === 'normal');
  appendSummary(details, label, tasks.length);
  details.appendChild(createGroupActions({ ...filter }));
  details.appendChild(createSolutionList(tasks));
  target.appendChild(details);
}

function renderProjectSolutionGroup(target, day, project, dayTasks) {
  const label = project === 'akkordeon' ? 'Projektloesungen Akkordeon' : 'Projektloesungen Wunderland';
  const id = `solution-day-${day}-project-${project}`;
  const filter = { day, category: 'projekt', project };
  const tasks = dayTasks.filter((task) => taskMatchesGroup(task, { filter }));
  const details = createTaskDetails(id, 'task-area-group');
  appendSummary(details, label, tasks.length);
  details.appendChild(createGroupActions(filter));
  details.appendChild(createSolutionList(tasks));
  target.appendChild(details);
}

function renderDaySolutions(dayDetails, day, dayTasks) {
  const dayId = dayNumber(day);
  const section = createCourseDetails(`course-day-${dayId}-solutions`, 'course-subsection');
  appendCourseSummary(section, 'Loesungen', `${dayTasks.length} Eintraege`);
  const actions = createElement('div', 'task-group-actions task-day-actions');
  actions.appendChild(createReleaseToggle('Loesungsuebersicht Teilnehmer', releaseKeyForDay(day, 'solutions')));
  actions.appendChild(createCompactAction('Alle Loesungen freigeben', () => bulkUpdateByFilter({ day: dayId }, { solutionUnlocked: true })));
  actions.appendChild(createCompactAction('Alle Loesungen sperren', () => bulkUpdateByFilter({ day: dayId }, { solutionUnlocked: false }), true));
  section.appendChild(actions);

  const overview = createElement('div', 'course-card-list');
  overview.appendChild(createMaterialReleaseCard(`${releaseLabels[day.releaseKey]} - Loesungsuebersicht`, 'Loesungen', fileFrom(day, 'solutions'), releaseKeyForDay(day, 'solutions')));
  section.appendChild(overview);

  const generalDetails = createTaskDetails(`solution-day-${dayId}-general`, 'task-area-group', dayId === 1);
  appendSummary(generalDetails, 'Allgemeine Loesungen', dayTasks.filter((task) => task.category === 'allgemein').length);
  generalDetails.appendChild(createGroupActions({ day: dayId, category: 'allgemein' }));
  renderSolutionDifficultyGroup(generalDetails, dayId, 'normal', 'normal', dayTasks);
  renderSolutionDifficultyGroup(generalDetails, dayId, 'schwer', 'schwer', dayTasks);
  section.appendChild(generalDetails);

  renderProjectSolutionGroup(section, dayId, 'akkordeon', dayTasks);
  renderProjectSolutionGroup(section, dayId, 'wunderland', dayTasks);
  dayDetails.appendChild(section);
}

function renderDayTasks(dayDetails, day, dayTasks) {
  const dayId = dayNumber(day);
  const section = createCourseDetails(`course-day-${dayId}-tasks`, 'course-subsection', dayId === 1);
  appendCourseSummary(section, 'Aufgaben', `${dayTasks.length} Aufgaben`);

  const dayActions = createElement('div', 'task-group-actions task-day-actions');
  dayActions.appendChild(createTaskToggle('Tages-Aufgabenbereich', state.releases[taskDayReleaseKey(dayId)] === true, (checked) => saveDayTaskAreaRelease(dayId, checked)));
  dayActions.appendChild(createCompactAction('Alle Aufgaben freigeben', () => bulkUpdateByFilter({ day: dayId }, { taskUnlocked: true })));
  dayActions.appendChild(createCompactAction('Alle Aufgaben sperren', () => bulkUpdateByFilter({ day: dayId }, { taskUnlocked: false }), true));
  dayActions.appendChild(createCompactAction('Alle Loesungen sperren', () => bulkUpdateByFilter({ day: dayId }, { solutionUnlocked: false }), true));
  section.appendChild(dayActions);

  const generalDetails = createTaskDetails(`task-day-${dayId}-general`, 'task-area-group', dayId === 1);
  appendSummary(generalDetails, 'Allgemeine Aufgaben', dayTasks.filter((task) => task.category === 'allgemein').length);
  generalDetails.appendChild(createGroupActions({ day: dayId, category: 'allgemein' }));
  renderTaskDifficultyGroup(generalDetails, dayId, 'normal', 'normal', dayTasks);
  renderTaskDifficultyGroup(generalDetails, dayId, 'schwer', 'schwer', dayTasks);
  section.appendChild(generalDetails);

  renderProjectTaskGroup(section, dayId, 'akkordeon', dayTasks);
  renderProjectTaskGroup(section, dayId, 'wunderland', dayTasks);
  dayDetails.appendChild(section);
}

function renderCourseDay(outline, day) {
  const dayId = dayNumber(day);
  const dayTasks = state.taskPackages.tasks.filter((task) => task.day === dayId);
  const details = createCourseDetails(`course-day-${dayId}`, 'course-day', dayId === 1);
  appendCourseSummary(details, releaseLabels[day.releaseKey] || `Tag ${dayId}`, day.theme);
  details.appendChild(createElement('p', 'course-day-intro', day.title));
  renderDayMaterials(details, day);
  renderDayTasks(details, day, dayTasks);
  renderDaySolutions(details, day, dayTasks);
  outline.appendChild(details);
}

async function renderCourseTools(outline) {
  const details = createCourseDetails('course-tools', 'course-tools');
  appendCourseSummary(details, 'Tools', 'Kursserver, Settings, Testberichte und Werkzeuge');
  const toolsBody = createElement('div', 'tools-section');
  const participantsSlot = createElement('div', 'participant-status-slot');
  participantsSlot.dataset.participantStatusSlot = '';
  toolsBody.appendChild(participantsSlot);
  await renderParticipants(participantsSlot);

  const systemCard = createElement('article', 'course-card');
  systemCard.dataset.accent = 'blue';
  systemCard.appendChild(createElement('span', 'pill', 'App'));
  systemCard.appendChild(createElement('h3', '', 'Dozenten-Settings'));
  systemCard.appendChild(createElement('p', '', 'Monitorwahl, Testbericht und lokale Kursdaten.'));
  const systemActions = createElement('div', 'button-row');
  [
    ['Settings oeffnen', 'openSettings'],
    ['Testbericht erstellen', 'createReport'],
    ['Berichtsordner', 'openReportDir'],
    ['Kursdatenordner', 'openDataDir']
  ].forEach(([label, action]) => {
    const button = createElement('button', 'card-button', label);
    button.type = 'button';
    button.dataset[action] = '';
    systemActions.appendChild(button);
  });
  systemCard.appendChild(systemActions);
  toolsBody.appendChild(systemCard);

  const toolsGrid = createElement('div', 'tools-grid');
  const toolItems = [
    ...contentGroups.getTeacherTools(state.catalog),
    ...state.catalog.teacher.quickLinks.filter((item) => item.kind !== 'Tool'),
    ...state.catalog.teacher.guides
  ];
  toolItems.forEach((item) => toolsGrid.appendChild(createCard(item, { showReleaseState: Boolean(item.releaseKey) })));
  toolsBody.appendChild(toolsGrid);
  details.appendChild(toolsBody);
  outline.appendChild(details);
}

async function renderDashboard() {
  const renderId = ++state.dashboardRenderId;
  const panel = byData('[data-panel="dashboard"]');

  const outline = createElement('div', 'course-outline');
  contentGroups.getTeacherDays(state.catalog).forEach((day) => renderCourseDay(outline, day));
  await renderCourseTools(outline);
  if (renderId !== state.dashboardRenderId) {
    return;
  }
  clearElement(panel);
  panel.appendChild(outline);
}

async function refreshParticipantStatusCard() {
  const slot = byData('[data-participant-status-slot]');
  if (!slot) {
    return;
  }
  await renderParticipants(slot);
}

function formatBreakRange(breakData) {
  return `${breakData.start} - ${breakData.end} Uhr`;
}

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
}

function remainingSecondsUntil(timeText, now = new Date()) {
  const [hours, minutes] = String(timeText).split(':').map(Number);
  const endDate = new Date(now);
  endDate.setHours(hours, minutes, 0, 0);
  return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 1000));
}

function isBreakOverlayAllowed() {
  const settingsDialog = byData('[data-settings-dialog]');
  return state.activeView === 'dashboard' && (!settingsDialog || settingsDialog.hidden);
}

function updateBreakOverlayContent(breakData, now = new Date()) {
  byData('[data-break-title]').textContent = 'Achtung Pause';
  byData('[data-break-label]').textContent = breakData.label;
  byData('[data-break-time]').textContent = formatBreakRange(breakData);
  byData('[data-break-next]').textContent = `Weiter geht es um ${breakData.end} Uhr.`;
  byData('[data-break-remaining]').textContent = `Restzeit: ${formatRemaining(remainingSecondsUntil(breakData.end, now))}`;
}

function showBreakOverlay(breakData, now = new Date()) {
  const overlay = byData('[data-break-overlay]');
  const card = byData('[data-break-card]');
  updateBreakOverlayContent(breakData, now);
  if (!overlay || !card || !overlay.hidden) {
    return;
  }
  state.breakPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.hidden = false;
  window.requestAnimationFrame(() => card.focus());
}

function hideBreakOverlay(restoreFocus = true) {
  const overlay = byData('[data-break-overlay]');
  if (!overlay || overlay.hidden) {
    return;
  }
  overlay.hidden = true;
  if (restoreFocus && state.breakPreviousFocus?.focus) {
    state.breakPreviousFocus.focus();
  }
  state.breakPreviousFocus = null;
}

function showBreakEndedToast() {
  const toast = byData('[data-break-toast]');
  if (!toast) {
    return;
  }
  toast.hidden = false;
  window.clearTimeout(state.breakToastTimer);
  state.breakToastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function closeBreakPopup(mode = 'close') {
  if (!state.breakPopup.activeBreakId || !window.LFZQ8aCourseSchedule?.dismissBreakPopup) {
    hideBreakOverlay();
    return;
  }
  state.breakPopup = window.LFZQ8aCourseSchedule.dismissBreakPopup(
    state.breakPopup,
    state.breakPopup.activeBreakId,
    mode
  );
  hideBreakOverlay();
}

function tickBreakPopup(now = new Date()) {
  const schedule = window.LFZQ8aCourseSchedule;
  if (!schedule?.updateBreakPopupState) {
    return;
  }
  const result = schedule.updateBreakPopupState(state.breakPopup, now);
  state.breakPopup = result.state;

  if (result.endedBreak) {
    hideBreakOverlay(false);
    showBreakEndedToast();
    return;
  }

  if (!result.activeBreak || !result.shouldShow || !isBreakOverlayAllowed()) {
    hideBreakOverlay(false);
    return;
  }

  showBreakOverlay(result.activeBreak, now);
  updateBreakOverlayContent(result.activeBreak, now);
}

function focusableBreakElements() {
  return [...byData('[data-break-overlay]')?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []]
    .filter((element) => !element.disabled && element.offsetParent !== null);
}

function trapBreakOverlayFocus(event) {
  const overlay = byData('[data-break-overlay]');
  if (!overlay || overlay.hidden) {
    return;
  }
  if (event.key === 'Escape') {
    closeBreakPopup('close');
    event.preventDefault();
    return;
  }
  if (event.key !== 'Tab') {
    return;
  }
  const focusable = focusableBreakElements();
  if (!focusable.length) {
    byData('[data-break-card]')?.focus();
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === last) {
    first.focus();
    event.preventDefault();
  }
}

function initBreakPopup() {
  tickBreakPopup();
  window.clearInterval(state.breakPopupTimer);
  state.breakPopupTimer = window.setInterval(() => tickBreakPopup(), 1000);
  document.addEventListener('keydown', trapBreakOverlayFocus);
}

function taskRelease(task) {
  return {
    taskUnlocked: task.taskUnlocked === true || state.taskReleases[task.id]?.taskUnlocked === true,
    solutionUnlocked: task.solutionUnlocked === true || state.taskReleases[task.id]?.solutionUnlocked === true
  };
}

function taskMatchesFilters(task) {
  const release = taskRelease(task);
  const filters = state.taskFilters;
  const query = filters.query.trim().toLowerCase();
  const statusMatches = !filters.status
    || (filters.status === 'task-unlocked' && release.taskUnlocked)
    || (filters.status === 'task-locked' && !release.taskUnlocked)
    || (filters.status === 'solution-unlocked' && release.solutionUnlocked)
    || (filters.status === 'solution-locked' && !release.solutionUnlocked);
  return (!filters.project || task.project === filters.project)
    && (!filters.category || task.category === filters.category)
    && (!filters.packageType || task.packageType === filters.packageType)
    && (!filters.day || task.day === Number(filters.day))
    && (!filters.difficulty || task.difficulty === filters.difficulty)
    && statusMatches
    && (!query || `${task.id} ${task.number} ${task.title} ${task.shortInfo || ''} ${(task.tags || []).join(' ')} ${task.packageLabel}`.toLowerCase().includes(query));
}

function createFilterSelect(label, key, options) {
  const wrapper = createElement('label', 'task-filter');
  wrapper.appendChild(createElement('span', '', label));
  const select = document.createElement('select');
  select.dataset.taskFilter = key;
  options.forEach((optionData) => {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.label;
    option.selected = optionData.value === state.taskFilters[key];
    select.appendChild(option);
  });
  wrapper.appendChild(select);
  return wrapper;
}

function renderPackageSummary(card) {
  const grid = createElement('div', 'task-package-grid');
  state.taskPackages.packages.forEach((pkg) => {
    const tasks = state.taskPackages.tasks.filter((task) => (
      task.category === pkg.category
      && (pkg.project === undefined || pkg.project === null || task.project === pkg.project)
    ));
    const taskCount = tasks.filter((task) => taskRelease(task).taskUnlocked).length;
    const solutionCount = tasks.filter((task) => taskRelease(task).solutionUnlocked).length;
    const item = createElement('div', 'task-package-card');
    item.appendChild(createElement('strong', '', pkg.label));
    item.appendChild(createElement('span', '', `${taskCount} von ${tasks.length} Aufgaben freigegeben`));
    item.appendChild(createElement('span', '', `${solutionCount} von ${tasks.length} Loesungen freigegeben`));
    grid.appendChild(item);
  });
  card.appendChild(grid);
}

function taskDayReleaseKey(day) {
  return `tag_${String(day).padStart(2, '0')}_tasks`;
}

function taskAreaLabel(task) {
  if (task.category === 'allgemein') {
    return 'Allgemeine Aufgaben';
  }
  return task.project === 'akkordeon' ? 'Projektaufgaben Akkordeon' : 'Projektaufgaben Wunderland';
}

function taskDifficultyLabel(task) {
  return task.category === 'allgemein' ? task.difficulty : 'Projekt';
}

function createTaskDetails(id, className, defaultOpen = false) {
  const details = createElement('details', className);
  details.dataset.taskGroupId = id;
  details.open = state.taskOpenSections.has(id) || (defaultOpen && !state.taskClosedSections.has(id));
  details.addEventListener('toggle', () => {
    if (details.open) {
      state.taskOpenSections.add(id);
      state.taskClosedSections.delete(id);
    } else {
      state.taskOpenSections.delete(id);
      state.taskClosedSections.add(id);
    }
  });
  return details;
}

function appendSummary(details, title, count, extraClass = '') {
  const summary = createElement('summary', `task-group-summary ${extraClass}`.trim());
  summary.appendChild(createElement('span', '', title));
  summary.appendChild(createElement('small', '', `${count} Aufgaben`));
  details.appendChild(summary);
}

function createCompactAction(label, handler, danger = false) {
  const button = createElement('button', `task-compact-button${danger ? ' danger-button' : ''}`, label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function createGroupActions(filter) {
  const actions = createElement('div', 'task-group-actions');
  [
    ['Aufgaben freigeben', { taskUnlocked: true }],
    ['Aufgaben sperren', { taskUnlocked: false }, true],
    ['Loesungen freigeben', { solutionUnlocked: true }],
    ['Loesungen sperren', { solutionUnlocked: false }, true]
  ].forEach(([label, values, danger]) => {
    actions.appendChild(createCompactAction(label, () => bulkUpdateByFilter(filter, values), danger));
  });
  return actions;
}

function createTaskToggle(label, checked, handler) {
  const wrapper = createElement('label', 'task-toggle');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('aria-label', `${label} ${checked ? 'sperren' : 'freigeben'}`);
  input.addEventListener('change', () => handler(input.checked));
  wrapper.appendChild(createElement('span', 'task-toggle-label', label));
  wrapper.appendChild(input);
  wrapper.appendChild(createElement('span', `status-badge ${checked ? 'is-open' : 'is-locked'}`, checked ? 'frei' : 'gesperrt'));
  return wrapper;
}

function createTaskReleaseCard(task) {
  const release = taskRelease(task);
  const card = createElement('article', 'task-release-card');
  card.dataset.taskId = task.id;
  card.appendChild(createElement('span', 'task-id', task.id));
  card.appendChild(createElement('h4', '', task.title));
  card.appendChild(createElement('p', 'task-short-info', task.shortInfo || 'Tagesaufgabe aus dem bestehenden Aufgabenpaket.'));
  card.appendChild(createElement('p', 'task-card-meta', `Tag ${task.day} · ${taskAreaLabel(task)} · ${taskDifficultyLabel(task)} · ca. ${task.estimatedMinutes} Min.`));
  card.appendChild(createElement('p', 'task-card-tags', `Tags: ${(task.tags || []).join(', ')}`));

  const actions = createElement('div', 'task-card-actions');
  actions.appendChild(taskActionButton('Aufgabe ansehen', () => loadContent(task.title, 'Aufgabe', taskFileInfo(task, 'task'))));
  if (task.solutionFile) {
    actions.appendChild(taskActionButton('Loesung ansehen', () => loadContent(`Loesung: ${task.title}`, 'Loesung', taskFileInfo(task, 'solution'))));
  }
  actions.appendChild(createTaskToggle('Aufgabe', release.taskUnlocked, (checked) => saveSingleTaskRelease(task.id, { taskUnlocked: checked })));
  actions.appendChild(createTaskToggle('Loesung', release.solutionUnlocked, (checked) => saveSingleTaskRelease(task.id, { solutionUnlocked: checked })));
  card.appendChild(actions);
  return card;
}

function taskMatchesGroup(task, group) {
  return Object.entries(group.filter).every(([key, value]) => task[key] === value);
}

function createTaskList(tasks) {
  const list = createElement('div', 'task-release-list');
  if (!tasks.length) {
    list.appendChild(createElement('p', 'muted task-empty', 'Keine Aufgaben passend zum Filter.'));
    return list;
  }
  tasks.forEach((task) => list.appendChild(createTaskReleaseCard(task)));
  return list;
}

function renderTaskDifficultyGroup(dayDetails, day, label, difficulty, visibleTasks) {
  const id = `task-day-${day}-general-${difficulty}`;
  const filter = { day, category: 'allgemein', difficulty };
  const tasks = visibleTasks.filter((task) => taskMatchesGroup(task, { filter }));
  const details = createTaskDetails(id, 'task-subgroup', day === 1 && difficulty === 'normal');
  appendSummary(details, label, tasks.length);
  details.appendChild(createGroupActions(filter));
  details.appendChild(createTaskList(tasks));
  dayDetails.appendChild(details);
}

function renderProjectTaskGroup(dayDetails, day, project, visibleTasks) {
  const projectLabel = project === 'akkordeon' ? 'Projektaufgaben Akkordeon' : 'Projektaufgaben Wunderland';
  const id = `task-day-${day}-project-${project}`;
  const filter = { day, category: 'projekt', project };
  const tasks = visibleTasks.filter((task) => taskMatchesGroup(task, { filter }));
  const details = createTaskDetails(id, 'task-area-group');
  appendSummary(details, projectLabel, tasks.length);
  details.appendChild(createGroupActions(filter));
  details.appendChild(createTaskList(tasks));
  dayDetails.appendChild(details);
}

function renderTaskDayGroup(target, day, visibleTasks) {
  const dayTasks = visibleTasks.filter((task) => task.day === day);
  const dayDetails = createTaskDetails(`task-day-${day}`, 'task-day-group', day === 1);
  const summary = createElement('summary', 'task-day-summary');
  summary.appendChild(createElement('span', '', `Tag ${day}`));
  summary.appendChild(createElement('small', '', `${dayTasks.length} Aufgaben sichtbar`));
  dayDetails.appendChild(summary);

  const dayActions = createElement('div', 'task-group-actions task-day-actions');
  const releaseKey = taskDayReleaseKey(day);
  dayActions.appendChild(createTaskToggle('Tages-Aufgabenbereich', state.releases[releaseKey] === true, (checked) => saveDayTaskAreaRelease(day, checked)));
  [
    ['Alle Aufgaben freigeben', { taskUnlocked: true }],
    ['Alle Aufgaben sperren', { taskUnlocked: false }, true],
    ['Alle Loesungen freigeben', { solutionUnlocked: true }],
    ['Alle Loesungen sperren', { solutionUnlocked: false }, true]
  ].forEach(([label, values, danger]) => {
    dayActions.appendChild(createCompactAction(label, () => bulkUpdateByFilter({ day }, values), danger));
  });
  dayDetails.appendChild(dayActions);

  const generalDetails = createTaskDetails(`task-day-${day}-general`, 'task-area-group', day === 1);
  appendSummary(generalDetails, 'Allgemeine Aufgaben', dayTasks.filter((task) => task.category === 'allgemein').length);
  generalDetails.appendChild(createGroupActions({ day, category: 'allgemein' }));
  renderTaskDifficultyGroup(generalDetails, day, 'normal', 'normal', dayTasks);
  renderTaskDifficultyGroup(generalDetails, day, 'schwer', 'schwer', dayTasks);
  dayDetails.appendChild(generalDetails);

  renderProjectTaskGroup(dayDetails, day, 'akkordeon', dayTasks);
  renderProjectTaskGroup(dayDetails, day, 'wunderland', dayTasks);
  target.appendChild(dayDetails);
}

function renderTaskReleaseManager(targetPanel) {
  const card = createElement('article', 'wide-card task-manager');
  card.dataset.dashboardSection = 'tasks';
  card.appendChild(createElement('span', 'pill', 'Aufgabenverwaltung'));
  card.appendChild(createElement('h2', '', 'Aufgaben nach Tagen freigeben'));
  card.appendChild(createElement('p', '', 'Die neue Aufgabenstruktur ist pro Tag in allgemeine Aufgaben sowie Projektaufgaben Akkordeon und Wunderland gegliedert. Aufgaben und Loesungen bleiben getrennt steuerbar.'));
  renderPackageSummary(card);

  const filters = createElement('div', 'task-filters');
  filters.appendChild(createFilterSelect('Bereich', 'category', [
    { value: '', label: 'Alle Bereiche' },
    { value: 'allgemein', label: 'Allgemein' },
    { value: 'projekt', label: 'Projekt' }
  ]));
  filters.appendChild(createFilterSelect('Projekt', 'project', [
    { value: '', label: 'Alle / ohne Projekt' },
    { value: 'akkordeon', label: 'Akkordeon' },
    { value: 'wunderland', label: 'Wunderland' }
  ]));
  filters.appendChild(createFilterSelect('Pakettyp', 'packageType', [
    { value: '', label: 'Alle Pakete' },
    { value: 'allgemein', label: 'Allgemeine Aufgaben' },
    { value: 'hauptaufgaben', label: 'Hauptaufgaben Tag 1-5' },
    { value: 'zusatzaufgaben', label: 'Zusatzaufgaben Tag 1-5' },
    { value: 'projekt', label: 'Projektpaket' }
  ]));
  filters.appendChild(createFilterSelect('Tag', 'day', [
    { value: '', label: 'Alle Tage' },
    ...[1, 2, 3, 4, 5].map((day) => ({ value: String(day), label: `Tag ${day}` }))
  ]));
  filters.appendChild(createFilterSelect('Schwierigkeit', 'difficulty', [
    { value: '', label: 'Alle Stufen' },
    { value: 'normal', label: 'Normal' },
    { value: 'schwer', label: 'Schwer' }
  ]));
  filters.appendChild(createFilterSelect('Status', 'status', [
    { value: '', label: 'Alle Status' },
    { value: 'task-unlocked', label: 'Aufgabe freigegeben' },
    { value: 'task-locked', label: 'Aufgabe gesperrt' },
    { value: 'solution-unlocked', label: 'Loesung freigegeben' },
    { value: 'solution-locked', label: 'Loesung gesperrt' }
  ]));
  const queryLabel = createElement('label', 'task-filter task-search');
  queryLabel.appendChild(createElement('span', '', 'Suche'));
  const query = document.createElement('input');
  query.type = 'search';
  query.placeholder = 'Aufgabentitel oder Nummer';
  query.value = state.taskFilters.query;
  query.dataset.taskFilter = 'query';
  queryLabel.appendChild(query);
  filters.appendChild(queryLabel);
  card.appendChild(filters);

  const bulkActions = createElement('div', 'button-row task-bulk-actions compact-only');
  [
    ['Gefilterte Aufgaben freigeben', { taskUnlocked: true }],
    ['Gefilterte Aufgaben sperren', { taskUnlocked: false }],
    ['Gefilterte Loesungen freigeben', { solutionUnlocked: true }],
    ['Gefilterte Loesungen sperren', { solutionUnlocked: false }]
  ].forEach(([label, values]) => {
    const button = createElement('button', 'card-button', label);
    button.type = 'button';
    button.addEventListener('click', () => bulkUpdateVisibleTasks(values));
    bulkActions.appendChild(button);
  });
  const releaseDay = createElement('button', 'card-button', 'Alle Aufgaben dieses Tages freigeben');
  releaseDay.type = 'button';
  releaseDay.disabled = !state.taskFilters.day;
  releaseDay.addEventListener('click', () => bulkUpdateByFilter({ day: state.taskFilters.day }, { taskUnlocked: true }));
  bulkActions.appendChild(releaseDay);
  const releaseProject = createElement('button', 'card-button', 'Alle Aufgaben dieses Projekts freigeben');
  releaseProject.type = 'button';
  releaseProject.disabled = !state.taskFilters.project;
  releaseProject.addEventListener('click', () => bulkUpdateByFilter({ project: state.taskFilters.project }, { taskUnlocked: true }));
  bulkActions.appendChild(releaseProject);
  const reset = createElement('button', 'card-button danger-button', 'Alles sperren');
  reset.type = 'button';
  reset.addEventListener('click', resetAllTaskReleases);
  bulkActions.appendChild(reset);
  card.appendChild(bulkActions);

  const visibleTasks = state.taskPackages.tasks.filter(taskMatchesFilters);
  if (!visibleTasks.length) {
    card.appendChild(createElement('p', 'muted task-empty', 'Keine Aufgaben passend zum Filter.'));
    targetPanel.appendChild(card);
    return;
  }
  const grouped = createElement('div', 'task-group-tree');
  [1, 2, 3, 4, 5]
    .filter((day) => !state.taskFilters.day || Number(state.taskFilters.day) === day)
    .forEach((day) => renderTaskDayGroup(grouped, day, visibleTasks));
  card.appendChild(grouped);
  targetPanel.appendChild(card);
}

function taskActionButton(label, handler) {
  const button = createElement('button', 'small-button', label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

async function refreshTaskPackages() {
  state.taskPackages = await window.lfzq8aDesktop.getTaskPackages();
  state.taskReleases = Object.fromEntries(state.taskPackages.tasks.map((task) => [task.id, {
    taskUnlocked: task.taskUnlocked === true,
    solutionUnlocked: task.solutionUnlocked === true
  }]));
}

async function saveSingleTaskRelease(taskId, release) {
  state.taskReleases = await window.lfzq8aDesktop.saveTaskRelease(taskId, release);
  await refreshTaskPackages();
  await renderDashboard();
}

async function bulkUpdateVisibleTasks(values) {
  state.taskReleases = await window.lfzq8aDesktop.bulkUpdateTaskReleases({
    category: state.taskFilters.category || undefined,
    project: state.taskFilters.project || undefined,
    packageType: state.taskFilters.packageType || undefined,
    day: state.taskFilters.day || undefined,
    difficulty: state.taskFilters.difficulty || undefined
  }, values);
  await refreshTaskPackages();
  await renderDashboard();
}

async function bulkUpdateByFilter(filter, values) {
  state.taskReleases = await window.lfzq8aDesktop.bulkUpdateTaskReleases(filter, values);
  await refreshTaskPackages();
  await renderDashboard();
}

async function saveDayTaskAreaRelease(day, enabled) {
  state.releases = await window.lfzq8aDesktop.saveParticipantReleases({
    [taskDayReleaseKey(day)]: enabled
  });
  await renderDashboard();
}

async function resetAllTaskReleases() {
  state.taskReleases = await window.lfzq8aDesktop.resetTaskReleases();
  await refreshTaskPackages();
  await renderDashboard();
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
  materialReleaseSections.forEach((sectionData, sectionIndex) => {
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
  state.taskPackages = courseState.taskPackages || { packages: [], tasks: [] };
  state.taskReleases = courseState.taskReleases || {};
  state.language = courseState.settings?.teacherLanguage || 'de';
  state.translations = courseState.translations || {};
  state.activeView = getInitialView();
  applyTranslations();
  updateProfileEntry();
  showView(state.activeView);
  await renderAll();
  initBreakPopup();
  window.lfzq8aDesktop.onParticipantReleasesChanged?.(handleParticipantReleasesChanged);
  window.lfzq8aDesktop.onTaskReleasesChanged?.(async (releases) => {
    state.taskReleases = releases || {};
    await refreshTaskPackages();
    await renderDashboard();
  });
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
    hideBreakOverlay(false);
  }

  if (event.target.closest('[data-close-settings]')) {
    closeSettingsDialog();
    tickBreakPopup();
  }

  if (event.target.closest('[data-create-report]')) {
    createReportFromSettings();
  }

  if (event.target.closest('[data-open-report-dir]')) {
    window.lfzq8aDesktop.openTestReportDir();
  }

  if (event.target.closest('[data-break-close]')) {
    closeBreakPopup('close');
  }

  if (event.target.closest('[data-break-hide]')) {
    closeBreakPopup('hide-until-end');
  }
});

document.addEventListener('input', (event) => {
  const filter = event.target.closest('[data-task-filter]');
  if (!filter) {
    return;
  }
  state.taskFilters[filter.dataset.taskFilter] = filter.value;
  renderDashboard();
});

document.addEventListener('change', (event) => {
  const filter = event.target.closest('[data-task-filter]');
  if (!filter) {
    return;
  }
  state.taskFilters[filter.dataset.taskFilter] = filter.value;
  renderDashboard();
});

byData('[data-settings-form]').addEventListener('submit', saveSettingsFromDialog);

setInterval(() => {
  if (state.activeView === 'dashboard') {
    refreshParticipantStatusCard();
  }
}, 5000);

loadInitialState().catch((error) => {
  document.body.innerHTML = `<main class="workspace"><h1>Dozentenview konnte nicht geladen werden</h1><p>${error.message}</p></main>`;
});
