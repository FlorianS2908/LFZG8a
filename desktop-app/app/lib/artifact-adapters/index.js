const path = require('path');

class TextArtifactAdapter {
  constructor(id, extensions) { this.id = id; this.extensions = extensions; this.editable = true; }
  supports(artifact) { return this.extensions.includes(path.extname(artifact.name || artifact.path || '').toLowerCase()); }
  async extractReviewContent(artifact) { return { artifactId: artifact.id, mediaType: 'text/plain', content: String(artifact.content || '') }; }
  async validate() { return { valid: true, errors: [] }; }
  async createPreviewModel(artifact) { return { mode: 'text', readOnly: false, content: String(artifact.content || '') }; }
  async applyChanges(artifact, changes) {
    let content = String(artifact.content || '');
    changes.forEach((change) => { if (change.operation === 'replace') content = content.replace(String(change.currentValue || ''), String(change.proposedValue || '')); else if (change.operation === 'insert') content += String(change.proposedValue || ''); });
    return { artifact: { ...artifact, content, version: Number(artifact.version || 1) + 1 }, previousVersion: { ...artifact }, appliedChanges: changes.map((change) => change.id) };
  }
}
class JsonArtifactAdapter extends TextArtifactAdapter {
  constructor() { super('json', ['.json']); }
  async validate(artifact) { try { JSON.parse(String(artifact.content || '')); return { valid: true, errors: [] }; } catch (error) { return { valid: false, errors: [error.message] }; } }
}
class XmlArtifactAdapter extends TextArtifactAdapter { constructor() { super('xml', ['.xml']); } async validate(artifact) { const value = String(artifact.content || ''); return { valid: /^\s*<[^>]+>[\s\S]*<\/[^>]+>\s*$/.test(value), errors: /^\s*</.test(value) ? [] : ['XML-Wurzelelement fehlt.'] }; } }
class SpreadsheetArtifactAdapter {
  constructor() { this.id = 'spreadsheet-readonly'; this.editable = false; }
  supports(artifact) { return ['.xlsx', '.xlsm'].includes(path.extname(artifact.name || artifact.path || '').toLowerCase()); }
  async extractReviewContent(artifact) { return { artifactId: artifact.id, mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', readOnly: true, sheetNames: artifact.sheetNames || [], usedRanges: artifact.usedRanges || [] }; }
  async validate(artifact) { return { valid: Boolean((artifact.sheetNames || []).length), errors: (artifact.sheetNames || []).length ? [] : ['Keine lesbaren Tabellenblätter gefunden.'], macrosExecuted: false }; }
  async createPreviewModel(artifact) { return { mode: 'spreadsheet', readOnly: true, message: 'Original schreibgeschützt; direkte Bearbeitung ist noch nicht verfügbar.', sheetNames: artifact.sheetNames || [], usedRanges: artifact.usedRanges || [] }; }
  async applyChanges() { throw new Error('Spreadsheet-Originale sind in dieser Ausbaustufe schreibgeschützt.'); }
}
class ReadOnlyMetadataAdapter {
  constructor() { this.id = 'readonly-metadata'; this.editable = false; this.extensions = ['.docx', '.pptx', '.pdf', '.png', '.jpg', '.jpeg', '.ipynb']; }
  supports(artifact) { return this.extensions.includes(path.extname(artifact.name || artifact.path || '').toLowerCase()); }
  async extractReviewContent(artifact) { return { artifactId: artifact.id, mediaType: artifact.mediaType || 'application/octet-stream', metadata: artifact.metadata || {}, extractedText: artifact.extractedText || '', readOnly: true }; }
  async validate() { return { valid: true, errors: [] }; }
  async createPreviewModel(artifact) { return { mode: 'readonly', readOnly: true, metadata: artifact.metadata || {}, extractedText: artifact.extractedText || '', message: 'Vorschau und Kommentare verfügbar; direkte Originalbearbeitung ist nicht verfügbar.' }; }
  async applyChanges() { throw new Error('Dieser Dateityp unterstützt nur Kommentare und Annotationen.'); }
}
function createDefaultAdapterRegistry() {
  const adapters = [new TextArtifactAdapter('plain-text', ['.txt']), new TextArtifactAdapter('markdown', ['.md', '.markdown']), new JsonArtifactAdapter(), new XmlArtifactAdapter(), new TextArtifactAdapter('source-code', ['.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.java', '.py', '.php', '.sql']), new SpreadsheetArtifactAdapter(), new ReadOnlyMetadataAdapter()];
  return { adapters, register(adapter) { adapters.push(adapter); return adapter; }, find(artifact) { return adapters.find((adapter) => adapter.supports(artifact)) || null; } };
}
module.exports = { TextArtifactAdapter, JsonArtifactAdapter, XmlArtifactAdapter, SpreadsheetArtifactAdapter, ReadOnlyMetadataAdapter, createDefaultAdapterRegistry };
