const DOCUMENT_ANALYSIS_CHANNELS = Object.freeze({
  start: 'factory:start-document-analysis',
  progress: 'factory:get-analysis-progress',
  cancel: 'factory:cancel-ai-operation',
  generatePlan: 'factory:generate-structured-course-plan',
  startPlanning: 'factory:start-course-planning',
  operationStatus: 'factory:get-operation-status',
  planningResult: 'factory:get-planning-result'
});

module.exports = { DOCUMENT_ANALYSIS_CHANNELS };
