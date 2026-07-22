const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createContentFactoryService } = require('./lib/content-factory/content-factory-service');
const { ensureDir } = require('./lib/json-store');
const { applyAppEnv } = require('./lib/env/env-loader');
const { DOCUMENT_ANALYSIS_CHANNELS } = require('./lib/content-factory/course-planning/analysis-ipc-contract');
const { writeZipPackage } = require('./lib/content-factory/document-processing/safe-zip-package');
const { installBrokenPipeGuards } = require('./lib/safe-logger');

const projectRoot = path.resolve(__dirname, '..', '..');
const rendererFile = path.join(__dirname, 'renderer', 'tool-center', 'factory.html');
const preloadFile = path.join(__dirname, 'preload.js');
const iconFile = path.join(__dirname, 'assets', 'icons', process.platform === 'win32' ? 'app-icon.ico' : 'app-icon.png');
const standaloneSession = Object.freeze({ authenticated: true, user: { id: 'local', email: 'local@contentfactory.invalid', roles: [] } });
const localMigrationPath = path.join(process.env.USERPROFILE || '', 'OneDrive - Amadeus Fire AG', 'Desktop', 'api_key_ContentFactory.txt');
const localCacheRoot = path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'ueTool-ContentFactory', 'Cache');
installBrokenPipeGuards();

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
  if (!service) service = createContentFactoryService({
    appData: getAppData(), projectRoot, safeStorage, migrationPath: localMigrationPath,
    coursePlanningAiOrchestrator: process.argv.includes('--course-planning-smoke') ? createCoursePlanningSmokeAi() : null
  });
  return service;
}

function createCoursePlanningSmokeAi() {
  const openai = {
    name: 'electron-smoke-testdouble', model: 'testdouble-v1', isConfigured: () => true,
    async analyzeDocument({ document, extraction }) {
      if (!(extraction.sections || []).some((section) => String(section.textPreview || section.content || section.title || '').trim())) throw new Error('Smoke-Test: Extraktion fehlt.');
      return { documentId: document.id, documentType: extraction.documentType, detectedCategory: 'Testquelle', summary: 'Sicher extrahierte Testquelle', topics: [{ title: 'Netzwerkgrundlagen' }], learningObjectives: [{ title: 'Netzwerke planen' }], sourceReferences: [{ documentId: document.id }], confidence: 1 };
    },
    async generateStructuredCoursePlan({ structureFrame }) {
      const units = Array.from({ length: structureFrame.totalUnits }, (_, index) => ({ id: `smoke-unit-${index + 1}`, dayNumber: Math.floor(index / structureFrame.unitsPerDay) + 1, unitNumber: index % structureFrame.unitsPerDay + 1, globalUnitNumber: index + 1, durationMinutes: structureFrame.unitDurationMinutes, topic: `Netzwerkthema ${index + 1}`, content: 'Aus der Testquelle abgeleiteter Inhalt', competencyGoal: 'Netzwerkgrundlagen anwenden', workFormat: { key: 'guided_practice', label: 'Geführte Übung' }, warnings: [], assumptions: [], sourceReferences: [{ documentId: 'smoke-source', fileName: 'smoke-source.md' }], originStatus: 'explicit', confidence: 1, reviewStatus: 'open' }));
      return { summary: 'Smoke-Test-Plan', days: Array.from({ length: structureFrame.totalDays }, (_, dayIndex) => ({ dayNumber: dayIndex + 1, title: `Tag ${dayIndex + 1}`, units: units.filter((unit) => unit.dayNumber === dayIndex + 1) })), conflicts: [], warnings: [], reviewItems: [] };
    }
  };
  return { openai };
}

function createWindow() {
  const browserPreviewSmoke = process.argv.includes('--browser-preview-smoke');
  const coursePlanningSmoke = process.argv.includes('--course-planning-smoke');
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
      preload: browserPreviewSmoke ? undefined : preloadFile,
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
  if (coursePlanningSmoke) mainWindow.loadFile(rendererFile, { query: { coursePlanningSmoke: '1' } });
  else mainWindow.loadFile(rendererFile);
  if (process.argv.includes('--smoke-test')) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const result = await mainWindow.webContents.executeJavaScript(`({
        title: document.title,
        mainNavigationItems: document.querySelectorAll('.factory-sidebar > [data-factory-tab]').length,
        phases: window.ContentFactoryWorkflowLayout ? 6 : 0,
        navigationModule: Boolean(window.ContentFactoryAppNavigation),
        visiblePanel: document.querySelectorAll('[data-factory-panel].is-active').length,
        desktopBridge: Boolean(window.lfzq8aDesktop),
        factoryBridge: Boolean(window.lfzq8aDesktop?.factory),
        startAnalysis: typeof window.lfzq8aDesktop?.factory?.startDocumentAnalysis === 'function',
        getProgress: typeof window.lfzq8aDesktop?.factory?.getAnalysisProgress === 'function'
      })`);
      const startButtonNavigation = await mainWindow.webContents.executeJavaScript(`(() => {
        document.querySelector('[data-open-factory-section="plan-wizard"]').click();
        return {
          active: document.querySelector('[data-factory-panel="plan-wizard"]').classList.contains('is-active'),
          visible: !document.querySelector('[data-factory-panel="plan-wizard"]').hidden,
          count: document.querySelectorAll('[data-factory-panel].is-active').length
        };
      })()`);
      const sidebarNavigation = await mainWindow.webContents.executeJavaScript(`(() => {
        document.querySelector('[data-factory-tab="home"]').click();
        document.querySelector('[data-factory-tab="plan-wizard"]').click();
        return {
          active: document.querySelector('[data-factory-panel="plan-wizard"]').classList.contains('is-active'),
          visible: !document.querySelector('[data-factory-panel="plan-wizard"]').hidden,
          count: document.querySelectorAll('[data-factory-panel].is-active').length
        };
      })()`);
      if (result.title !== 'ueTool ContentFactory' || result.mainNavigationItems !== 5 || result.phases !== 6 || !result.navigationModule || result.visiblePanel !== 1 || !result.desktopBridge || !result.factoryBridge || !result.startAnalysis || !result.getProgress || !startButtonNavigation.active || !startButtonNavigation.visible || startButtonNavigation.count !== 1 || !sidebarNavigation.active || !sidebarNavigation.visible || sidebarNavigation.count !== 1) {
        console.error('CONTENTFACTORY_SMOKE_FAILED', JSON.stringify({ result, startButtonNavigation, sidebarNavigation }));
        app.exit(1);
        return;
      }
      console.log('CONTENTFACTORY_SMOKE_OK', JSON.stringify({ result, startButtonNavigation, sidebarNavigation }));
      app.quit();
    });
  }
  if (browserPreviewSmoke) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const result = await mainWindow.webContents.executeJavaScript(`(() => {
        const errors = [];
        window.addEventListener('error', (event) => errors.push(event.message));
        document.querySelector('[data-open-factory-section="plan-wizard"]').click();
        const desktopControls = Array.from(document.querySelectorAll('[data-open-course-project],[data-wizard-anchor-files],[data-document-analyze],[data-save-course-scope]'));
        const startButton = {
          active: document.querySelector('[data-factory-panel="plan-wizard"]').classList.contains('is-active'),
          visible: !document.querySelector('[data-factory-panel="plan-wizard"]').hidden,
          desktopControls: desktopControls.length,
          desktopControlsDisabled: desktopControls.every((control) => control.disabled)
        };
        document.querySelector('[data-factory-tab="home"]').click();
        document.querySelector('[data-factory-tab="plan-wizard"]').click();
        return {
          desktopBridge: Boolean(window.lfzq8aDesktop),
          previewMessage: document.querySelector('[data-factory-status]').textContent,
          startButton,
          sidebarActive: document.querySelector('[data-factory-panel="plan-wizard"]').classList.contains('is-active'),
          activePanels: document.querySelectorAll('[data-factory-panel].is-active').length,
          errors
        };
      })()`);
      if (result.desktopBridge || !result.previewMessage.includes('Browser-Vorschau') || !result.startButton.active || !result.startButton.visible || !result.startButton.desktopControlsDisabled || !result.sidebarActive || result.activePanels !== 1 || result.errors.length) {
        console.error('CONTENTFACTORY_BROWSER_PREVIEW_SMOKE_FAILED', JSON.stringify(result));
        app.exit(1);
        return;
      }
      console.log('CONTENTFACTORY_BROWSER_PREVIEW_SMOKE_OK', JSON.stringify(result));
      app.quit();
    });
  }
  if (coursePlanningSmoke) {
    mainWindow.webContents.once('did-finish-load', async () => {
      const resultPath = path.join(projectRoot, '.course-planning-smoke-result.json');
      const sourcePath = path.join(app.getPath('temp'), `contentfactory-smoke-${process.pid}.xlsm`);
      writeZipPackage(sourcePath, [
        { name: '[Content_Types].xml', data: Buffer.from('<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/><Override PartName="/xl/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>') },
        { name: 'xl/workbook.xml', data: Buffer.from('<workbook><sheets><sheet name="Wochenplan"/></sheets></workbook>') },
        { name: 'xl/worksheets/sheet1.xml', data: Buffer.from('<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Tag</t></is></c><c r="B1" t="inlineStr"><is><t>UE</t></is></c><c r="C1" t="inlineStr"><is><t>Thema</t></is></c></row><row r="2"><c r="A2"><v>1</v></c><c r="B2"><v>1</v></c><c r="C2" t="inlineStr"><is><t>Netzwerksegmentierung</t></is></c></row></sheetData></worksheet>') },
        { name: 'xl/vbaProject.bin', data: Buffer.from('SMOKE_MACRO_MUST_NEVER_RUN') }
      ]);
      const sourceHashBefore = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
      try {
        const result = await Promise.race([mainWindow.webContents.executeJavaScript(`(async () => {
        const api = window.ContentFactoryCoursePlanningSmoke;
        if (!api) return { error: 'Smoke-API fehlt' };
        await api.configure(${JSON.stringify(sourcePath)}, 'Wochenplan_FIAE_LF-ZQ8A.xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12');
        const started = await api.continueFromDurationAudience();
        const afterAnalysis = api.snapshot();
        await api.plan();
        const beforeApproval = api.snapshot();
        await api.approve();
        const afterApproval = api.snapshot();
        api.confirmDidactics();
        const afterDidactics = api.snapshot();
        return { started, afterAnalysis, beforeApproval, afterApproval, afterDidactics };
        })()`), new Promise((_, reject) => setTimeout(() => reject(new Error('Electron-Smoke-Timeout nach 30 Sekunden.')), 30000))]);
        result.sourceHashBefore = sourceHashBefore;
        result.sourceHashAfter = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
        const before = result.beforeApproval || {};
        const after = result.afterApproval || {};
        const afterDidactics = result.afterDidactics || {};
        if (!result.started || result.sourceHashBefore !== result.sourceHashAfter || !['completed', 'completed_with_warnings'].includes(result.afterAnalysis?.documentAnalysisStatus) || result.afterAnalysis?.totalUnits !== 0 || before.activeStep !== 'structureReview' || before.totalDays !== 1 || before.totalUnits !== 2 || before.selectedDay !== 1 || before.selectedUnit !== 1 || before.containerProfileActive || before.sourceStrategy !== 'convert_then_analyze' || before.sourceHasMacros !== true || !after.didacticsActive || after.containerProfileActive || !afterDidactics.containerProfileActive) {
          fs.writeFileSync(resultPath, JSON.stringify({ ok: false, result }, null, 2), 'utf8');
          console.error('CONTENTFACTORY_COURSE_PLANNING_SMOKE_FAILED', JSON.stringify(result));
          app.exit(1);
          return;
        }
        fs.writeFileSync(resultPath, JSON.stringify({ ok: true, result }, null, 2), 'utf8');
        console.log('CONTENTFACTORY_COURSE_PLANNING_SMOKE_OK', JSON.stringify(result));
        app.quit();
      } catch (error) {
        fs.writeFileSync(resultPath, JSON.stringify({ ok: false, error: safeLogText(error?.stack || error?.message) }, null, 2), 'utf8');
        app.exit(1);
      }
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
      const safePlanningError = ['COURSE_SCOPE_VALIDATION', 'DOCUMENT_ANALYSIS_INPUT'].includes(error?.code) || /^SOURCE_|^EXTRACTION_/.test(error?.code || '') || /^(KI nicht|OpenAI|Der Planungsrahmen|Abweichung im Planungsrahmen|Mindestens eine|Ungültige Dokumentanalyse|Kursstruktur|Blockierende Konflikte|Verbindliche fehlgeschlagene|Eine freigegebene|Datei kann nicht|Pause|Reservierte UE)/.test(message);
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
    'factory:import-source-file': 'importSourceFile',
    [DOCUMENT_ANALYSIS_CHANNELS.start]: 'startDocumentAnalysis',
    [DOCUMENT_ANALYSIS_CHANNELS.progress]: 'getAnalysisProgress',
    [DOCUMENT_ANALYSIS_CHANNELS.cancel]: 'cancelAiOperation',
    [DOCUMENT_ANALYSIS_CHANNELS.startPlanning]: 'startCoursePlanning',
    [DOCUMENT_ANALYSIS_CHANNELS.operationStatus]: 'getOperationStatus',
    [DOCUMENT_ANALYSIS_CHANNELS.planningResult]: 'getPlanningResult',
    [DOCUMENT_ANALYSIS_CHANNELS.aiUnderstanding]: 'getAiUnderstanding',
    [DOCUMENT_ANALYSIS_CHANNELS.collaboration]: 'updatePlanCollaboration',
    [DOCUMENT_ANALYSIS_CHANNELS.reviseTarget]: 'revisePlanTarget',
    [DOCUMENT_ANALYSIS_CHANNELS.restoreVersion]: 'restorePlanVersion',
    [DOCUMENT_ANALYSIS_CHANNELS.applyConfiguration]: 'applyCoursePlanConfiguration',
    [DOCUMENT_ANALYSIS_CHANNELS.classbookModel]: 'getCoursePlanClassbookModel',
    [DOCUMENT_ANALYSIS_CHANNELS.decideConflict]: 'decideCoursePlanConflict',
    [DOCUMENT_ANALYSIS_CHANNELS.editUnit]: 'editCoursePlanUnit',
    [DOCUMENT_ANALYSIS_CHANNELS.confirmReview]: 'confirmCoursePlanReview',
    [DOCUMENT_ANALYSIS_CHANNELS.acceptReview]: 'acceptCoursePlanReview',
    [DOCUMENT_ANALYSIS_CHANNELS.updateTopics]: 'updateTopicReview',
    [DOCUMENT_ANALYSIS_CHANNELS.confirmTopics]: 'confirmTopicReview',
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
  ipcMain.handle(DOCUMENT_ANALYSIS_CHANNELS.exportPlan, async (event, projectId, version) => {
    const project = getService().getCourseProject(projectId, standaloneSession);
    const safeName = String(project.title || 'Unterrichtsplan').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80);
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Unterrichtsplan exportieren', defaultPath: `${safeName}.xlsx`, filters: [{ name: 'Excel-Arbeitsmappe', extensions: ['xlsx'] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    return getService().exportCoursePlanXlsx(projectId, version, result.filePath, standaloneSession, { overwrite: true });
  });
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
