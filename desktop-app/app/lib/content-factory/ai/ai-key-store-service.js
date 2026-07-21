const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('../../json-store');
const { OpenAIProvider } = require('./openai-provider');

const defaultModel = 'gpt-5.4-mini';

function createAiKeyStoreService({ appData, safeStorage, configPath, migrationPath, now = () => new Date() } = {}) {
  const secureDir = path.join(appData.dataDir, 'secure');
  const storePath = configPath || path.join(secureDir, 'ai-provider-config.json');

  function assertAuthorized(session) {
    if (!session?.authenticated || !session?.user) throw new Error('Keine lokale Berechtigung für KI-Einstellungen.');
  }

  function assertEncryptionAvailable() {
    if (!safeStorage?.isEncryptionAvailable?.()) {
      throw new Error('Sichere Windows-Verschlüsselung ist nicht verfügbar. Der Schlüssel wurde nicht gespeichert.');
    }
  }

  function readConfig() {
    ensureDir(secureDir);
    return readJson(storePath, {});
  }

  function saveConfig(config) {
    ensureDir(secureDir);
    writeJson(storePath, config);
    return config;
  }

  function decryptKey(config = readConfig()) {
    if (!config.encryptedOpenAiKey) return '';
    assertEncryptionAvailable();
    try {
      return safeStorage.decryptString(Buffer.from(config.encryptedOpenAiKey, 'base64'));
    } catch {
      throw new Error('Der gespeicherte OpenAI-Schlüssel konnte nicht sicher gelesen werden. Bitte richten Sie ihn erneut ein.');
    }
  }

  function storeKey(key, session, source = 'admin-key-store') {
    assertAuthorized(session);
    assertEncryptionAvailable();
    const normalized = String(key || '').trim();
    if (!normalized) throw new Error('Die Schlüsseldatei ist leer oder enthält keinen verwendbaren Wert.');
    const existing = readConfig();
    const configuredAt = existing.configuredAt || now().toISOString();
    const encrypted = safeStorage.encryptString(normalized);
    saveConfig({
      ...existing,
      provider: 'openai',
      configured: true,
      model: existing.model || process.env.OPENAI_MODEL || defaultModel,
      keySource: source,
      encryptedOpenAiKey: Buffer.from(encrypted).toString('base64'),
      configuredAt,
      updatedAt: now().toISOString(),
      connectionTestStatus: 'unknown',
      connectionTestedAt: ''
    });
    return { success: true, provider: 'openai', configured: true, model: existing.model || process.env.OPENAI_MODEL || defaultModel, keySource: source, message: 'OpenAI-Schlüssel wurde sicher eingerichtet.' };
  }

  function getOpenAiKeyForServerUse() {
    const value = decryptKey();
    return value ? { value, source: 'admin-key-store' } : { value: '', source: 'missing' };
  }

  function getAiProviderSafeStatus() {
    const config = readConfig();
    let configured = false;
    let encryptionAvailable = Boolean(safeStorage?.isEncryptionAvailable?.());
    try { configured = Boolean(config.encryptedOpenAiKey && decryptKey(config)); } catch { configured = false; }
    return {
      provider: config.provider || 'openai',
      configured,
      model: config.model || process.env.OPENAI_MODEL || defaultModel,
      keySource: configured ? 'admin-key-store' : 'missing',
      configuredAt: config.configuredAt || '',
      updatedAt: config.updatedAt || '',
      lastSuccessfulTestAt: config.lastSuccessfulTestAt || '',
      connectionTestStatus: config.connectionTestStatus || 'unknown',
      encryptionAvailable
    };
  }

  function importOpenAiKeyFromTxt(filePath, session, { overwrite = false } = {}) {
    assertAuthorized(session);
    if (!filePath || !fs.existsSync(filePath)) throw new Error('Schlüsseldatei wurde nicht gefunden.');
    const existing = getAiProviderSafeStatus();
    if (existing.configured && !overwrite) return { success: false, configured: true, reason: 'already-configured', message: 'Ein OpenAI-Schlüssel ist bereits sicher eingerichtet und wurde nicht überschrieben.' };
    const key = fs.readFileSync(filePath, 'utf8').trim();
    return storeKey(key, session);
  }

  function importMigrationKeyOnce(session) {
    if (!migrationPath || getAiProviderSafeStatus().configured || !fs.existsSync(migrationPath)) {
      return { success: false, reason: 'not-required' };
    }
    return importOpenAiKeyFromTxt(migrationPath, session);
  }

  function replaceOpenAiKey(value, session) {
    return storeKey(value, session);
  }

  function clearOpenAiKey(session) {
    assertAuthorized(session);
    const existing = readConfig();
    saveConfig({ ...existing, configured: false, keySource: 'missing', encryptedOpenAiKey: undefined, updatedAt: now().toISOString(), connectionTestStatus: 'unknown', connectionTestedAt: '', lastSuccessfulTestAt: '' });
    return { success: true, provider: 'openai', configured: false, model: existing.model || defaultModel, keySource: 'missing', message: 'Gespeicherter OpenAI-Schlüssel wurde entfernt. Der Offline-Fallback bleibt aktiv.' };
  }

  function updateAiModel(model, session) {
    assertAuthorized(session);
    const safeModel = String(model || '').trim();
    if (!/^[a-zA-Z0-9._:-]{2,100}$/.test(safeModel)) throw new Error('Die Modellbezeichnung ist ungültig.');
    saveConfig({ ...readConfig(), model: safeModel, updatedAt: now().toISOString() });
    return getAiProviderSafeStatus();
  }

  async function testOpenAiConnection(session, options = {}) {
    assertAuthorized(session);
    const keyInfo = getOpenAiKeyForServerUse();
    const status = getAiProviderSafeStatus();
    if (!keyInfo.value) return { status: 'warning', provider: 'openai', model: status.model, keySource: 'missing', errorCategory: 'missing-key', message: 'OpenAI ist nicht eingerichtet.' };
    const provider = new OpenAIProvider({ apiKey: keyInfo.value, keySource: keyInfo.source, model: status.model, timeoutMs: options.timeoutMs || 10000 });
    const result = await provider.testConnection();
    const testedAt = now().toISOString();
    saveConfig({ ...readConfig(), connectionTestStatus: result.status, connectionTestedAt: testedAt, lastSuccessfulTestAt: result.status === 'success' ? testedAt : readConfig().lastSuccessfulTestAt || '' });
    return { status: result.status, provider: 'openai', model: status.model, keySource: keyInfo.source, errorCategory: result.status === 'success' ? '' : result.errorCategory || 'connection-failed', message: result.status === 'success' ? 'OpenAI-Verbindung erfolgreich' : 'OpenAI-Verbindung konnte nicht bestätigt werden.' };
  }

  return { storePath, migrationPath, importOpenAiKeyFromTxt, importMigrationKeyOnce, replaceOpenAiKey, getOpenAiKeyForServerUse, getAiProviderSafeStatus, clearOpenAiKey, testOpenAiConnection, updateAiModel };
}

module.exports = { createAiKeyStoreService, defaultModel };
