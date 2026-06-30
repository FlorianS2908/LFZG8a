const state = {
  selectedMonitorIndex: 1,
  displays: []
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

async function loadState() {
  const setupState = await window.lfzq8aDesktop.getSetupState();
  state.displays = setupState.displays;
  state.selectedMonitorIndex = setupState.settings.monitorIndex ?? (setupState.displays[1] ? 1 : 0);
  document.querySelector('#contentFile').textContent = setupState.contentFile;
  renderDisplays();
  renderHistory(setupState.history);
}

async function saveSetup() {
  await window.lfzq8aDesktop.saveSetup({
    monitorIndex: state.selectedMonitorIndex,
    openTeacherOnSecondMonitor: true
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

document.querySelector('#openDataDir').addEventListener('click', () => {
  window.lfzq8aDesktop.openDataDir();
});

loadState();
