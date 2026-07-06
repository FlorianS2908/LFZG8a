const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lfzq8aDesktop', {
  getSetupState: () => ipcRenderer.invoke('setup:get-state'),
  saveSetup: (settings) => ipcRenderer.invoke('setup:save', settings),
  startWorkshop: () => ipcRenderer.invoke('setup:start-workshop'),
  openTeacherInfo: (url) => ipcRenderer.invoke('teacher:open', url),
  openParticipantReleases: () => ipcRenderer.invoke('teacher:open-releases'),
  openInEditor: (target) => ipcRenderer.invoke('editor:open', target),
  getCourseState: () => ipcRenderer.invoke('course:get-state'),
  getTaskPackages: () => ipcRenderer.invoke('task-packages:get'),
  getTaskReleases: () => ipcRenderer.invoke('task-releases:get'),
  saveTaskRelease: (taskId, release) => ipcRenderer.invoke('task-release:save', taskId, release),
  bulkUpdateTaskReleases: (filter, values) => ipcRenderer.invoke('task-release:bulk', filter, values),
  resetTaskReleases: () => ipcRenderer.invoke('task-release:reset'),
  onTaskReleasesChanged: (callback) => {
    const listener = (event, releases) => callback(releases);
    ipcRenderer.on('task-releases:changed', listener);
    return () => ipcRenderer.removeListener('task-releases:changed', listener);
  },
  getParticipantReleases: () => ipcRenderer.invoke('participant-releases:get'),
  saveParticipantReleases: (releases) => ipcRenderer.invoke('participant-releases:save', releases),
  onParticipantReleasesChanged: (callback) => {
    const listener = (event, releases) => callback(releases);
    ipcRenderer.on('participant-releases:changed', listener);
    return () => ipcRenderer.removeListener('participant-releases:changed', listener);
  },
  getClassroomInfo: () => ipcRenderer.invoke('classroom:get-info'),
  listParticipants: () => ipcRenderer.invoke('classroom:list-participants'),
  listHistory: () => ipcRenderer.invoke('history:list'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  resetHistory: () => ipcRenderer.invoke('history:reset'),
  createTestReport: () => ipcRenderer.invoke('test-report:create'),
  listTestReports: () => ipcRenderer.invoke('test-report:list'),
  openTestReportDir: () => ipcRenderer.invoke('test-report:open-dir'),
  moveViewToMonitor: (viewType, displayId) => ipcRenderer.invoke('display:move-view', viewType, displayId),
  highlightMonitor: (displayId, label) => ipcRenderer.invoke('display:highlight', displayId, label),
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

  document.addEventListener('click', async (event) => {
    const button = event.target.closest && event.target.closest('[data-open-editor]');
    if (!button || !window.lfzq8aDesktop) {
      return;
    }

    event.preventDefault();
    const target = new URL(button.dataset.openEditor, window.location.href).href;
    try {
      await window.lfzq8aDesktop.openInEditor(target);
    } catch (error) {
      window.alert(`VS Code konnte nicht gestartet werden: ${error.message}`);
    }
  });
});
