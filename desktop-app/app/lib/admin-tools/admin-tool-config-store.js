const path = require('path');
const { ensureDir, readJson, writeJson } = require('../json-store');
const { getAdminTool } = require('./admin-tool-registry');

function createAdminToolConfigStore(dataDir) {
  const configDir = path.join(dataDir, 'admin-tools');
  const configPath = path.join(configDir, 'admin-tool-config.json');

  function readAll() {
    ensureDir(configDir);
    return readJson(configPath, {});
  }

  function listConfigs() {
    const stored = readAll();
    return Object.fromEntries(Object.entries(stored).map(([toolId, config]) => [
      toolId,
      { ...getAdminTool(toolId)?.defaultConfig, ...(config || {}) }
    ]));
  }

  function getConfig(toolId) {
    const tool = getAdminTool(toolId);
    if (!tool) {
      throw new Error('Admin-Werkzeug wurde nicht gefunden.');
    }
    return {
      ...tool.defaultConfig,
      ...(readAll()[toolId] || {})
    };
  }

  function saveConfig(toolId, patch = {}) {
    const tool = getAdminTool(toolId);
    if (!tool) {
      throw new Error('Admin-Werkzeug wurde nicht gefunden.');
    }
    const stored = readAll();
    const nextConfig = {
      ...tool.defaultConfig,
      ...(stored[toolId] || {}),
      ...(patch || {})
    };
    writeJson(configPath, {
      ...stored,
      [toolId]: nextConfig
    });
    return nextConfig;
  }

  return {
    configDir,
    configPath,
    listConfigs,
    getConfig,
    saveConfig
  };
}

module.exports = {
  createAdminToolConfigStore
};
