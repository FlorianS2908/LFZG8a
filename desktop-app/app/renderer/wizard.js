const state = {
  selectedMonitorIndex: 1,
  displays: [],
  saveLocalTestReports: true,
  includeDeviceNetworkData: false,
  teacherLanguage: 'de',
  participantLanguage: 'de',
  supportedLanguages: [],
  translations: {}
};

function t(key, replacements = {}) {
  const template = state.translations[key] || key;
  return Object.entries(replacements).reduce((text, [name, value]) => (
    text.replaceAll(`{${name}}`, String(value))
  ), template);
}

function applyTranslations() {
  document.documentElement.lang = state.teacherLanguage;
  document.title = t('setupTitle');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  });
}

function formatBounds(bounds) {
  return t('boundsText', bounds);
}

function renderLanguageSelects() {
  ['teacherLanguage', 'participantLanguage'].forEach((field) => {
    const select = document.querySelector(`#${field}`);
    select.innerHTML = '';
    state.supportedLanguages.forEach((language) => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.label;
      option.selected = state[field] === language.code;
      select.appendChild(option);
    });
  });
}

function renderDisplays() {
  const displayList = document.querySelector('#displayList');
  displayList.innerHTML = '';

  state.displays.forEach((display) => {
    const label = document.createElement('label');
    label.className = 'display-option';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'monitorIndex';
    radio.value = String(display.index);
    radio.checked = display.index === state.selectedMonitorIndex;
    radio.addEventListener('change', () => {
      state.selectedMonitorIndex = display.index;
    });

    const text = document.createElement('span');
    text.innerHTML = `<strong>${display.label}${display.primary ? ` - ${t('mainMonitor')}` : ''}</strong><small>${formatBounds(display.workArea)}</small>`;

    label.append(radio, text);
    displayList.append(label);
  });
}

function renderHistory(history) {
  const historyList = document.querySelector('#historyList');
  historyList.innerHTML = '';

  if (!history.length) {
    historyList.innerHTML = `<p class="muted">${t('noHistory')}</p>`;
    return;
  }

  history.slice(0, 12).forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const date = new Date(entry.createdAt).toLocaleString('de-DE');
    item.innerHTML = `<strong>${entry.title || entry.type}</strong><small>${date}</small>`;
    historyList.append(item);
  });
}

function renderTestReports(testReports) {
  const testReportList = document.querySelector('#testReportList');
  testReportList.innerHTML = '';

  if (!testReports.length) {
    testReportList.innerHTML = `<p class="muted">${t('noReports')}</p>`;
    return;
  }

  testReports.slice(0, 8).forEach((report) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const date = new Date(report.createdAt).toLocaleString('de-DE');
    item.innerHTML = `<strong>${report.results.status} - ${date}</strong><small>JSON: ${report.files.json}<br>HTML: ${report.files.html}</small>`;
    testReportList.append(item);
  });
}

async function loadState() {
  const setupState = await window.lfzq8aDesktop.getSetupState();
  state.displays = setupState.displays;
  state.supportedLanguages = setupState.supportedLanguages || [{ code: 'de', label: 'Deutsch' }];
  state.translations = setupState.translations || {};
  state.teacherLanguage = setupState.settings.teacherLanguage || 'de';
  state.participantLanguage = setupState.settings.participantLanguage || 'de';
  state.selectedMonitorIndex = setupState.settings.monitorIndex ?? (setupState.displays[1] ? 1 : 0);
  state.saveLocalTestReports = setupState.settings.saveLocalTestReports !== false;
  state.includeDeviceNetworkData = setupState.settings.includeDeviceNetworkData === true;
  applyTranslations();
  renderLanguageSelects();
  document.querySelector('#contentFile').textContent = setupState.contentFile;
  document.querySelector('#saveLocalTestReports').checked = state.saveLocalTestReports;
  document.querySelector('#includeDeviceNetworkData').checked = state.includeDeviceNetworkData;
  renderDisplays();
  renderHistory(setupState.history);
  renderTestReports(setupState.testReports);
}

async function saveSetup() {
  await window.lfzq8aDesktop.saveSetup({
    monitorIndex: state.selectedMonitorIndex,
    openTeacherOnSecondMonitor: true,
    teacherLanguage: document.querySelector('#teacherLanguage').value,
    participantLanguage: document.querySelector('#participantLanguage').value,
    saveLocalTestReports: document.querySelector('#saveLocalTestReports').checked,
    includeDeviceNetworkData: document.querySelector('#includeDeviceNetworkData').checked
  });
}

document.querySelector('#saveSetup').addEventListener('click', saveSetup);

document.querySelector('#teacherLanguage').addEventListener('change', async (event) => {
  state.teacherLanguage = event.target.value;
  await saveSetup();
  await loadState();
});

document.querySelector('#participantLanguage').addEventListener('change', (event) => {
  state.participantLanguage = event.target.value;
});

document.querySelector('#startWorkshop').addEventListener('click', async () => {
  await saveSetup();
  await window.lfzq8aDesktop.startWorkshop();
});

document.querySelector('#reloadHistory').addEventListener('click', async () => {
  renderHistory(await window.lfzq8aDesktop.listHistory());
});

document.querySelector('#resetHistory').addEventListener('click', async () => {
  const confirmed = window.confirm(t('resetConfirm'));
  if (confirmed) {
    renderHistory(await window.lfzq8aDesktop.resetHistory());
  }
});

document.querySelector('#createTestReport').addEventListener('click', async () => {
  await saveSetup();
  const report = await window.lfzq8aDesktop.createTestReport();
  renderTestReports(await window.lfzq8aDesktop.listTestReports());
  window.alert(t('reportSaved', report.files));
});

document.querySelector('#openTestReportDir').addEventListener('click', () => {
  window.lfzq8aDesktop.openTestReportDir();
});

document.querySelector('#openDataDir').addEventListener('click', () => {
  window.lfzq8aDesktop.openDataDir();
});

loadState();
