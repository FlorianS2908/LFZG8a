const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [
  'app/main.js',
  'app/preload.js',
  'app/renderer/wizard.js',
  'app/renderer/course-navigation.js',
  'app/renderer/course-content-groups.js',
  'app/renderer/course-schedule.js',
  'app/renderer/course.js',
  'app/renderer/tool-center/login.js',
  'app/renderer/tool-center/workspace.js',
  'app/renderer/tool-center/factory.js',
  'app/renderer/tool-center/release-center.js',
  'app/renderer/tool-center/user-create.js',
  'app/renderer/tool-center/admin-tool.js',
  'app/renderer/tool-center/course-management.js',
  'app/lib',
  'scripts/workflow-check.js',
  'tests/admin-tools.test.js',
  'tests/container-registry.test.js',
  'tests/course-management.test.js',
  'tests/electron-course-smoke.js',
  'tests/electron-workspace-smoke.js'
];

const files = targets.flatMap((target) => collectJs(path.join(root, target)));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status);
}

function collectJs(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.js') ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    return collectJs(path.join(target, entry.name));
  });
}
