const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { createContentFactoryService } = require('./lib/content-factory/content-factory-service');
const { ensureDir } = require('./lib/json-store');
const { applyAppEnv } = require('./lib/env/env-loader');
const { DOCUMENT_ANALYSIS_CHANNELS } = require('./lib/content-factory/course-planning/analysis-ipc-contract');

const projectRoot = path.resolve(__dirname, '..', '..');
const rendererFile = path.join(__dirname, 'renderer', 'tool-center', 'factory.html');
const preloadFile = path.join(__dirname, 'preload.js');
const iconFile = path.join(__dirname, 'assets', 'icons', process.platform === 'win32' ? 'app-icon.ico' : 'app-icon.png');
const standaloneSession = Object.freeze({ authenticated: true, user: { id: 'local', email: 'local@contentfactory.invalid', roles: [] } });
const localMigrationPath = path.join(process.env.USERPROFILE || '', 'OneDrive - Amadeus Fire AG', 'Desktop', 'api_key_ContentFactory.txt');
const localCacheRoot = path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'ueTool-ContentFactory', 'Cache');

ensureDir(localCacheRoot);
app.setPath('cache', localCacheRoot);
app.commandLine.appendSwitch('disk-cache-dir', path.join(localCacheRoot, 'Chromium'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

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
  if (!service) service = createContentFactoryService({ appData: getAppData(), projectRoot, safeStorage, migrationPath: localMigrationPath });
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
  ipcMain.handle(channel, async (event, ...args) => {
    try { return await getService()[method](...args, standaloneSession); }
    catch (error) {
      const message = String(error?.message || '');
      console.error('[ContentFactory IPC]', { channel, operation: method, errorName: error?.name || 'Error', errorCode: error?.code || null, message: safeLogText(message), stack: safeLogText(error?.stack) });
      const safePlanningError = ['COURSE_SCOPE_VALIDATION', 'DOCUMENT_ANALYSIS_INPUT'].includes(error?.code) || /^(KI nicht|OpenAI|Der Planungsrahmen|Abweichung im Planungsrahmen|Mindestens eine|Ungültige Dokumentanalyse|Kursstruktur|Blockierende Konflikte|Verbindliche fehlgeschlagene|Eine freigegebene|Datei kann nicht|Pause|Reservierte UE)/.test(message);
      throw new Error(/Verschlüsselung/i.test(message) ? 'Sichere Speicherung ist derzeit nicht verfügbar.' : safePlanningError ? message : 'Die Aktion konnte nicht abgeschlossen werden.');
    }
  });
}

function safeLogText(value) {
  return String(value || '').replace(/sk-[A-Za-z0-9_-]+/g, '[geschützt]').replace(/Bearer\s+[^\s]+/gi, 'Bearer [geschützt]').slice(0, 4000);
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
    'factory:get-course-project': 'getCourseProject',
    'factory:upsert-course-project': 'upsertCourseProject',
    [DOCUMENT_ANALYSIS_CHANNELS.start]: 'startDocumentAnalysis',
    [DOCUMENT_ANALYSIS_CHANNELS.progress]: 'getAnalysisProgress',
    [DOCUMENT_ANALYSIS_CHANNELS.cancel]: 'cancelAiOperation',
    'factory:save-planning-frame': 'savePlanningFrame',
    'factory:save-course-scope': 'saveCourseScope',
    [DOCUMENT_ANALYSIS_CHANNELS.generatePlan]: 'generateStructuredCoursePlan',
    'factory:save-structured-course-plan': 'saveStructuredCoursePlan',
    'factory:acknowledge-document-failure': 'acknowledgeDocumentFailure',
    'factory:approve-structured-course-plan': 'approveStructuredCoursePlan',
    'factory:get-ai-provider-status': 'getAiProviderStatus',
    'factory:test-openai-connection': 'testOpenAiConnection',
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
    if (result.canceled) return { canceled: true };
    const confirmation = await dialog.showMessageBox(mainWindow, { type: 'warning', buttons: ['Abbrechen', 'Sicher importieren'], defaultId: 0, cancelId: 0, message: 'Ausgewählten API-Schlüssel sicher importieren?' });
    return confirmation.response === 1 ? getService().importOpenAiKeyFromTxt(result.filePaths[0], standaloneSession, { overwrite: true }) : { canceled: true };
  });
  ipcMain.handle('factory:replace-openai-key', async (event, value) => {
    if (typeof value !== 'string' || value.length > 10000) throw new Error('Ungültige Eingabe.');
    const confirmation = await dialog.showMessageBox(mainWindow, { type: 'warning', buttons: ['Abbrechen', 'Sicher speichern'], defaultId: 0, cancelId: 0, message: 'OpenAI-Schlüssel eingeben oder ersetzen?' });
    return confirmation.response === 1 ? getService().replaceOpenAiKey(value, standaloneSession) : { canceled: true };
  });
  ipcMain.removeHandler('factory:clear-openai-key');
  ipcMain.handle('factory:clear-openai-key', async () => {
    const confirmation = await dialog.showMessageBox(mainWindow, { type: 'warning', buttons: ['Abbrechen', 'Entfernen'], defaultId: 0, cancelId: 0, message: 'Gespeicherten OpenAI-Schlüssel entfernen?' });
    return confirmation.response === 1 ? getService().clearOpenAiKey(standaloneSession) : { canceled: true };
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
  try {
    const result = getService().aiKeyStore.importMigrationKeyOnce(standaloneSession);
    if (result.success) console.info('OpenAI-Schlüssel wurde sicher eingerichtet.');
  } catch { console.warn('OpenAI-Schlüssel konnte nicht sicher eingerichtet werden.'); }
  if (process.argv.includes('--openai-connection-test')) {
    getService().testOpenAiConnection(standaloneSession)
      .then((result) => console.info(result.status === 'success' ? 'OpenAI-Verbindung erfolgreich' : 'OpenAI-Verbindung konnte nicht bestätigt werden.'))
      .catch(() => console.warn('OpenAI-Verbindung konnte nicht bestätigt werden.'))
      .finally(() => app.quit());
    return;
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
