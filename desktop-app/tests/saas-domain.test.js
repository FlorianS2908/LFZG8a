const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('saas foundation domain services pass package tests', () => {
  const testFile = path.resolve(__dirname, '..', '..', 'packages', 'course-management', 'tests', 'course-management-domain.test.ts');
  execFileSync(process.execPath, [testFile], {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'inherit'
  });
});
