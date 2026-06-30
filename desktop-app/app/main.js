const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('path');
const { createAppData } = require('./lib/app-data');
const {
  chooseTargetDisplay,
  createFullDisplayBounds,
  createWindowOptions,
  getDisplaySummaries: summarizeDisplays
} = require('./lib/display');

const projectRoot = path.resolve(__dirname, '..', '..');
const contentFile = path.join(projectRoot, 'uebersicht_html_tags_css_only_dozenteninfo.html');
const preloadFile = path.join(__dirname, 'preload.js');
const wizardFile = path.join(__dirname, 'renderer', 'wizard.html');

let mainWindow = null;
let teacherWindow = null;
let appData = null;

function getAppData() {
  if (!appData) {
    appData = createAppData(app.getPath('userData'));
  }
  return appData;
}

function getDisplaySummaries() {
  return summarizeDisplays(screen.getAllDisplays(), screen.getPrimaryDisplay());
}

function getTargetDisplay() {
  const displays = screen.getAllDisplays();
  const settings = getAppData().getSettings();
  return chooseTargetDisplay(displays, screen.getPrimaryDisplay(), settings.monitorIndex);
}

function getMainDisplay() {
  return screen.getPrimaryDisplay();
}

function getWindowOptions(display, extra = {}) {
  return createWindowOptions(display, preloadFile, extra);
}

function createWizardWindow() {
  const display = getMainDisplay();
  mainWindow = new BrowserWindow(getWindowOptions(display, {
    title: 'LFZQ8a Einrichtung',
    width: 1040,
    height: 760
  }));

  mainWindow.loadFile(wizardFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function createWorkshopWindow() {
  const display = getMainDisplay();
  mainWindow = new BrowserWindow(getWindowOptions(display, {
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
  const area = createFullDisplayBounds(display);
  const options = getWindowOptions(display, {
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
  getAppData().addHistoryEntry({
    type: 'teacher-info',
    title: decodeURIComponent((new URL(url)).hash.replace('#', '')) || 'Dozenteninfo',
    target: url
  });
}

ipcMain.handle('setup:get-state', () => {
  getAppData().ensureDataFiles();
  return {
    settings: getAppData().getSettings(),
    displays: getDisplaySummaries(),
    history: getAppData().listHistory(),
    contentFile
  };
});

ipcMain.handle('setup:save', (event, settings) => getAppData().saveSettings(settings));

ipcMain.handle('setup:start-workshop', () => {
  getAppData().saveSettings({ configured: true });
  const setupWindow = mainWindow;
  createWorkshopWindow();
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.close();
  }
});

ipcMain.handle('history:list', () => {
  return getAppData().listHistory();
});

ipcMain.handle('history:add', (event, entry) => {
  return getAppData().addHistoryEntry(entry);
});

ipcMain.handle('history:reset', () => getAppData().resetHistory());

ipcMain.handle('teacher:open', (event, url) => {
  openTeacherInfo(url);
  return true;
});

ipcMain.handle('app:open-data-dir', () => {
  getAppData().ensureDataFiles();
  shell.openPath(getAppData().dataDir);
});

app.whenReady().then(() => {
  getAppData().ensureDataFiles();
  if (getAppData().getSettings().configured) {
    createWorkshopWindow();
  } else {
    createWizardWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (getAppData().getSettings().configured) {
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
