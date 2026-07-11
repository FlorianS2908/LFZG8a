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
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir'),
  getWorkspaceState: () => ipcRenderer.invoke('workspace:get-state'),
  saveWorkspaceProfile: (profile) => ipcRenderer.invoke('workspace:save-profile', profile),
  openLanding: () => ipcRenderer.invoke('workspace:open-landing'),
  openLfzq8a: () => ipcRenderer.invoke('workspace:open-lfzq8a'),
  openModule: (moduleId) => ipcRenderer.invoke('workspace:open-module', moduleId),
  openWizard: () => ipcRenderer.invoke('workspace:open-wizard'),
  auth: {
    getState: () => ipcRenderer.invoke('auth:get-state'),
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    register: (input) => ipcRenderer.invoke('auth:register', input),
    logout: () => ipcRenderer.invoke('auth:logout'),
    changePassword: (input) => ipcRenderer.invoke('auth:change-password', input)
  },
  courseSettings: {
    get: (courseId) => ipcRenderer.invoke('course-settings:get', courseId),
    save: (courseId, settings) => ipcRenderer.invoke('course-settings:save', courseId, settings)
  },
  factory: {
    getState: () => ipcRenderer.invoke('factory:get-state'),
    duplicateContainer: (options) => ipcRenderer.invoke('factory:duplicate-container', options),
    importFiles: (input) => ipcRenderer.invoke('factory:import-files', input),
    parseCoursePlan: (input) => ipcRenderer.invoke('factory:parse-course-plan', input),
    getAiProviderStatus: () => ipcRenderer.invoke('factory:get-ai-provider-status'),
    generateDayDraft: (input) => ipcRenderer.invoke('factory:generate-day-draft', input),
    createPlanContainerDraft: (input) => ipcRenderer.invoke('factory:create-plan-container-draft', input),
    validateGeneratedContainer: (containerId) => ipcRenderer.invoke('factory:validate-generated-container', containerId),
    openGeneratedDraft: (containerId, target) => ipcRenderer.invoke('factory:open-generated-draft', containerId, target),
    updateMapping: (batchId, fileId, mapping) => ipcRenderer.invoke('factory:update-mapping', batchId, fileId, mapping),
    validateBatch: (batchId) => ipcRenderer.invoke('factory:validate-batch', batchId),
    createContainerFromBatch: (batchId, options) => ipcRenderer.invoke('factory:create-container-from-batch', batchId, options),
    publishContainer: (containerId, options) => ipcRenderer.invoke('factory:publish-container', containerId, options),
    disableContainer: (containerId) => ipcRenderer.invoke('factory:disable-container', containerId),
    archiveContainer: (containerId) => ipcRenderer.invoke('factory:archive-container', containerId),
    importReferenceSources: (input) => ipcRenderer.invoke('factory:import-reference-sources', input),
    listReferenceSources: () => ipcRenderer.invoke('factory:list-reference-sources'),
    getReferenceSource: (referenceId) => ipcRenderer.invoke('factory:get-reference-source', referenceId),
    searchReferences: (query) => ipcRenderer.invoke('factory:search-references', query),
    removeReferenceSource: (referenceId) => ipcRenderer.invoke('factory:remove-reference-source', referenceId),
    getReferenceSafetyReport: (referenceId) => ipcRenderer.invoke('factory:get-reference-safety-report', referenceId)
  },
  releaseCenter: {
    getState: () => ipcRenderer.invoke('release-center:get-state'),
    saveAssignments: (userId, moduleIds) => ipcRenderer.invoke('release-center:save-assignments', userId, moduleIds),
    revokePendingRegistration: (id) => ipcRenderer.invoke('release-center:revoke-pending-registration', id)
  },
  userCreate: {
    createPendingRegistration: (input) => ipcRenderer.invoke('user-create:create-pending-registration', input)
  },
  adminTools: {
    list: () => ipcRenderer.invoke('admin-tools:list'),
    getState: (toolId) => ipcRenderer.invoke('admin-tools:get-state', toolId),
    saveConfig: (toolId, config) => ipcRenderer.invoke('admin-tools:save-config', toolId, config),
    runPreview: (toolId) => ipcRenderer.invoke('admin-tools:run-preview', toolId)
  },
  courseManagement: {
    getState: () => ipcRenderer.invoke('course-management:get-state'),
    createCourse: (input) => ipcRenderer.invoke('course-management:create-course', input),
    assignMember: (courseInstanceId, userId, roleInCourse) => ipcRenderer.invoke('course-management:assign-member', courseInstanceId, userId, roleInCourse),
    assignContainer: (courseInstanceId, contentContainerId) => ipcRenderer.invoke('course-management:assign-container', courseInstanceId, contentContainerId),
    updateStatus: (courseInstanceId, status, expectedRevision) => ipcRenderer.invoke('course-management:update-status', courseInstanceId, status, expectedRevision)
  },
  dokuTool: {
    getQuizConfig: () => ipcRenderer.invoke('dokutool:quiz-config'),
    getQuizQuestions: (query) => ipcRenderer.invoke('dokutool:quiz-questions', query),
    saveQuizProfile: (profile) => ipcRenderer.invoke('dokutool:quiz-profile-save', profile),
    analyze: (input) => ipcRenderer.invoke('dokutool:analyze', input),
    listReports: () => ipcRenderer.invoke('dokutool:reports-list'),
    getReport: (reportId) => ipcRenderer.invoke('dokutool:report-get', reportId)
  }
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
