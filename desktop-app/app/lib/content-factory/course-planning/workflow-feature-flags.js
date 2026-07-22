const WORKFLOW_FEATURE_FLAGS = Object.freeze({
  operationEngine: true,
  artifactPersistence: false,
  layeredCache: true,
  aiUnderstanding: true,
  planVersioning: true,
  targetedRevision: true,
  structuredPreferences: true
});

function resolveWorkflowFeatureFlags(projectFlags = {}) {
  return Object.fromEntries(Object.entries(WORKFLOW_FEATURE_FLAGS).map(([key, defaultValue]) => [key, typeof projectFlags[key] === 'boolean' ? projectFlags[key] : defaultValue]));
}

module.exports = { WORKFLOW_FEATURE_FLAGS, resolveWorkflowFeatureFlags };
