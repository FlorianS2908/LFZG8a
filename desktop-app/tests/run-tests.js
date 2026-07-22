const { spawnSync } = require('child_process');
const path = require('path');

const files = ['standalone-architecture.test.js', 'content-factory.test.js', 'course-planning.test.js', 'document-analysis-workflow.test.js', 'source-storage.test.js', 'document-preparation.test.js', 'safe-logger.test.js', 'json-store.test.js', 'workflow-hardening.test.js', 'planning-review-ui.test.js'];
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});
process.exit(result.status ?? 1);
