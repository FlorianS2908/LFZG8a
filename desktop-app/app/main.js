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
const contentFile = path.join(projectRoot, 'dozent', 'index_dozent.html');
const preloadFile = path.join(__dirname, 'preload.js');
const wizardFile = path.join(__dirname, 'renderer', 'wizard.html');
const forceWizard = process.argv.includes('--wizard') || process.argv.includes('--wizard-test');
const disableHistory = process.argv.includes('--no-history') || process.argv.includes('--wizard-test');

let mainWindow = null;
let teacherWindow = null;
let appData = null;
let isClosingAllWindows = false;
let isReplacingMainWindow = false;

function getAppData() {
  if (!appData) {
    appData = createAppData(app.getPath('userData'), { disableHistory });
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

function closeAllApplicationWindows(exceptWindow = null) {
  if (isClosingAllWindows) {
    return;
  }

  isClosingAllWindows = true;
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window !== exceptWindow && !window.isDestroyed()) {
      window.close();
    }
  });
  isClosingAllWindows = false;
}

function registerMainWindow(window) {
  mainWindow = window;
  mainWindow.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }

    if (!isReplacingMainWindow) {
      closeAllApplicationWindows(window);
    }
  });
}

function createWizardWindow() {
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'LFZQ8a Einrichtung',
    width: 1040,
    height: 760
  })));

  mainWindow.loadFile(wizardFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function createWorkshopWindow() {
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'LFZQ8a Workshop'
  })));

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
  if (!disableHistory) {
    getAppData().addHistoryEntry({
      type: 'teacher-info',
      title: decodeURIComponent((new URL(url)).hash.replace('#', '')) || 'Dozenteninfo',
      target: url
    });
  }
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
  isReplacingMainWindow = true;
  createWorkshopWindow();
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.once('closed', () => {
      isReplacingMainWindow = false;
    });
    setupWindow.close();
  } else {
    isReplacingMainWindow = false;
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
  if (forceWizard) {
    createWizardWindow();
  } else if (getAppData().getSettings().configured) {
    createWorkshopWindow();
  } else {
    createWizardWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (forceWizard) {
        createWizardWindow();
      } else if (getAppData().getSettings().configured) {
        createWorkshopWindow();
      } else {
        createWizardWindow();
      }
    }
  });
});

app.on('before-quit', () => {
  closeAllApplicationWindows();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
