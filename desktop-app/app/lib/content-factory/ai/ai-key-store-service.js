const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('../../json-store');
const { OpenAIProvider } = require('./openai-provider');

const defaultModel = 'gpt-5.4-mini';
const defaultImportPath = path.join(process.env.USERPROFILE || '', 'OneDrive - Amadeus Fire AG', 'Desktop', 'api_key_ContentFactory.txt');

function createAiKeyStoreService({ appData, configPath } = {}) {
  const secureDir = path.join(appData.dataDir, 'secure');
  const storePath = configPath || path.join(secureDir, 'ai-provider-config.json');

  function ensureStore() {
    ensureDir(secureDir);
  }

  function assertAdmin(session) {
    const roles = session?.user?.roles || [];
    if (!session?.authenticated || (!roles.includes('Admin') && !roles.includes('SuperAdmin'))) {
      throw new Error('Keine Adminrechte fuer KI-Einstellungen.');
    }
  }

  function readConfig() {
    ensureStore();
    return readJson(storePath, {});
  }

  function saveConfig(config) {
    ensureStore();
    writeJson(storePath, config);
    return config;
  }

  function encodeKey(value) {
    return Buffer.from(String(value || ''), 'utf8').toString('base64');
  }

  function decodeKey(value) {
    try {
      return Buffer.from(String(value || ''), 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  function isPlausibleOpenAiKey(value) {
    const prefix = 's' + 'k-';
    return String(value || '').startsWith(prefix) && String(value || '').trim().length >= 20;
  }

  function getOpenAiKeyForServerUse() {
    const config = readConfig();
    const value = decodeKey(config.openAiKeyLocal);
    if (!value) return { value: '', source: 'missing' };
    return { value, source: 'admin-key-store' };
  }

  function getAiProviderSafeStatus() {
    const config = readConfig();
    const key = getOpenAiKeyForServerUse();
    const defaultPathAvailable = fs.existsSync(defaultImportPath);
    return {
      provider: config.provider || 'local',
      configured: Boolean(key.value),
      model: config.model || defaultModel,
      keySource: key.value ? 'admin-key-store' : 'missing',
      updatedAt: config.updatedAt || '',
      updatedBy: config.updatedBy || '',
      defaultPathAvailable,
      defaultPathStatus: defaultPathAvailable ? 'Key-Datei gefunden' : 'Key-Datei am Standardpfad nicht gefunden',
      connectionTestStatus: config.connectionTestStatus || 'unknown'
    };
  }

  function importOpenAiKeyFromTxt(filePath, session) {
    assertAdmin(session);
    ensureStore();
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Key-Datei wurde nicht gefunden.');
    }
    const key = fs.readFileSync(filePath, 'utf8').trim();
    if (!isPlausibleOpenAiKey(key)) {
      throw new Error('Der gelesene Wert sieht nicht wie ein OpenAI API-Key aus.');
    }
    const existing = readConfig();
    const updated = saveConfig({
      ...existing,
      provider: 'openai',
      configured: true,
      model: existing.model || defaultModel,
      keySource: 'admin-key-store',
      openAiKeyLocal: encodeKey(key),
      updatedAt: new Date().toISOString(),
      updatedBy: session?.user?.email || session?.user?.id || 'admin'
    });
    let deletedSourceFile = false;
    try {
      fs.rmSync(filePath, { force: true });
      deletedSourceFile = !fs.existsSync(filePath);
    } catch {
      deletedSourceFile = false;
    }
    if (!deletedSourceFile) {
      throw new Error('OpenAI-Key wurde gespeichert, aber die TXT-Datei konnte nicht geloescht werden.');
    }
    return {
      success: true,
      provider: 'openai',
      configured: true,
      model: updated.model || defaultModel,
      keySource: 'admin-key-store',
      deletedSourceFile,
      sourcePathType: filePath === defaultImportPath ? 'standard-path' : 'custom-path',
      message: 'OpenAI-Key wurde uebernommen. Die TXT-Datei wurde geloescht.'
    };
  }

  function clearOpenAiKey(session) {
    assertAdmin(session);
    const existing = readConfig();
    saveConfig({
      provider: existing.provider || 'local',
      configured: false,
      model: existing.model || defaultModel,
      keySource: 'missing',
      updatedAt: new Date().toISOString(),
      updatedBy: session?.user?.email || session?.user?.id || 'admin',
      connectionTestStatus: 'unknown'
    });
    return { success: true, provider: 'openai', configured: false, model: existing.model || defaultModel, keySource: 'missing', message: 'OpenAI-Key wurde entfernt. Local/Fallback bleibt aktiv.' };
  }

  function updateAiModel(model, session) {
    assertAdmin(session);
    const safeModel = String(model || '').trim() || defaultModel;
    const existing = readConfig();
    saveConfig({
      ...existing,
      model: safeModel,
      updatedAt: new Date().toISOString(),
      updatedBy: session?.user?.email || session?.user?.id || 'admin'
    });
    return getAiProviderSafeStatus();
  }

  async function testOpenAiConnection(session, options = {}) {
    assertAdmin(session);
    const keyInfo = getOpenAiKeyForServerUse();
    const status = getAiProviderSafeStatus();
    if (!keyInfo.value) {
      return { status: 'warning', provider: 'openai', model: status.model, keySource: 'missing', errorCategory: 'missing-key' };
    }
    const provider = new OpenAIProvider({
      apiKey: keyInfo.value,
      keySource: keyInfo.source,
      model: status.model,
      timeoutMs: options.timeoutMs || 10000
    });
    const result = await provider.testConnection();
    const next = readConfig();
    saveConfig({ ...next, connectionTestStatus: result.status, connectionTestedAt: new Date().toISOString() });
    return {
      status: result.status,
      provider: 'openai',
      model: status.model,
      keySource: keyInfo.source,
      errorCategory: result.status === 'success' ? '' : result.errorCategory || 'connection-failed'
    };
  }

  return {
    storePath,
    defaultImportPath,
    importOpenAiKeyFromTxt,
    getOpenAiKeyForServerUse,
    getAiProviderSafeStatus,
    clearOpenAiKey,
    testOpenAiConnection,
    updateAiModel
  };
}

module.exports = {
  createAiKeyStoreService,
  defaultImportPath
};
