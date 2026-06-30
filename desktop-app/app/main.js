const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const contentFile = path.join(projectRoot, 'uebersicht_html_tags_css_only_dozenteninfo.html');
const preloadFile = path.join(__dirname, 'preload.js');
const wizardFile = path.join(__dirname, 'renderer', 'wizard.html');

let mainWindow = null;
let teacherWindow = null;

function getDataDir() {
  return path.join(app.getPath('userData'), 'data');
}

function getSettingsPath() {
  return path.join(getDataDir(), 'settings.json');
}

function getHistoryPath() {
  return path.join(getDataDir(), 'history.json');
}

function ensureDataFiles() {
  fs.mkdirSync(getDataDir(), { recursive: true });
  if (!fs.existsSync(getSettingsPath())) {
    writeJson(getSettingsPath(), {
      configured: false,
      monitorIndex: 1,
      openTeacherOnSecondMonitor: true
    });
  }
  if (!fs.existsSync(getHistoryPath())) {
    writeJson(getHistoryPath(), []);
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function getSettings() {
  ensureDataFiles();
  return readJson(getSettingsPath(), {
    configured: false,
    monitorIndex: 1,
    openTeacherOnSecondMonitor: true
  });
}

function saveSettings(nextSettings) {
  const current = getSettings();
  const merged = {
    ...current,
    ...nextSettings,
    configured: true
  };
  writeJson(getSettingsPath(), merged);
  return merged;
}

function getDisplaySummaries() {
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index,
    label: index === 0 ? 'Monitor 1' : `Monitor ${index + 1}`,
    primary: display.id === screen.getPrimaryDisplay().id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor
  }));
}

function getTargetDisplay() {
  const displays = screen.getAllDisplays();
  const settings = getSettings();
  return displays[settings.monitorIndex] || displays[1] || screen.getPrimaryDisplay();
}

function getMainDisplay() {
  return screen.getPrimaryDisplay();
}

function createWindowOptions(display, extra = {}) {
  const area = display.workArea || display.bounds;
  return {
    x: area.x,
    y: area.y,
    width: Math.max(900, Math.floor(area.width * 0.95)),
    height: Math.max(700, Math.floor(area.height * 0.95)),
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: '#f3f8fb',
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false
    },
    ...extra
  };
}

function createWizardWindow() {
  const display = getMainDisplay();
  mainWindow = new BrowserWindow(createWindowOptions(display, {
    title: 'LFZQ8a Einrichtung',
    width: 1040,
    height: 760
  }));

  mainWindow.loadFile(wizardFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function createWorkshopWindow() {
  const display = getMainDisplay();
  mainWindow = new BrowserWindow(createWindowOptions(display, {
    title: 'LFZQ8a Workshop'
  }));

  mainWindow.loadFile(contentFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openTeacherInfo(url);
    return { action: 'deny' };
  });
}

function openTeacherInfo(url) {
  const display = getTargetDisplay();
  const area = display.workArea || display.bounds;
  const options = createWindowOptions(display, {
    title: 'LFZQ8a Dozenteninfo',
    width: area.width,
    height: area.height,
    minWidth: 760,
    minHeight: 600
  });

  if (!teacherWindow || teacherWindow.isDestroyed()) {
    teacherWindow = new BrowserWindow(options);
    teacherWindow.once('ready-to-show', () => teacherWindow.show());
  } else {
    teacherWindow.setBounds({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height
    });
  }

  teacherWindow.loadURL(url);
  teacherWindow.focus();
  addHistoryEntry({
    type: 'teacher-info',
    title: decodeURIComponent((new URL(url)).hash.replace('#', '')) || 'Dozenteninfo',
    target: url
  });
}

function addHistoryEntry(entry) {
  ensureDataFiles();
  const history = readJson(getHistoryPath(), []);
  history.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...entry
  });
  writeJson(getHistoryPath(), history.slice(0, 500));
}

function resetHistory() {
  ensureDataFiles();
  writeJson(getHistoryPath(), []);
  return [];
}

ipcMain.handle('setup:get-state', () => {
  ensureDataFiles();
  return {
    settings: getSettings(),
    displays: getDisplaySummaries(),
    history: readJson(getHistoryPath(), []),
    contentFile
  };
});

ipcMain.handle('setup:save', (event, settings) => saveSettings(settings));

ipcMain.handle('setup:start-workshop', () => {
  saveSettings({ configured: true });
  const setupWindow = mainWindow;
  createWorkshopWindow();
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.close();
  }
});

ipcMain.handle('history:list', () => {
  ensureDataFiles();
  return readJson(getHistoryPath(), []);
});

ipcMain.handle('history:add', (event, entry) => {
  addHistoryEntry(entry);
  return readJson(getHistoryPath(), []);
});

ipcMain.handle('history:reset', () => resetHistory());

ipcMain.handle('teacher:open', (event, url) => {
  openTeacherInfo(url);
  return true;
});

ipcMain.handle('app:open-data-dir', () => {
  ensureDataFiles();
  shell.openPath(getDataDir());
});

app.whenReady().then(() => {
  ensureDataFiles();
  if (getSettings().configured) {
    createWorkshopWindow();
  } else {
    createWizardWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (getSettings().configured) {
        createWorkshopWindow();
      } else {
        createWizardWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
