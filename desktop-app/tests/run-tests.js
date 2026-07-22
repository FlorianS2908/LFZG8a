const { spawnSync } = require('child_process');
const path = require('path');

const files = ['standalone-architecture.test.js', 'content-factory.test.js', 'course-planning.test.js', 'canonical-course-plan.test.js', 'topic-review.test.js', 'source-extraction-regression.test.js', 'plan-review-model.test.js', 'workflow-progress.test.js', 'document-analysis-workflow.test.js', 'operation-progress.test.js', 'source-storage.test.js', 'document-preparation.test.js', 'safe-logger.test.js', 'json-store.test.js', 'workflow-hardening.test.js', 'planning-review-ui.test.js', 'didactic-course-configuration.test.js'];
const result = spawnSync(process.execPath, ['--test', '--test-isolation=none', ...files], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});
process.exit(result.status ?? 1);
