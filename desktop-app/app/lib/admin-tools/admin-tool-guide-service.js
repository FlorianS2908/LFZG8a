const { getAdminTool, listAdminTools } = require('./admin-tool-registry');

function getGuide(toolId) {
  const tool = getAdminTool(toolId);
  if (!tool) {
    throw new Error('Admin-Werkzeug wurde nicht gefunden.');
  }
  return {
    title: tool.title,
    summary: tool.summary,
    whatItDoes: tool.summary,
    whenToUse: tool.whenToUse,
    steps: tool.steps,
    configuration: tool.defaultConfig
  };
}

function listGuides() {
  return listAdminTools().map((tool) => getGuide(tool.id));
}

module.exports = {
  getGuide,
  listGuides
};
