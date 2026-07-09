const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { moduleRegistry } = require('../app/lib/modules/module-registry');
const { listAdminTools, getAdminTool } = require('../app/lib/admin-tools/admin-tool-registry');
const { getGuide } = require('../app/lib/admin-tools/admin-tool-guide-service');
const { createAdminToolConfigStore } = require('../app/lib/admin-tools/admin-tool-config-store');
const { runAdminTool } = require('../app/lib/admin-tools/admin-tool-runner');

test('admin tools are registered as non assignable admin containers with guides', () => {
  const toolIds = listAdminTools().map((tool) => tool.id);
  [
    'container-adapter',
    'import-analysis',
    'course-generator',
    'quiz-builder',
    'container-export',
    'ai-provider-config',
    'test-center',
    'system-diagnostics'
  ].forEach((toolId) => {
    const module = moduleRegistry.getModuleById(toolId);
    const guide = getGuide(toolId);
    assert.equal(toolIds.includes(toolId), true);
    assert.equal(Boolean(getAdminTool(toolId)), true);
    assert.equal(module.manifest.category, 'admin');
    assert.equal(module.manifest.containerType, 'system');
    assert.equal(module.manifest.assignable, false);
    assert.equal(module.manifest.department, 'ALLGEMEIN');
    assert.equal(module.manifest.allowedRoles.includes('Admin'), true);
    assert.equal(Boolean(module.manifest.courseName), true);
    assert.equal(Boolean(module.manifest.courseId), true);
    assert.equal(guide.steps.length > 0, true);
    assert.equal(typeof guide.configuration, 'object');
  });
});

test('admin tool configuration is stored locally without product data changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uetool-admin-tools-'));
  try {
    const store = createAdminToolConfigStore(path.join(dir, 'data'));
    const saved = store.saveConfig('test-center', { defaultRun: 'workflow-check', dangerousTestsDisabled: true });
    const loaded = store.getConfig('test-center');
    assert.equal(saved.defaultRun, 'workflow-check');
    assert.equal(loaded.defaultRun, 'workflow-check');
    assert.equal(loaded.dangerousTestsDisabled, true);
    assert.equal(fs.existsSync(store.configPath), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('admin tool runner produces non destructive previews', () => {
  const testCenter = runAdminTool('test-center', { projectRoot: path.resolve(__dirname, '..', '..') });
  const diagnostics = runAdminTool('system-diagnostics', { projectRoot: path.resolve(__dirname, '..', '..') });
  assert.equal(testCenter.mode, 'preview');
  assert.equal(testCenter.report.some((line) => /Gefundene Testdateien/.test(line)), true);
  assert.equal(diagnostics.report.some((line) => /module-registry/.test(line)), true);
});
