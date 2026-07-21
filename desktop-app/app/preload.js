const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('lfzq8aDesktop', {
  factory: {
    getState: invoke('factory:get-state'), duplicateContainer: invoke('factory:duplicate-container'), importFiles: invoke('factory:import-files'),
    createCurriculumAnchor: invoke('factory:create-curriculum-anchor'), analyzeCurriculumAnchor: invoke('factory:analyze-curriculum-anchor'),
    getCurriculumDraft: invoke('factory:get-curriculum-draft'), updateCurriculumDraft: invoke('factory:update-curriculum-draft'),
    moveCurriculumTopic: invoke('factory:move-curriculum-topic'), approveCurriculumDraft: invoke('factory:approve-curriculum-draft'),
    listCurriculumDrafts: invoke('factory:list-curriculum-drafts'), removeCurriculumDraft: invoke('factory:remove-curriculum-draft'),
    parseCoursePlan: invoke('factory:parse-course-plan'), getAiProviderStatus: invoke('factory:get-ai-provider-status'),
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
