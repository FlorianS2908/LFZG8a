const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { createAppData } = require('./lib/app-data');
const { createClassroomServer } = require('./lib/classroom-server');
const { courseCatalog } = require('./lib/course-catalog');
const { createDokuToolService } = require('./lib/dokutool-service');
const { moduleRegistry } = require('./lib/modules/module-registry');
const { createContentFactoryService } = require('./lib/content-factory/content-factory-service');
const { createCourseManagementService } = require('./lib/course-management/course-management-service');
const { getAdminTool, listAdminTools } = require('./lib/admin-tools/admin-tool-registry');
const { getGuide } = require('./lib/admin-tools/admin-tool-guide-service');
const { createAdminToolConfigStore } = require('./lib/admin-tools/admin-tool-config-store');
const { runAdminTool } = require('./lib/admin-tools/admin-tool-runner');
const {
  getVisibleModuleManifestsForSession,
  decideHtmlCssOpenMode,
  canOpenContentFactory,
  isAssignableModule,
  moduleAllowedForSession
} = require('./lib/workflow/role-access');
const taskPackageRegistry = require('./lib/task-packages.json');
const { getTranslations, supportedLanguages } = require('./lib/i18n');
const {
  chooseTargetDisplay,
  createFullDisplayBounds,
  createWindowOptions,
  getDisplaySummaries: summarizeDisplays
} = require('./lib/display');

const projectRoot = path.resolve(__dirname, '..', '..');
const contentFile = path.join(__dirname, 'renderer', 'course.html');
const workspaceFile = path.join(__dirname, 'renderer', 'tool-center', 'workspace.html');
const loginFile = path.join(__dirname, 'renderer', 'tool-center', 'login.html');
const factoryFile = path.join(__dirname, 'renderer', 'tool-center', 'factory.html');
const releaseCenterFile = path.join(__dirname, 'renderer', 'tool-center', 'release-center.html');
const userCreateFile = path.join(__dirname, 'renderer', 'tool-center', 'user-create.html');
const adminToolFile = path.join(__dirname, 'renderer', 'tool-center', 'admin-tool.html');
const courseManagementFile = path.join(__dirname, 'renderer', 'tool-center', 'course-management.html');
const teacherOverviewFile = path.join(projectRoot, 'dozent', 'index_dozent.html');
const participantReleaseScriptFile = path.join(projectRoot, 'teilnehmer', 'assets', 'js', 'freigaben.js');
const participantRoot = path.join(projectRoot, 'teilnehmer');
const participantIndexFile = path.join(participantRoot, 'index_teilnehmer.html');
const preloadFile = path.join(__dirname, 'preload.js');
const wizardFile = path.join(__dirname, 'renderer', 'wizard.html');
const appIconFile = path.join(__dirname, 'assets', 'icons', process.platform === 'win32' ? 'app-icon.ico' : 'app-icon.png');
const forceWizard = process.argv.includes('--wizard') || process.argv.includes('--wizard-test');
const forceTeacherStartview = process.argv.includes('--teacher-startview');
const forceAllViewsTest = process.argv.includes('--test-all-views');
const disableHistory = process.argv.includes('--no-history') || process.argv.includes('--wizard-test');

let mainWindow = null;
let teacherWindow = null;
let releaseWindow = null;
let courseViewWindow = null;
let appData = null;
let classroomServer = null;
let dokuToolService = null;
let contentFactoryService = null;
let adminToolConfigStore = null;
let courseManagementService = null;
let isClosingAllWindows = false;
let isReplacingMainWindow = false;
let startupTestReportCreated = false;

function requireAuthenticatedSession() {
  return getAppData().assertAuthenticated();
}

function requireAdminSession() {
  const session = requireAuthenticatedSession();
  if (!canOpenContentFactory(session)) {
    throw new Error('Kein Zugriff: Admin-Rechte erforderlich.');
  }
  return session;
}

function requireCourseManagerSession() {
  const session = requireAuthenticatedSession();
  const roles = session.user?.roles || [];
  if (!roles.includes('course_manager') && !roles.includes('Admin') && !roles.includes('SuperAdmin')) {
    throw new Error('Kein Zugriff: Kursverwaltung erforderlich.');
  }
  return session;
}

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
      participantRoot,
      projectRoot,
      taskPackageRegistry
    });
  }
  return classroomServer;
}

function getDokuToolService() {
  if (!dokuToolService) {
    dokuToolService = createDokuToolService({
      appData: getAppData()
    });
  }
  return dokuToolService;
}

function getContentFactoryService() {
  if (!contentFactoryService) {
    contentFactoryService = createContentFactoryService({
      appData: getAppData()
    });
  }
  return contentFactoryService;
}

function getAdminToolConfigStore() {
  if (!adminToolConfigStore) {
    adminToolConfigStore = createAdminToolConfigStore(getAppData().dataDir);
  }
  return adminToolConfigStore;
}

function getCourseManagementService() {
  if (!courseManagementService) {
    courseManagementService = createCourseManagementService({
      dataDir: getAppData().dataDir,
      moduleRegistry
    });
  }
  return courseManagementService;
}

function getVisibleModulesForSession(session) {
  const hydratedSession = {
    ...session,
    courseContainerIds: session.user?.id
      ? getCourseManagementService().getVisibleContainerIdsForUser(session.user.id)
      : []
  };
  return getVisibleModuleManifestsForSession(
    hydratedSession,
    moduleRegistry.getAllModules(),
    getContentFactoryService().storage.listGeneratedContainers()
  );
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
  reloadParticipantShareWindow();
}

function notifyTaskReleasesChanged(releases) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('task-releases:changed', releases);
    }
  });
  reloadParticipantShareWindow();
}

function getHydratedTaskPackages() {
  const releases = getAppData().getTaskReleases();
  return {
    ...taskPackageRegistry,
    tasks: taskPackageRegistry.tasks.map((task) => ({
      ...task,
      ...releases[task.id],
      taskFileInfo: getProjectFileUrl(task.taskFile.split('#')[0]),
      solutionFileInfo: task.solutionFile ? getProjectFileUrl(task.solutionFile.split('#')[0]) : null
    }))
  };
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

function sanitizeWindowTitle(title, fallbackTitle = 'HTML/CSS') {
  const cleanedTitle = String(title || fallbackTitle || 'HTML/CSS')
    .replace(/LFZQ8a HTML & CSS/g, 'HTML/CSS')
    .replace(/LFZQ8a/g, 'HTML/CSS')
    .replace(/\s*(?:Â·|·)\s*/g, ' - ')
    .replace(/Ãœ/g, 'Ue')
    .replace(/Ã¼/g, 'ue')
    .replace(/Ã–/g, 'Oe')
    .replace(/Ã¶/g, 'oe')
    .replace(/Ã„/g, 'Ae')
    .replace(/Ã¤/g, 'ae')
    .replace(/ÃŸ/g, 'ss')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleanedTitle || fallbackTitle || 'HTML/CSS';
}

function bindWindowTitle(window, fallbackTitle, options = {}) {
  const usePageTitle = options.usePageTitle !== false;
  const fallback = sanitizeWindowTitle(fallbackTitle || window.getTitle());
  window.setTitle(fallback);
  window.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    window.setTitle(usePageTitle ? sanitizeWindowTitle(title, fallback) : fallback);
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
  return createWindowOptions(display, preloadFile, {
    icon: fs.existsSync(appIconFile) ? appIconFile : undefined,
    ...extra
  });
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
  bindWindowTitle(mainWindow, mainWindow.getTitle());
  mainWindow.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }

    if (!isReplacingMainWindow) {
      closeAllApplicationWindows(window);
    }
  });
}

function getParticipantShareViewUrl(serverInfo = getClassroomServer().getInfo()) {
  return serverInfo.urls?.[0] || pathToFileURL(participantIndexFile).href;
}

function reloadParticipantShareWindow() {
  if (releaseWindow && !releaseWindow.isDestroyed()) {
    releaseWindow.webContents.reloadIgnoringCache();
  }
}

function createWizardWindow() {
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'HTML/CSS Einrichtung',
    width: 1040,
    height: 760
  })));

  mainWindow.loadFile(wizardFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function createLandingWindow() {
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'ueTool_asSaaS'
  })));

  mainWindow.loadFile(workspaceFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function createLoginWindow() {
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'ueTool_asSaaS Login',
    width: 980,
    height: 720,
    minWidth: 820,
    minHeight: 620
  })));

  mainWindow.loadFile(loginFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function loadLoginInMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createLoginWindow();
    return true;
  }
  mainWindow.setTitle('ueTool_asSaaS Login');
  mainWindow.loadFile(loginFile);
  mainWindow.focus();
  return true;
}

function loadLandingInMainWindow() {
  requireAuthenticatedSession();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createLandingWindow();
    return true;
  }
  mainWindow.setTitle('ueTool_asSaaS');
  mainWindow.loadFile(workspaceFile);
  mainWindow.focus();
  return true;
}

function createWorkshopWindow() {
  requireAuthenticatedSession();
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'HTML/CSS Dozentenview'
  })));

  mainWindow.loadFile(contentFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openTeacherInfo(url);
    return { action: 'deny' };
  });
}

function createCourseViewWindowOptions(display) {
  return getWindowOptions(display, {
    title: 'HTML/CSS Kursview',
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 640
  });
}

async function openCourseShareWindow() {
  const displays = screen.getAllDisplays();
  const display = displays[1] || getMainDisplay();
  const area = createFullDisplayBounds(display);

  if (!courseViewWindow || courseViewWindow.isDestroyed()) {
    courseViewWindow = new BrowserWindow(createCourseViewWindowOptions(display));
    bindWindowTitle(courseViewWindow, 'HTML/CSS Kursview');
    courseViewWindow.once('ready-to-show', () => courseViewWindow.show());
    courseViewWindow.on('closed', () => {
      courseViewWindow = null;
    });
  } else {
    courseViewWindow.setBounds({
      x: area.x,
      y: area.y,
      width: Math.max(area.width, 920),
      height: Math.max(area.height, 640)
    });
  }

  courseViewWindow.loadFile(teacherOverviewFile);
  courseViewWindow.webContents.setWindowOpenHandler(({ url }) => {
    openTeacherInfo(url);
    return { action: 'deny' };
  });
  courseViewWindow.focus();
  return courseViewWindow;
}

function createAllViewsTestWindows() {
  if (!getAppData().getCurrentSession().authenticated) {
    getAppData().login('admin@admin.de', '$$Klaus2908$$');
  }
  createWorkshopWindow();
  openCourseShareWindow().catch((error) => {
    console.error(`Kursview konnte nicht geoeffnet werden: ${error.message}`);
  });
  openParticipantReleaseWindow({ force: true }).catch((error) => {
    console.error(`Teilnehmeransicht konnte nicht geoeffnet werden: ${error.message}`);
  });
}

function loadWorkshopInMainWindow() {
  requireAuthenticatedSession();
  createStartupTestReport();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWorkshopWindow();
  } else {
    mainWindow.setTitle('HTML/CSS Dozentenview');
    mainWindow.loadFile(contentFile);
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      openTeacherInfo(url);
      return { action: 'deny' };
    });
    mainWindow.focus();
  }
  openCourseShareWindow().catch((error) => {
    console.error(`Kursview konnte nicht geoeffnet werden: ${error.message}`);
  });
  return true;
}

function loadWizardInMainWindow() {
  requireAuthenticatedSession();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWizardWindow();
  } else {
    mainWindow.setTitle('HTML/CSS Einrichtung');
    mainWindow.loadFile(wizardFile);
    mainWindow.focus();
  }
  return true;
}

function loadContentFactoryInMainWindow() {
  requireAdminSession();
  if (!mainWindow || mainWindow.isDestroyed()) {
    const display = getMainDisplay();
    registerMainWindow(new BrowserWindow(getWindowOptions(display, {
      title: 'ueTool_asSaaS ContentFactory'
    })));
    mainWindow.loadFile(factoryFile);
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } else {
    mainWindow.setTitle('ueTool_asSaaS ContentFactory');
    mainWindow.loadFile(factoryFile);
    mainWindow.focus();
  }
  return true;
}

function loadReleaseCenterInMainWindow() {
  requireAdminSession();
  if (!mainWindow || mainWindow.isDestroyed()) {
    const display = getMainDisplay();
    registerMainWindow(new BrowserWindow(getWindowOptions(display, {
      title: 'ueTool_asSaaS Freigabezentrum'
    })));
    mainWindow.loadFile(releaseCenterFile);
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } else {
    mainWindow.setTitle('ueTool_asSaaS Freigabezentrum');
    mainWindow.loadFile(releaseCenterFile);
    mainWindow.focus();
  }
  return true;
}

function loadUserCreateInMainWindow(role) {
  requireAdminSession();
  const normalizedRole = role === 'teacher-create' ? 'dozent' : 'teilnehmer';
  const title = normalizedRole === 'dozent' ? 'ueTool_asSaaS Dozent anlegen' : 'ueTool_asSaaS Teilnehmer anlegen';
  const query = { role: normalizedRole };
  if (!mainWindow || mainWindow.isDestroyed()) {
    const display = getMainDisplay();
    registerMainWindow(new BrowserWindow(getWindowOptions(display, { title })));
    mainWindow.loadFile(userCreateFile, { query });
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } else {
    mainWindow.setTitle(title);
    mainWindow.loadFile(userCreateFile, { query });
    mainWindow.focus();
  }
  return true;
}

function loadAdminToolInMainWindow(toolId) {
  requireAdminSession();
  const tool = getAdminTool(toolId);
  if (!tool) {
    throw new Error('Admin-Werkzeug wurde nicht gefunden.');
  }
  const title = `ueTool_asSaaS ${tool.title}`;
  if (!mainWindow || mainWindow.isDestroyed()) {
    const display = getMainDisplay();
    registerMainWindow(new BrowserWindow(getWindowOptions(display, { title })));
    mainWindow.loadFile(adminToolFile, { query: { toolId } });
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } else {
    mainWindow.setTitle(title);
    mainWindow.loadFile(adminToolFile, { query: { toolId } });
    mainWindow.focus();
  }
  return true;
}

function loadCourseManagementInMainWindow() {
  requireCourseManagerSession();
  if (!mainWindow || mainWindow.isDestroyed()) {
    const display = getMainDisplay();
    registerMainWindow(new BrowserWindow(getWindowOptions(display, {
      title: 'ueTool_asSaaS Kursverwaltung'
    })));
    mainWindow.loadFile(courseManagementFile);
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } else {
    mainWindow.setTitle('ueTool_asSaaS Kursverwaltung');
    mainWindow.loadFile(courseManagementFile);
    mainWindow.focus();
  }
  return true;
}

function openCourseFromWorkspace() {
  const session = requireAuthenticatedSession();
  const mode = decideHtmlCssOpenMode(session);
  if (mode === 'course-only') {
    return openParticipantReleaseWindow({ force: true });
  }
  if (mode !== 'teacher-and-course') {
    throw new Error('Kein Zugriff auf HTML/CSS.');
  }
  const setupState = getAppData().markCourseSetupStarted();
  if (setupState.startedNow || !setupState.settings.configured) {
    return loadWizardInMainWindow();
  }
  return loadWorkshopInMainWindow();
}

async function openParticipantReleaseWindow(openOptions = {}) {
  requireAuthenticatedSession();
  const settings = getAppData().getSettings();
  if (settings.openTeacherOnSecondMonitor === false && openOptions.force !== true) {
    return null;
  }

  const serverInfo = await ensureClassroomServer();
  const display = getTargetDisplay();
  const area = createFullDisplayBounds(display);
  const options = getWindowOptions(display, {
    title: 'HTML/CSS Teilnehmeransicht',
    width: area.width,
    height: area.height,
    minWidth: 860,
    minHeight: 640
  });

  if (!releaseWindow || releaseWindow.isDestroyed()) {
    releaseWindow = new BrowserWindow(options);
    bindWindowTitle(releaseWindow, 'HTML/CSS Teilnehmeransicht', { usePageTitle: false });
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

  releaseWindow.loadURL(getParticipantShareViewUrl(serverInfo));
  releaseWindow.focus();
  return releaseWindow;
}

function createTeacherStartviewWindow() {
  requireAuthenticatedSession();
  const display = getMainDisplay();
  registerMainWindow(new BrowserWindow(getWindowOptions(display, {
    title: 'HTML/CSS Kursuebersicht'
  })));

  mainWindow.loadFile(teacherOverviewFile);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openTeacherInfo(url);
    return { action: 'deny' };
  });
}

function openTeacherInfo(url) {
  requireAuthenticatedSession();
  const display = getTargetDisplay();
  const area = createFullDisplayBounds(display);
  const options = getWindowOptions(display, {
    title: 'HTML/CSS Dozenteninfo',
    width: area.width,
    height: area.height,
    minWidth: 760,
    minHeight: 600
  });

  if (!teacherWindow || teacherWindow.isDestroyed()) {
    teacherWindow = new BrowserWindow(options);
    bindWindowTitle(teacherWindow, 'HTML/CSS Dozenteninfo');
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
  requireAuthenticatedSession();
  getAppData().ensureDataFiles();
  syncParticipantReleaseScript();
  return {
    settings: getAppData().getSettings(),
    translations: getTranslations(getAppData().getSettings().teacherLanguage),
    supportedLanguages,
    displays: getDisplaySummaries(),
    history: getAppData().listHistory(),
    testReports: getAppData().listTestReports(),
    courseSetup: getAppData().getCourseSetupState(),
    contentFile,
    teacherOverviewFile
  };
});

ipcMain.handle('workspace:get-state', () => {
  const session = requireAuthenticatedSession();
  getAppData().ensureDataFiles();
  return {
    auth: session,
    settings: getAppData().getSettings(),
    supportedLanguages,
    modules: getVisibleModulesForSession(session),
    dokuTool: {
      dataDir: getDokuToolService().dataDir,
      user: getDokuToolService().getDesktopUser()
    }
  };
});

ipcMain.handle('workspace:save-profile', (event, profile) => {
  const session = requireAuthenticatedSession();
  const profileSession = getAppData().saveUserProfile(session.user.id, {
    displayName: String(profile?.displayName || session.user.displayName || 'Dozent').trim() || 'Dozent',
    organizationName: String(profile?.organizationName || '').trim(),
    avatar: profile?.avatar
  });
  const currentProfile = getAppData().getSettings().teacherProfile;
  const saved = getAppData().saveSettings({
    teacherProfile: {
      ...currentProfile,
      displayName: String(profile?.displayName || 'Dozent').trim() || 'Dozent',
      email: String(profile?.email || '').trim()
    }
  });
  return {
    settings: saved,
    auth: profileSession
  };
});

ipcMain.handle('workspace:open-landing', () => loadLandingInMainWindow());

ipcMain.handle('workspace:open-lfzq8a', () => openCourseFromWorkspace());

ipcMain.handle('workspace:open-module', (event, moduleId) => {
  const session = requireAuthenticatedSession();
  const module = moduleRegistry.getModuleById(moduleId);
  const generated = getContentFactoryService().storage.loadContainer(moduleId);
  const resolvedModule = module || generated;
  if (!resolvedModule || resolvedModule.manifest.status !== 'active') {
    throw new Error('Dieses Modul ist nicht aktiv.');
  }
  const requiredRoles = resolvedModule.manifest.requiredRoles || [];
  if (requiredRoles.length && !requiredRoles.some((role) => (session.user.roles || []).includes(role))) {
    throw new Error('Kein Zugriff auf dieses Modul.');
  }
  if (resolvedModule.manifest.id === 'lfzq8a') {
    return openCourseFromWorkspace();
  }
  if (resolvedModule.manifest.id === 'content-factory') {
    return loadContentFactoryInMainWindow();
  }
  if (resolvedModule.manifest.id === 'release-center') {
    return loadReleaseCenterInMainWindow();
  }
  if (resolvedModule.manifest.id === 'teacher-create' || resolvedModule.manifest.id === 'participant-create') {
    return loadUserCreateInMainWindow(resolvedModule.manifest.id);
  }
  if (resolvedModule.manifest.id === 'course-management') {
    return loadCourseManagementInMainWindow();
  }
  if (resolvedModule.manifest.category === 'admin' && resolvedModule.manifest.componentRef !== 'electron:openContentFactory') {
    return loadAdminToolInMainWindow(resolvedModule.manifest.id);
  }
  if (!canOpenContentFactory(session) && !isAssignableModule(resolvedModule)) {
    throw new Error('Kein Zugriff auf dieses Systemmodul.');
  }
  if (!canOpenContentFactory(session) && !moduleAllowedForSession(resolvedModule, session)) {
    throw new Error('Kein Zugriff auf dieses Modul.');
  }
  if (resolvedModule.manifest.sourceContainerId === 'lfzq8a') {
    return openCourseFromWorkspace();
  }
  return false;
});

ipcMain.handle('workspace:open-wizard', () => {
  const session = requireAuthenticatedSession();
  const roles = session.user?.roles || [];
  const assigned = session.profile?.assignedModuleIds || [];
  if (!roles.includes('Dozent') || !assigned.includes('lfzq8a')) {
    throw new Error('Der Wizard ist nur fuer freigegebene Dozentenkurse verfuegbar.');
  }
  return loadWizardInMainWindow();
});

ipcMain.handle('release-center:get-state', () => {
  requireAdminSession();
  const users = getAppData().listUsers().filter((user) => !user.roles?.includes('Admin') && !user.roles?.includes('SuperAdmin'));
  const profiles = getAppData().listProfiles();
  const modules = [
    ...moduleRegistry.getAllModules(),
    ...getContentFactoryService().storage.listGeneratedContainers()
  ]
    .filter((module) => isAssignableModule(module))
    .map((module) => module.manifest);
  return {
    users: users.map((user) => ({
      ...user,
      passwordHash: undefined,
      profile: profiles.find((profile) => profile.userId === user.id) || null
    })),
    assignableModules: modules,
    pendingRegistrations: getAppData().listPendingRegistrations(requireAdminSession())
  };
});

ipcMain.handle('release-center:save-assignments', (event, userId, moduleIds) => {
  requireAdminSession();
  const assignableIds = new Set([
    ...moduleRegistry.getAllModules(),
    ...getContentFactoryService().storage.listGeneratedContainers()
  ].filter((module) => isAssignableModule(module)).map((module) => module.manifest.id));
  const filteredModuleIds = (moduleIds || []).filter((moduleId) => assignableIds.has(moduleId));
  return getAppData().setAssignedModules(userId, filteredModuleIds);
});

ipcMain.handle('release-center:revoke-pending-registration', (event, id) => (
  getAppData().revokePendingRegistration(requireAdminSession(), id)
));

ipcMain.handle('user-create:create-pending-registration', (event, input) => (
  getAppData().createPendingRegistration(requireAdminSession(), input)
));

ipcMain.handle('admin-tools:list', () => {
  requireAdminSession();
  return listAdminTools();
});

ipcMain.handle('admin-tools:get-state', (event, toolId) => {
  requireAdminSession();
  const tool = getAdminTool(toolId);
  if (!tool) {
    throw new Error('Admin-Werkzeug wurde nicht gefunden.');
  }
  return {
    tool,
    guide: getGuide(toolId),
    config: getAdminToolConfigStore().getConfig(toolId)
  };
});

ipcMain.handle('admin-tools:save-config', (event, toolId, config) => {
  requireAdminSession();
  return getAdminToolConfigStore().saveConfig(toolId, config);
});

ipcMain.handle('admin-tools:run-preview', (event, toolId) => {
  requireAdminSession();
  return runAdminTool(toolId, { projectRoot });
});

ipcMain.handle('course-management:get-state', () => {
  const session = requireCourseManagerSession();
  const users = getAppData().listUsers()
    .filter((user) => user.isActive !== false)
    .map(({ passwordHash, ...user }) => user);
  return {
    ...getCourseManagementService().getState(session),
    users
  };
});

ipcMain.handle('course-management:create-course', (event, input) => (
  getCourseManagementService().createCourseInstance(requireCourseManagerSession(), input)
));

ipcMain.handle('course-management:assign-member', (event, courseInstanceId, userId, roleInCourse) => (
  getCourseManagementService().assignMember(requireCourseManagerSession(), courseInstanceId, userId, roleInCourse)
));

ipcMain.handle('course-management:assign-container', (event, courseInstanceId, contentContainerId) => (
  getCourseManagementService().assignContainer(requireCourseManagerSession(), courseInstanceId, contentContainerId)
));

ipcMain.handle('course-management:update-status', (event, courseInstanceId, status, expectedRevision) => (
  getCourseManagementService().updateCourseStatus(requireCourseManagerSession(), courseInstanceId, status, expectedRevision)
));

ipcMain.handle('factory:get-state', () => getContentFactoryService().getState(requireAdminSession()));

ipcMain.handle('factory:duplicate-container', (event, options) => (
  getContentFactoryService().duplicateContainer(options, requireAdminSession())
));

ipcMain.handle('factory:import-files', (event, input) => (
  getContentFactoryService().createImportBatch(input, requireAdminSession())
));

ipcMain.handle('factory:update-mapping', (event, batchId, fileId, mapping) => (
  getContentFactoryService().updateMapping(batchId, fileId, mapping, requireAdminSession())
));

ipcMain.handle('factory:validate-batch', (event, batchId) => (
  getContentFactoryService().validateImportBatch(batchId, requireAdminSession())
));

ipcMain.handle('factory:create-container-from-batch', (event, batchId, options) => (
  getContentFactoryService().createContainerFromImportBatch(batchId, options, requireAdminSession())
));

ipcMain.handle('factory:publish-container', (event, containerId, options) => (
  getContentFactoryService().publishContainer(containerId, requireAdminSession(), options)
));

ipcMain.handle('factory:disable-container', (event, containerId) => (
  getContentFactoryService().disableContainer(containerId, requireAdminSession())
));

ipcMain.handle('factory:archive-container', (event, containerId) => (
  getContentFactoryService().archiveContainer(containerId, requireAdminSession())
));

ipcMain.handle('factory:import-reference-sources', (event, input) => (
  getContentFactoryService().referenceLibrary.importReferenceSources(input, requireAdminSession())
));

ipcMain.handle('factory:list-reference-sources', () => {
  requireAdminSession();
  return getContentFactoryService().referenceLibrary.listReferenceSources();
});

ipcMain.handle('factory:get-reference-source', (event, referenceId) => {
  requireAdminSession();
  return getContentFactoryService().referenceLibrary.getReferenceSource(referenceId);
});

ipcMain.handle('factory:search-references', (event, query) => {
  requireAdminSession();
  return getContentFactoryService().referenceLibrary.searchReferences(query);
});

ipcMain.handle('factory:remove-reference-source', (event, referenceId) => {
  requireAdminSession();
  return getContentFactoryService().referenceLibrary.removeReferenceSource(referenceId);
});

ipcMain.handle('factory:get-reference-safety-report', (event, referenceId) => {
  requireAdminSession();
  return getContentFactoryService().referenceLibrary.getReferenceSafetyReport(referenceId);
});

ipcMain.handle('auth:get-state', () => {
  getAppData().ensureDataFiles();
  return getAppData().getCurrentSession();
});

ipcMain.handle('auth:login', (event, credentials) => {
  const result = getAppData().login(credentials?.email, credentials?.password);
  if (result.authenticated) {
    loadLandingInMainWindow();
  }
  return result;
});

ipcMain.handle('auth:register', (event, input) => {
  const result = getAppData().registerUser(input);
  if (result.authenticated) {
    loadLandingInMainWindow();
  }
  return result;
});

ipcMain.handle('auth:logout', () => {
  const result = getAppData().logout();
  loadLoginInMainWindow();
  return result;
});

ipcMain.handle('auth:change-password', (event, input) => {
  const session = requireAuthenticatedSession();
  return getAppData().changePassword(session.user.id, input?.oldPassword, input?.newPassword, input?.confirmation);
});

ipcMain.handle('course-settings:get', (event, courseId) => {
  requireAuthenticatedSession();
  return getAppData().getCourseSettings(courseId || 'html-css');
});

ipcMain.handle('course-settings:save', (event, courseId, settings) => {
  const session = requireAuthenticatedSession();
  const roles = session.user?.roles || [];
  if (!roles.includes('Dozent') && !roles.includes('Admin') && !roles.includes('SuperAdmin')) {
    throw new Error('Kurssettings sind nur fuer Dozenten verfuegbar.');
  }
  return getAppData().saveCourseSettings(courseId || 'html-css', settings);
});

ipcMain.handle('dokutool:quiz-config', () => getDokuToolService().getQuizConfig());

ipcMain.handle('dokutool:quiz-questions', (event, query) => getDokuToolService().getQuizQuestions(query));

ipcMain.handle('dokutool:quiz-profile-save', (event, profile) => getDokuToolService().saveQuizProfile(profile));

ipcMain.handle('dokutool:analyze', (event, input) => getDokuToolService().analyzeDocument(input));

ipcMain.handle('dokutool:reports-list', () => getDokuToolService().listReports());

ipcMain.handle('dokutool:report-get', (event, reportId) => getDokuToolService().getReport(reportId));

ipcMain.handle('course:get-state', () => {
  syncParticipantReleaseScript();
  return {
    catalog: getHydratedCourseCatalog(),
    releases: getAppData().getParticipantReleases(),
    taskPackages: getHydratedTaskPackages(),
    taskReleases: getAppData().getTaskReleases(),
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
  openParticipantReleaseWindow().catch((error) => {
    console.error(`Teilnehmer-Share-View konnte nicht geoeffnet werden: ${error.message}`);
  });
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
  openParticipantReleaseWindow().catch((error) => {
    console.error(`Teilnehmer-Share-View konnte nicht geoeffnet werden: ${error.message}`);
  });
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

ipcMain.handle('task-packages:get', () => {
  return getHydratedTaskPackages();
});

ipcMain.handle('task-releases:get', () => {
  return getAppData().getTaskReleases();
});

ipcMain.handle('task-release:save', (event, taskId, release) => {
  const saved = getAppData().saveTaskRelease(taskId, release);
  notifyTaskReleasesChanged(saved);
  return saved;
});

ipcMain.handle('task-release:bulk', (event, filter, values) => {
  const saved = getAppData().bulkUpdateTaskReleases(filter, values);
  notifyTaskReleasesChanged(saved);
  return saved;
});

ipcMain.handle('task-release:reset', () => {
  const saved = getAppData().resetTaskReleases();
  notifyTaskReleasesChanged(saved);
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
  app.setName('ueTool_asSaaS');
  getAppData().ensureDataFiles();
  syncParticipantReleaseScript();
  ensureClassroomServer().catch((error) => {
    console.error(`Kursserver konnte nicht gestartet werden: ${error.message}`);
  });
  if (forceAllViewsTest) {
    createAllViewsTestWindows();
  } else if (forceTeacherStartview) {
    createTeacherStartviewWindow();
    openParticipantReleaseWindow().catch((error) => {
      console.error(`Teilnehmer-Share-View konnte nicht geoeffnet werden: ${error.message}`);
    });
  } else if (forceWizard) {
    createWizardWindow();
  } else {
    createLoginWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (forceAllViewsTest) {
        createAllViewsTestWindows();
      } else if (forceTeacherStartview) {
        createTeacherStartviewWindow();
        openParticipantReleaseWindow().catch((error) => {
          console.error(`Teilnehmer-Share-View konnte nicht geoeffnet werden: ${error.message}`);
        });
      } else if (forceWizard) {
        createWizardWindow();
      } else {
        createLoginWindow();
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
