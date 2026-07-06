const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { courseCatalog } = require('../app/lib/course-catalog');
const { getTranslations, supportedLanguages } = require('../app/lib/i18n');

const repoRoot = path.resolve(__dirname, '..', '..');
const appRoot = path.resolve(__dirname, '..');

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
      const resolvedPath = path.resolve(repoRoot, hydrated[key]);
      hydrated[`${key}File`] = {
        path: resolvedPath,
        url: pathToFileURL(resolvedPath).href,
        kind: fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory() ? 'directory' : 'file'
      };
    }
  });

  Object.keys(hydrated).forEach((key) => {
    if (hydrated[key] && typeof hydrated[key] === 'object' && !key.endsWith('File')) {
      hydrated[key] = hydrateCatalogNode(hydrated[key]);
    }
  });
  return hydrated;
}

async function main() {
  const errors = [];

  ipcMain.handle('course:get-state', () => ({
    catalog: hydrateCatalogNode(courseCatalog),
    releases: {},
    settings: {
      teacherLanguage: 'de',
      participantLanguage: 'de',
      teacherProfile: { displayName: 'Smoke Test', email: '', avatarDataUrl: '' },
      monitorIndex: 0,
      openTeacherOnSecondMonitor: true,
      includeDeviceNetworkData: false
    },
    translations: getTranslations('de'),
    supportedLanguages,
    displays: [{ index: 0, label: 'Monitor 1', primary: true }],
    testReports: []
  }));
  ipcMain.handle('history:add', () => []);
  ipcMain.handle('classroom:get-info', () => ({ urls: ['http://localhost:3000/teilnehmer'] }));
  ipcMain.handle('classroom:list-participants', () => []);
  ipcMain.handle('participant-releases:save', (event, releases) => releases || {});
  ipcMain.handle('setup:save', (event, settings) => settings || {});
  ipcMain.handle('test-report:create', () => ({ files: { json: 'smoke.json', html: 'smoke.html' }, paths: {} }));
  ipcMain.handle('test-report:list', () => []);
  ipcMain.handle('test-report:open-dir', () => true);
  ipcMain.handle('teacher:open', () => true);
  ipcMain.handle('editor:open', () => true);
  ipcMain.handle('app:open-data-dir', () => true);

  await app.whenReady();
  const window = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(appRoot, 'app', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.on('console-message', (event, level, message) => {
    if (/Electron Security Warning/.test(message)) {
      return;
    }
    if (level >= 2) {
      errors.push(message);
    }
  });
  window.webContents.on('render-process-gone', (event, details) => {
    errors.push(`render-process-gone: ${details.reason}`);
  });

  await window.loadFile(path.join(appRoot, 'app', 'renderer', 'course.html'));
  await new Promise((resolve) => setTimeout(resolve, 500));

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const daysButton = document.querySelector('[data-view="days"]');
      daysButton.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const daysVisible = document.querySelector('[data-panel="days"]').hidden === false;
      const activeDays = daysButton.classList.contains('is-active');
      const webButton = [...document.querySelectorAll('[data-panel="days"] .card-button')]
        .find((button) => button.textContent.includes('Webvariante'));
      webButton.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        daysVisible,
        activeDays,
        currentTitle: document.querySelector('[data-current-title]').textContent,
        viewerSrc: document.querySelector('[data-viewer]').getAttribute('src'),
        hasViewerShell: Boolean(document.querySelector('[data-viewer-shell]'))
      };
    })();
  `);

  if (errors.length) {
    throw new Error(errors.join('\\n'));
  }
  if (!result.daysVisible || !result.activeDays) {
    throw new Error(`Navigation reagiert nicht: ${JSON.stringify(result)}`);
  }
  if (!/Tag 1.+Webvariante/.test(result.currentTitle) || !/tag_01/i.test(result.viewerSrc || '')) {
    throw new Error(`Webvariante wurde nicht in den Viewer geladen: ${JSON.stringify(result)}`);
  }
  if (!result.hasViewerShell) {
    throw new Error(`Viewer-Sprungziel fehlt: ${JSON.stringify(result)}`);
  }

  await window.close();
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exit(1);
});
