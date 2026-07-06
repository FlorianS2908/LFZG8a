const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { createAppData } = require('./lib/app-data');
const { createClassroomServer } = require('./lib/classroom-server');
const { courseCatalog } = require('./lib/course-catalog');
const { getTranslations, supportedLanguages } = require('./lib/i18n');
const {
  chooseTargetDisplay,
  createFullDisplayBounds,
  createWindowOptions,
  getDisplaySummaries: summarizeDisplays
} = require('./lib/display');

const projectRoot = path.resolve(__dirname, '..', '..');
const contentFile = path.join(__dirname, 'renderer', 'course.html');
const teacherOverviewFile = path.join(projectRoot, 'dozent', 'index_dozent.html');
const participantReleaseScriptFile = path.join(projectRoot, 'teilnehmer', 'assets', 'js', 'freigaben.js');
const participantRoot = path.join(projectRoot, 'teilnehmer');
const preloadFile = path.join(__dirname, 'preload.js');
const wizardFile = path.join(__dirname, 'renderer', 'wizard.html');
const forceWizard = process.argv.includes('--wizard') || process.argv.includes('--wizard-test');
const forceTeacherStartview = process.argv.includes('--teacher-startview');
const disableHistory = process.argv.includes('--no-history') || process.argv.includes('--wizard-test');

let mainWindow = null;
let teacherWindow = null;
let releaseWindow = null;
let appData = null;
let classroomServer = null;
let isClosingAllWindows = false;
let isReplacingMainWindow = false;
let startupTestReportCreated = false;

function getAppData() {
  if (!appData) {
    appData = createAppData(app.getPath('userData'), { disableHistory });
  }
  return appData;
}

function getClassroomServer() {
  if (!classroomServer) {
    classroomServer = createClassroomServer({
      appData: getAppData(),
      participantRoot
    });
  }
  return classroomServer;
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

function getDisplayByDisplayId(displayId) {
  const displays = screen.getAllDisplays();
  const normalizedId = String(displayId || '').replace(/^display-/, '');
  return displays.find((display) => String(display.id) === normalizedId)
    || displays[Number(normalizedId) - 1]
    || displays[0];
}

function moveWindowToDisplay(window, display) {
  if (!window || window.isDestroyed() || !display) {
    return false;
  }

  const bounds = createFullDisplayBounds(display);
  window.setBounds(bounds);
  window.maximize();
  window.focus();
  return true;
}

function createMonitorHighlightWindow(display, label) {
  const bounds = createFullDisplayBounds(display);
  const highlightWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    show: false
  });

  const html = `<!doctype html><html><body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;box-sizing:border-box;border:10px solid #d31818;background:rgba(211,24,24,.08);font-family:Arial,sans-serif;color:#d31818;font-size:46px;font-weight:900;text-align:center">${String(label || 'Ausgewaehlter Monitor')}</body></html>`;
  highlightWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  highlightWindow.once('ready-to-show', () => highlightWindow.showInactive());
  setTimeout(() => {
    if (!highlightWindow.isDestroyed()) {
      highlightWindow.close();
    }
  }, 2600);
  return true;
}

function getDeviceNetworkData() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => (
    (addresses || [])
      .filter((address) => !address.internal && address.family === 'IPv4')
      .map((address) => ({
        name,
        address: address.address,
        mac: address.mac
      }))
  ));
}

function createCurrentTestReport() {
  return getAppData().saveTestReport({
    device: {
      hostname: os.hostname(),
      network: getDeviceNetworkData()
    },
    results: {
      status: 'ok',
      checks: [
        {
          name: 'Konfiguration',
          status: getAppData().getSettings().configured ? 'ok' : 'offen',
          details: 'Lokale Einstellungen wurden gelesen.'
        },
        {
          name: 'Dozentenuebersicht',
          status: 'ok',
          details: teacherOverviewFile
        },
        {
          name: 'Monitor-Erkennung',
          status: 'ok',
          details: `${screen.getAllDisplays().length} Bildschirm(e) erkannt.`
        }
      ]
    }
  });
}

function createStartupTestReport() {
  if (startupTestReportCreated) {
    return null;
  }
  startupTestReportCreated = true;
  return createCurrentTestReport();
}

function syncParticipantReleaseScript() {
  return getAppData().writeParticipantReleaseScript(participantReleaseScriptFile);
}

async function ensureClassroomServer() {
  return getClassroomServer().start();
}

function isInsideProject(filePath) {
  const relative = path.relative(projectRoot, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveEditorTarget(target) {
  if (!target || typeof target !== 'string') {
    throw new Error('Kein Dateipfad uebergeben.');
  }

  const filePath = target.startsWith('file:')
    ? fileURLToPath(target)
    : path.resolve(projectRoot, target);
  const resolvedPath = path.resolve(filePath);

  if (!isInsideProject(resolvedPath)) {
    throw new Error('Datei liegt ausserhalb des Projektordners.');
  }

  return resolvedPath;
}

function getProjectFileUrl(target) {
  const resolvedPath = resolveEditorTarget(target);
  return {
    path: resolvedPath,
    url: pathToFileURL(resolvedPath).href,
    kind: fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory() ? 'directory' : 'file'
  };
}

function hydrateCatalogNode(node) {
  if (Array.isArray(node)) {
    return node.map(hydrateCatalogNode);
  }

  if (!node || typeof node !== 'object') {
    return node;
  }

  const hydrated = { ...node };
  ['path', 'web', 'tasks', 'solutions', 'quiz25', 'quiz50', 'overview', 'workspace', 'solution'].forEach((key) => {
    if (hydrated[key]) {
      hydrated[`${key}File`] = getProjectFileUrl(hydrated[key]);
    }
  });
  Object.keys(hydrated).forEach((key) => {
    if (hydrated[key] && typeof hydrated[key] === 'object' && !key.endsWith('File')) {
      hydrated[key] = hydrateCatalogNode(hydrated[key]);
    }
  });

  return hydrated;
}

function getHydratedCourseCatalog() {
  return hydrateCatalogNode(courseCatalog);
}

function notifyParticipantReleasesChanged(releases) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('participant-releases:changed', releases);
    }
  });
}

function getVsCodeLaunchers() {
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  const candidates = [
    localAppData && path.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
    localAppData && path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
    programFiles && path.join(programFiles, 'Microsoft VS Code', 'Code.exe'),
    programFilesX86 && path.join(programFilesX86, 'Microsoft VS Code', 'Code.exe')
  ].filter(Boolean);

  const existingLaunchers = candidates
    .filter((candidate) => fs.existsSync(candidate))
    .map((command) => ({
      command,
      shell: /\.cmd$/i.test(command)
    }));

  return existingLaunchers.length > 0
    ? existingLaunchers
    : [{ command: 'code.cmd', shell: true }];
}

function spawnDetached(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      ...options
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}

function getVsCodeFileUrl(filePath) {
  return encodeURI(`vscode://file/${filePath.replace(/\\/g, '/')}`);
}

async function openFileInVsCode(target) {
  const filePath = resolveEditorTarget(target);
  const isDirectory = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
  const launchArgs = isDirectory
    ? ['-n', filePath]
    : ['-n', projectRoot, '-g', filePath];
  const launchers = getVsCodeLaunchers();
  const errors = [];

  for (const launcher of launchers) {
    try {
      await spawnDetached(launcher.command, launchArgs, { shell: launcher.shell });
      await shell.openExternal(getVsCodeFileUrl(filePath));
      return { opened: true, filePath, editor: launcher.command, kind: isDirectory ? 'directory' : 'file' };
    } catch (error) {
      errors.push(`${launcher.command}: ${error.message}`);
    }
  }

  try {
    await shell.openExternal(getVsCodeFileUrl(filePath));
    return { opened: true, filePath, editor: 'vscode-protocol', kind: isDirectory ? 'directory' : 'file' };
  } catch (error) {
    errors.push(`vscode-protocol: ${error.message}`);
  }

  throw new Error(`VS Code konnte nicht gestartet werden. ${errors.join(' | ')}`);
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

function getReleaseViewUrl() {
  return `${pathToFileURL(contentFile).href}?view=releases`;
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
    title: 'LFZQ8a Dozentenview'
  })));

  mainWindow.loadFile(contentFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openTeacherInfo(url);
    return { action: 'deny' };
  });
}

function openParticipantReleaseWindow() {
  const settings = getAppData().getSettings();
  if (settings.openTeacherOnSecondMonitor === false) {
    return null;
  }

  const display = getTargetDisplay();
  const area = createFullDisplayBounds(display);
  const options = getWindowOptions(display, {
    title: 'LFZQ8a Teilnehmer-Freigaben',
    width: area.width,
    height: area.height,
    minWidth: 860,
    minHeight: 640
  });

  if (!releaseWindow || releaseWindow.isDestroyed()) {
    releaseWindow = new BrowserWindow(options);
    releaseWindow.once('ready-to-show', () => releaseWindow.show());
    releaseWindow.on('closed', () => {
      releaseWindow = null;
    });
  } else {
    releaseWindow.setBounds({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height
    });
  }

  releaseWindow.loadURL(getReleaseViewUrl());
  releaseWindow.focus();
  return releaseWindow;
}

function createTeacherStartviewWindow() {
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'LFZQ8a Kursuebersicht'
  })));

  mainWindow.loadFile(teacherOverviewFile);
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
  syncParticipantReleaseScript();
  return {
    settings: getAppData().getSettings(),
    translations: getTranslations(getAppData().getSettings().teacherLanguage),
    supportedLanguages,
    displays: getDisplaySummaries(),
    history: getAppData().listHistory(),
    testReports: getAppData().listTestReports(),
    contentFile,
    teacherOverviewFile
  };
});

ipcMain.handle('course:get-state', () => {
  syncParticipantReleaseScript();
  return {
    catalog: getHydratedCourseCatalog(),
    releases: getAppData().getParticipantReleases(),
    settings: getAppData().getSettings(),
    translations: getTranslations(getAppData().getSettings().teacherLanguage),
    supportedLanguages,
    displays: getDisplaySummaries(),
    testReports: getAppData().listTestReports(),
    history: getAppData().listHistory(),
    classroom: getClassroomServer().getInfo()
  };
});

ipcMain.handle('setup:save', (event, settings) => {
  const saved = getAppData().saveSettings(settings);
  syncParticipantReleaseScript();
  return saved;
});

ipcMain.handle('setup:start-workshop', () => {
  getAppData().saveSettings({ configured: true });
  syncParticipantReleaseScript();
  createStartupTestReport();
  const setupWindow = mainWindow;
  isReplacingMainWindow = true;
  createWorkshopWindow();
  openParticipantReleaseWindow();
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

ipcMain.handle('teacher:open-releases', () => {
  openParticipantReleaseWindow();
  return true;
});

ipcMain.handle('display:move-view', (event, viewType, displayId) => {
  const display = getDisplayByDisplayId(displayId);
  if (viewType === 'main') {
    return { moved: moveWindowToDisplay(mainWindow, display), viewType, displayId };
  }

  if (viewType === 'teacher') {
    const moved = moveWindowToDisplay(teacherWindow, display);
    return {
      moved,
      prepared: !moved,
      viewType,
      displayId
    };
  }

  return { moved: false, viewType, displayId };
});

ipcMain.handle('display:highlight', (event, displayId, label) => {
  const display = getDisplayByDisplayId(displayId);
  return {
    highlighted: createMonitorHighlightWindow(display, label),
    displayId
  };
});

ipcMain.handle('editor:open', (event, target) => openFileInVsCode(target));

ipcMain.handle('participant-releases:get', () => {
  syncParticipantReleaseScript();
  return getAppData().getParticipantReleases();
});

ipcMain.handle('participant-releases:save', (event, releases) => {
  const saved = getAppData().saveParticipantReleases(releases);
  syncParticipantReleaseScript();
  notifyParticipantReleasesChanged(saved);
  return saved;
});

ipcMain.handle('classroom:get-info', () => {
  return getClassroomServer().getInfo();
});

ipcMain.handle('classroom:list-participants', () => {
  return getAppData().listParticipants();
});

ipcMain.handle('app:open-data-dir', () => {
  getAppData().ensureDataFiles();
  shell.openPath(getAppData().dataDir);
});

ipcMain.handle('test-report:create', () => {
  return createCurrentTestReport();
});

ipcMain.handle('test-report:list', () => {
  return getAppData().listTestReports();
});

ipcMain.handle('test-report:open-dir', () => {
  getAppData().ensureDataFiles();
  shell.openPath(getAppData().testReportsDir);
});

app.whenReady().then(() => {
  getAppData().ensureDataFiles();
  syncParticipantReleaseScript();
  ensureClassroomServer().catch((error) => {
    console.error(`Kursserver konnte nicht gestartet werden: ${error.message}`);
  });
  if (forceTeacherStartview) {
    createTeacherStartviewWindow();
    openParticipantReleaseWindow();
  } else if (forceWizard) {
    createWizardWindow();
  } else if (getAppData().getSettings().configured) {
    createStartupTestReport();
    createWorkshopWindow();
    openParticipantReleaseWindow();
  } else {
    createWizardWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (forceTeacherStartview) {
        createTeacherStartviewWindow();
        openParticipantReleaseWindow();
      } else if (forceWizard) {
        createWizardWindow();
      } else if (getAppData().getSettings().configured) {
        createWorkshopWindow();
        openParticipantReleaseWindow();
      } else {
        createWizardWindow();
      }
    }
  });
});

app.on('before-quit', () => {
  closeAllApplicationWindows();
  if (classroomServer) {
    classroomServer.stop();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
