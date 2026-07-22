const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { migrateLegacyUserData } = require('../app/lib/courseforge-storage-migration');

const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');

test('Package-, Fenster-, Installer- und UI-Metadaten verwenden CourseForge', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); const rootPackage = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  const main = fs.readFileSync(path.join(root, 'app', 'main.js'), 'utf8'); const html = fs.readFileSync(path.join(root, 'app', 'renderer', 'tool-center', 'factory.html'), 'utf8');
  assert.equal(packageJson.name, 'courseforge'); assert.equal(rootPackage.name, 'courseforge'); assert.equal(packageJson.productName, 'CourseForge'); assert.equal(packageJson.build.productName, 'CourseForge');
  assert.equal(packageJson.build.executableName, 'CourseForge'); assert.equal(packageJson.build.nsis.shortcutName, 'CourseForge'); assert.match(main, /title: 'CourseForge'/); assert.match(html, /<title>CourseForge<\/title>/); assert.match(html, /The AI-powered Course Compiler/);
});

test('Alte Projektdaten werden im Hintergrund kopiert, sofort gelesen und niemals überschrieben', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'courseforge-migration-')); const legacy = path.join(temp, 'legacy'); const current = path.join(temp, 'CourseForge');
  fs.mkdirSync(path.join(legacy, 'projects', 'content-factory', 'course-projects'), { recursive: true }); fs.writeFileSync(path.join(legacy, 'projects', 'content-factory', 'course-projects', 'alt.json'), '{"title":"Alt"}', 'utf8');
  const first = migrateLegacyUserData({ newUserDataDir: current, legacyUserDataDirs: [legacy], logger: { info() {}, warn() {} } }); assert.equal(first.reason, 'copy_started'); assert.equal(first.activeProjectsDir, path.join(legacy, 'projects')); await first.completion; assert.equal(fs.existsSync(path.join(current, 'projects', 'content-factory', 'course-projects', 'alt.json')), true);
  fs.writeFileSync(path.join(current, 'projects', 'content-factory', 'course-projects', 'alt.json'), '{"title":"Neu"}', 'utf8'); const second = migrateLegacyUserData({ newUserDataDir: current, legacyUserDataDirs: [legacy], logger: { info() {} } }); assert.equal(second.reason, 'already_checked'); assert.match(fs.readFileSync(path.join(current, 'projects', 'content-factory', 'course-projects', 'alt.json'), 'utf8'), /Neu/);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('Starter bleibt nach Ordnerumbenennung relativ und alter Name ist nur Kompatibilitätswrapper', () => {
  const starter = fs.readFileSync(path.join(repo, 'CourseForgeStart.cmd'), 'utf8'); const legacy = fs.readFileSync(path.join(repo, 'ContentFactoryMainStart.cmd'), 'utf8'); assert.match(starter, /set "ROOT_DIR=%~dp0"/); assert.doesNotMatch(starter, /[A-Za-z]:\\Users\\/); assert.match(legacy, /CourseForgeStart\.cmd/);
});
