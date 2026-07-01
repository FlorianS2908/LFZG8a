const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lfzq8aDesktop', {
  getSetupState: () => ipcRenderer.invoke('setup:get-state'),
  saveSetup: (settings) => ipcRenderer.invoke('setup:save', settings),
  startWorkshop: () => ipcRenderer.invoke('setup:start-workshop'),
  openTeacherInfo: (url) => ipcRenderer.invoke('teacher:open', url),
  listHistory: () => ipcRenderer.invoke('history:list'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  resetHistory: () => ipcRenderer.invoke('history:reset'),
  createTestReport: () => ipcRenderer.invoke('test-report:create'),
  listTestReports: () => ipcRenderer.invoke('test-report:list'),
  openTestReportDir: () => ipcRenderer.invoke('test-report:open-dir'),
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir')
});

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a.teacher-open');
    if (!link || !window.lfzq8aDesktop) {
      return;
    }

    event.preventDefault();
    window.lfzq8aDesktop.openTeacherInfo(link.href);
  });
});
