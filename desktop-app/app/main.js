const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { createContentFactoryService } = require('./lib/content-factory/content-factory-service');
const { ensureDir } = require('./lib/json-store');
const { applyAppEnv } = require('./lib/env/env-loader');

const projectRoot = path.resolve(__dirname, '..', '..');
const rendererFile = path.join(__dirname, 'renderer', 'tool-center', 'factory.html');
const preloadFile = path.join(__dirname, 'preload.js');
const iconFile = path.join(__dirname, 'assets', 'icons', process.platform === 'win32' ? 'app-icon.ico' : 'app-icon.png');
const standaloneSession = Object.freeze({ authenticated: true, user: { id: 'local', email: 'local@contentfactory.invalid', roles: [] } });

applyAppEnv(projectRoot);
let mainWindow;
let service;

function getAppData() {
  const dataDir = path.join(app.getPath('userData'), 'projects');
  return {
    dataDir,
    ensureDataFiles() { ensureDir(dataDir); }
  };
}

function getService() {
  if (!service) service = createContentFactoryService({ appData: getAppData(), projectRoot });
  return service;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'ueTool ContentFactory',
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: '#f3f8fb',
    icon: fs.existsSync(iconFile) ? iconFile : undefined,
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(rendererFile);
  if (process.argv.includes('--smoke-test')) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const result = await mainWindow.webContents.executeJavaScript(`({
        title: document.title,
        mainNavigationItems: document.querySelectorAll('.factory-sidebar > [data-factory-tab]').length,
        phases: window.ContentFactoryWorkflowLayout ? 6 : 0,
        navigationModule: Boolean(window.ContentFactoryAppNavigation),
        visiblePanel: document.querySelectorAll('[data-factory-panel].is-active').length
      })`);
      if (result.title !== 'ueTool ContentFactory' || result.mainNavigationItems !== 5 || result.phases !== 6 || !result.navigationModule || result.visiblePanel !== 1) {
        console.error('CONTENTFACTORY_SMOKE_FAILED', JSON.stringify(result));
        app.exit(1);
        return;
      }
      console.log('CONTENTFACTORY_SMOKE_OK', JSON.stringify(result));
      app.quit();
    });
  }
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

function handle(channel, method) {
  ipcMain.handle(channel, (event, ...args) => getService()[method](...args, standaloneSession));
}

function registerIpc() {
  const calls = {
    'factory:get-state': 'getState',
    'factory:duplicate-container': 'duplicateContainer',
    'factory:import-files': 'createImportBatch',
    'factory:create-curriculum-anchor': 'createCurriculumAnchor',
    'factory:analyze-curriculum-anchor': 'analyzeCurriculumAnchor',
    'factory:get-curriculum-draft': 'getCurriculumDraft',
    'factory:update-curriculum-draft': 'updateCurriculumDraft',
    'factory:move-curriculum-topic': 'moveCurriculumTopic',
    'factory:approve-curriculum-draft': 'approveCurriculumDraft',
    'factory:list-curriculum-drafts': 'listCurriculumDrafts',
    'factory:remove-curriculum-draft': 'removeCurriculumDraft',
    'factory:parse-course-plan': 'parseCoursePlan',
    'factory:get-ai-provider-status': 'getAiProviderStatus',
    'factory:test-openai-connection': 'testOpenAiConnection',
    'factory:import-openai-key-from-txt': 'importOpenAiKeyFromTxt',
    'factory:import-openai-key-from-default-path': 'importOpenAiKeyFromDefaultPath',
    'factory:clear-openai-key': 'clearOpenAiKey',
    'factory:update-ai-model': 'updateAiModel',
    'factory:estimate-ai-cost': 'estimateAiCost',
    'factory:run-preflight': 'runPreflight',
    'factory:preview-prompt-quality': 'previewPromptQuality',
    'factory:run-prompt-golden-tests': 'runPromptGoldenTests',
    'factory:run-test-draft': 'runContentFactoryTestDraft',
    'factory:list-presets': 'listPresets',
    'factory:apply-preset': 'applyPreset',
    'factory:recommend-didactic-profiles': 'recommendDidacticProfiles',
    'factory:evaluate-didactic-fit': 'evaluateDidacticFit',
    'factory:evaluate-all-didactic-fits': 'evaluateAllDidacticFits',
    'factory:create-didactic-preview': 'createDidacticPreview',
    'factory:delete-generated-draft': 'deleteGeneratedDraft',
    'factory:delete-last-test-draft': 'deleteLastTestDraft',
    'factory:clear-staging': 'clearStaging',
    'factory:list-storage-usage': 'listStorageUsage',
    'factory:generate-day-draft': 'generateDayDraft',
    'factory:generate-all-day-drafts': 'generateAllDayDrafts',
    'factory:revise-day-draft': 'reviseDayDraft',
    'factory:create-plan-container-draft': 'createPlanContainerDraft',
    'factory:validate-generated-container': 'validateGeneratedContainer',
    'factory:update-mapping': 'updateMapping',
    'factory:validate-batch': 'validateImportBatch',
    'factory:create-container-from-batch': 'createContainerFromImportBatch',
    'factory:disable-container': 'disableContainer',
    'factory:archive-container': 'archiveContainer'
  };
  Object.entries(calls).forEach(([channel, method]) => handle(channel, method));
  ipcMain.handle('factory:publish-container', (event, containerId, options) => getService().publishContainer(containerId, standaloneSession, options));

  ipcMain.handle('factory:select-openai-key-txt', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Textdatei', extensions: ['txt'] }] });
    return result.canceled ? null : getService().importOpenAiKeyFromTxt(result.filePaths[0], standaloneSession);
  });
  ipcMain.handle('factory:open-openai-setup-guide', () => shell.openExternal('https://platform.openai.com/api-keys'));
  ipcMain.handle('factory:open-generated-draft', (event, containerId, target = 'standalone') => {
    const entry = getService().storage.listGeneratedContainers().find((item) => item.id === containerId || item.manifest?.id === containerId);
    if (!entry?.storagePath) throw new Error('Container wurde nicht gefunden.');
    const candidate = target === 'report' ? path.join(entry.storagePath, 'reports') : path.join(entry.storagePath, 'standalone', 'index.html');
    const relative = path.relative(entry.storagePath, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Ungültiger Vorschaupfad.');
    return shell.openPath(candidate);
  });
  ipcMain.handle('factory:import-reference-sources', (event, input) => getService().referenceLibrary.importReferenceSources(input, standaloneSession));
  ipcMain.handle('factory:list-reference-sources', () => getService().referenceLibrary.listReferenceSources());
  ipcMain.handle('factory:get-reference-source', (event, id) => getService().referenceLibrary.getReferenceSource(id));
  ipcMain.handle('factory:search-references', (event, query) => getService().referenceLibrary.searchReferences(query));
  ipcMain.handle('factory:remove-reference-source', (event, id) => getService().referenceLibrary.removeReferenceSource(id));
  ipcMain.handle('factory:get-reference-safety-report', (event, id) => getService().referenceLibrary.getReferenceSafetyReport(id));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
