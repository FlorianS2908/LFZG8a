const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Sandboxed preloads may only require Electron and a small allow-list of Node
// built-ins. Keep this explicit mirror in sync with analysis-ipc-contract.js;
// the contract test guards against drift without loading project modules here.
const DOCUMENT_ANALYSIS_CHANNELS = Object.freeze({
  start: 'factory:start-document-analysis',
  progress: 'factory:get-analysis-progress',
  cancel: 'factory:cancel-ai-operation',
  generatePlan: 'factory:generate-structured-course-plan'
});

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('lfzq8aDesktop', {
  apiVersion: 1,
  factory: {
    getState: invoke('factory:get-state'), duplicateContainer: invoke('factory:duplicate-container'), importFiles: invoke('factory:import-files'),
    createCurriculumAnchor: invoke('factory:create-curriculum-anchor'), analyzeCurriculumAnchor: invoke('factory:analyze-curriculum-anchor'),
    getCurriculumDraft: invoke('factory:get-curriculum-draft'), updateCurriculumDraft: invoke('factory:update-curriculum-draft'),
    moveCurriculumTopic: invoke('factory:move-curriculum-topic'), approveCurriculumDraft: invoke('factory:approve-curriculum-draft'),
    listCurriculumDrafts: invoke('factory:list-curriculum-drafts'), removeCurriculumDraft: invoke('factory:remove-curriculum-draft'),
    parseCoursePlan: invoke('factory:parse-course-plan'), getAiProviderStatus: invoke('factory:get-ai-provider-status'),
    getCourseProject: invoke('factory:get-course-project'), upsertCourseProject: invoke('factory:upsert-course-project'),
    getPathForFile: (file) => webUtils.getPathForFile(file), importSourceFile: invoke('factory:import-source-file'),
    startDocumentAnalysis: invoke(DOCUMENT_ANALYSIS_CHANNELS.start), getAnalysisProgress: invoke(DOCUMENT_ANALYSIS_CHANNELS.progress),
    cancelAiOperation: invoke(DOCUMENT_ANALYSIS_CHANNELS.cancel), savePlanningFrame: invoke('factory:save-planning-frame'),
    saveCourseScope: invoke('factory:save-course-scope'),
    generateStructuredCoursePlan: invoke(DOCUMENT_ANALYSIS_CHANNELS.generatePlan), saveStructuredCoursePlan: invoke('factory:save-structured-course-plan'),
    acknowledgeDocumentFailure: invoke('factory:acknowledge-document-failure'),
    approveStructuredCoursePlan: invoke('factory:approve-structured-course-plan'),
    testOpenAiConnection: invoke('factory:test-openai-connection'),
    selectOpenAiKeyTxt: invoke('factory:select-openai-key-txt'), replaceOpenAiKey: invoke('factory:replace-openai-key'),
    clearOpenAiKey: invoke('factory:clear-openai-key'), updateAiModel: invoke('factory:update-ai-model'), estimateAiCost: invoke('factory:estimate-ai-cost'),
    openOpenAiSetupGuide: invoke('factory:open-openai-setup-guide'), runPreflight: invoke('factory:run-preflight'),
    previewPromptQuality: invoke('factory:preview-prompt-quality'), runPromptGoldenTests: invoke('factory:run-prompt-golden-tests'),
    runTestDraft: invoke('factory:run-test-draft'), listPresets: invoke('factory:list-presets'), applyPreset: invoke('factory:apply-preset'),
    recommendDidacticProfiles: invoke('factory:recommend-didactic-profiles'), evaluateDidacticFit: invoke('factory:evaluate-didactic-fit'),
    evaluateAllDidacticFits: invoke('factory:evaluate-all-didactic-fits'), createDidacticPreview: invoke('factory:create-didactic-preview'),
    deleteGeneratedDraft: invoke('factory:delete-generated-draft'), deleteLastTestDraft: invoke('factory:delete-last-test-draft'),
    clearStaging: invoke('factory:clear-staging'), listStorageUsage: invoke('factory:list-storage-usage'),
    generateDayDraft: invoke('factory:generate-day-draft'), generateAllDayDrafts: invoke('factory:generate-all-day-drafts'),
    reviseDayDraft: invoke('factory:revise-day-draft'), createPlanContainerDraft: invoke('factory:create-plan-container-draft'),
    validateGeneratedContainer: invoke('factory:validate-generated-container'), openGeneratedDraft: invoke('factory:open-generated-draft'),
    updateMapping: invoke('factory:update-mapping'), validateBatch: invoke('factory:validate-batch'),
    createContainerFromBatch: invoke('factory:create-container-from-batch'), publishContainer: invoke('factory:publish-container'),
    disableContainer: invoke('factory:disable-container'), archiveContainer: invoke('factory:archive-container'),
    importReferenceSources: invoke('factory:import-reference-sources'), listReferenceSources: invoke('factory:list-reference-sources'),
    getReferenceSource: invoke('factory:get-reference-source'), searchReferences: invoke('factory:search-references'),
    removeReferenceSource: invoke('factory:remove-reference-source'), getReferenceSafetyReport: invoke('factory:get-reference-safety-report')
  }
});
