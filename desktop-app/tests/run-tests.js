const { spawnSync } = require('child_process');
const path = require('path');

const files = ['standalone-architecture.test.js', 'content-factory.test.js', 'course-planning.test.js', 'json-store.test.js'];
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});
process.exit(result.status ?? 1);
