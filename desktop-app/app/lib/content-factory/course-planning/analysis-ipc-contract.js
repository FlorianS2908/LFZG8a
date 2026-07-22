const API_VERSION = 2;
const DOCUMENT_ANALYSIS_CHANNELS = Object.freeze({
  start: 'factory:start-document-analysis',
  progress: 'factory:get-analysis-progress',
  cancel: 'factory:cancel-ai-operation',
  generatePlan: 'factory:generate-structured-course-plan',
  startPlanning: 'factory:start-course-planning',
  operationStatus: 'factory:get-operation-status',
  planningResult: 'factory:get-planning-result',
  aiUnderstanding: 'factory:get-ai-understanding',
  collaboration: 'factory:update-plan-collaboration',
  reviseTarget: 'factory:revise-plan-target',
  restoreVersion: 'factory:restore-plan-version',
  applyConfiguration: 'factory:apply-course-plan-configuration',
  classbookModel: 'factory:get-course-plan-classbook-model',
  exportPlan: 'factory:export-course-plan-xlsx'
});

const IPC_CONTRACTS = Object.freeze(Object.fromEntries(Object.entries(DOCUMENT_ANALYSIS_CHANNELS).map(([operation, channel]) => [operation, Object.freeze({ apiVersion: API_VERSION, channel, permission: 'admin', operation, transport: ['progress', 'operationStatus'].includes(operation) ? 'poll' : 'invoke', errorCodes: ['DOCUMENT_ANALYSIS_INPUT', 'OPERATION_NOT_FOUND', 'PLAN_TARGET_LOCKED'] })])));

module.exports = { API_VERSION, DOCUMENT_ANALYSIS_CHANNELS, IPC_CONTRACTS };
