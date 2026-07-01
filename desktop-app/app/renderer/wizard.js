const state = {
  selectedMonitorIndex: 1,
  displays: [],
  saveLocalTestReports: true,
  includeDeviceNetworkData: false
};

function formatBounds(bounds) {
  return `${bounds.width} x ${bounds.height} bei X ${bounds.x}, Y ${bounds.y}`;
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
    text.innerHTML = `<strong>${display.label}${display.primary ? ' - Hauptmonitor' : ''}</strong><small>${formatBounds(display.workArea)}</small>`;

    label.append(radio, text);
    displayList.append(label);
  });
}

function renderHistory(history) {
  const historyList = document.querySelector('#historyList');
  historyList.innerHTML = '';

  if (!history.length) {
    historyList.innerHTML = '<p class="muted">Noch keine Unterrichtshistorie vorhanden.</p>';
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
    testReportList.innerHTML = '<p class="muted">Noch keine Testprotokolle vorhanden.</p>';
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
  state.selectedMonitorIndex = setupState.settings.monitorIndex ?? (setupState.displays[1] ? 1 : 0);
  state.saveLocalTestReports = setupState.settings.saveLocalTestReports !== false;
  state.includeDeviceNetworkData = setupState.settings.includeDeviceNetworkData === true;
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
    saveLocalTestReports: document.querySelector('#saveLocalTestReports').checked,
    includeDeviceNetworkData: document.querySelector('#includeDeviceNetworkData').checked
  });
}

document.querySelector('#saveSetup').addEventListener('click', saveSetup);

document.querySelector('#startWorkshop').addEventListener('click', async () => {
  await saveSetup();
  await window.lfzq8aDesktop.startWorkshop();
});

document.querySelector('#reloadHistory').addEventListener('click', async () => {
  renderHistory(await window.lfzq8aDesktop.listHistory());
});

document.querySelector('#resetHistory').addEventListener('click', async () => {
  const confirmed = window.confirm('Wirklich nur die Unterrichtshistorie loeschen? Inhalte und Einstellungen bleiben erhalten.');
  if (confirmed) {
    renderHistory(await window.lfzq8aDesktop.resetHistory());
  }
});

document.querySelector('#createTestReport').addEventListener('click', async () => {
  await saveSetup();
  const report = await window.lfzq8aDesktop.createTestReport();
  renderTestReports(await window.lfzq8aDesktop.listTestReports());
  window.alert(`Testprotokoll gespeichert:\nJSON: ${report.files.json}\nHTML: ${report.files.html}`);
});

document.querySelector('#openTestReportDir').addEventListener('click', () => {
  window.lfzq8aDesktop.openTestReportDir();
});

document.querySelector('#openDataDir').addEventListener('click', () => {
  window.lfzq8aDesktop.openDataDir();
});

loadState();
