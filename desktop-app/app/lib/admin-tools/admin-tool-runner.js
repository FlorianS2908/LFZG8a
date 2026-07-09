const fs = require('fs');
const path = require('path');
const { getAdminTool } = require('./admin-tool-registry');

function summarizeTests(projectRoot) {
  const testsDir = path.join(projectRoot, 'desktop-app', 'tests');
  if (!fs.existsSync(testsDir)) {
    return { files: 0, names: [] };
  }
  const files = fs.readdirSync(testsDir).filter((fileName) => fileName.endsWith('.test.js'));
  return { files: files.length, names: files };
}

function runAdminTool(toolId, context = {}) {
  const tool = getAdminTool(toolId);
  if (!tool) {
    throw new Error('Admin-Werkzeug wurde nicht gefunden.');
  }
  const projectRoot = context.projectRoot || process.cwd();
  const result = {
    toolId,
    title: tool.title,
    mode: 'preview',
    createdAt: new Date().toISOString(),
    report: [],
    warnings: []
  };

  if (toolId === 'test-center') {
    const summary = summarizeTests(projectRoot);
    result.report.push(`Gefundene Testdateien: ${summary.files}`);
    result.report.push(...summary.names.slice(0, 12).map((name) => `- ${name}`));
    result.warnings.push('Tests werden in dieser Vorschau nicht ausgefuehrt.');
  } else if (toolId === 'system-diagnostics') {
    ['desktop-app/app/lib/modules/module-registry.js', 'desktop-app/app/lib/modules/lfzq8a-container.js', 'desktop-app/app/renderer/tool-center/workspace.html'].forEach((relativePath) => {
      result.report.push(`${relativePath}: ${fs.existsSync(path.join(projectRoot, relativePath)) ? 'vorhanden' : 'fehlt'}`);
    });
  } else {
    result.report.push('Vorschau bereit. Dieses Werkzeug arbeitet nicht destruktiv und erzeugt erst nach expliziter Bestaetigung Drafts oder Berichte.');
  }

  return result;
}

module.exports = {
  runAdminTool
};
