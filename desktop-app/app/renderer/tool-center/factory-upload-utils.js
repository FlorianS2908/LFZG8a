(function initFactoryUploadUtils(root) {
  const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.msi', '.vbs', '.scr', '.com'];
  const LARGE_FILE_BYTES = 250 * 1024 * 1024;
  const MIME_TYPES_BY_EXTENSION = {
    '.xls': ['application/vnd.ms-excel'], '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.xlsm': ['application/vnd.ms-excel.sheet.macroenabled.12', 'application/vnd.ms-excel'], '.csv': ['text/csv', 'application/vnd.ms-excel'], '.pdf': ['application/pdf'],
    '.epub': ['application/epub+zip'], '.ppt': ['application/vnd.ms-powerpoint'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], '.txt': ['text/plain'],
    '.md': ['text/markdown', 'text/plain'], '.html': ['text/html'], '.htm': ['text/html']
  };

  function normalizeAccept(accept) {
    return String(accept || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  function extensionOf(name) {
    const match = String(name || '').toLowerCase().match(/\.[^.]+$/);
    return match ? match[0] : '';
  }

  function fileKey(file) {
    return [
      String(file.name || '').toLowerCase(),
      Number(file.size || 0),
      Number(file.lastModified || 0)
    ].join(':');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isDuplicateUpload(file, existingFiles = []) {
    return existingFiles.some((item) => fileKey(item) === fileKey(file));
  }

  function normalizeUploadFile(file, uploadArea, source = 'picker', validation = {}) {
    return {
      id: validation.id || `${uploadArea}-${fileKey(file)}`,
      name: file.name || '',
      path: file.path || '',
      size: Number(file.size || 0),
      type: file.type || '',
      lastModified: Number(file.lastModified || 0),
      uploadArea,
      source,
      warnings: validation.warnings || [],
      errors: validation.errors || [],
      duplicate: validation.duplicate === true,
      blocked: validation.blocked === true,
      referenceOnly: uploadArea === 'reference-literature'
    };
  }

  function validateDropZoneFile(file, accept = '', existingFiles = [], options = {}) {
    const extension = extensionOf(file.name);
    const accepted = normalizeAccept(accept);
    const warnings = [];
    const errors = [];
    const dangerous = DANGEROUS_EXTENSIONS.includes(extension);
    if (dangerous) errors.push(`Gefaehrliche Dateiendung blockiert: ${extension}`);
    const extensionAllowed = !accepted.length || accepted.includes(extension);
    const declaredMime = String(file.type || '').toLowerCase();
    const expectedMimes = MIME_TYPES_BY_EXTENSION[extension] || [];
    const mimeAllowed = !expectedMimes.length || (declaredMime && expectedMimes.includes(declaredMime));
    if (!extensionAllowed) (options.strictMime ? errors : warnings).push(`Datei ${file.name || 'unbekannt'} wird nicht unterstützt. Zulässig: ${accepted.join(', ')}.`);
    if (extensionAllowed && !mimeAllowed) (options.strictMime ? errors : warnings).push(`Datei ${file.name || 'unbekannt'} hat keinen zur Endung passenden MIME-Typ. Zulässig: ${accepted.join(', ')}.`);
    if (Number(file.size || 0) <= 0) warnings.push('Datei ist leer oder Groesse unbekannt.');
    if (Number(file.size || 0) > LARGE_FILE_BYTES) warnings.push('Grosse Datei: bitte Speicherverbrauch und Inhalt pruefen.');
    const duplicate = isDuplicateUpload(file, existingFiles);
    if (duplicate) warnings.push('Duplikat erkannt.');
    return {
      accepted: !dangerous && (!options.strictMime || (extensionAllowed && mimeAllowed)),
      blocked: dangerous || Boolean(options.strictMime && (!extensionAllowed || !mimeAllowed)),
      duplicate,
      warnings,
      errors
    };
  }

  function validateUploadSelection(files = [], areaConfig = {}, existingFiles = []) {
    const acceptedFiles = [];
    const blockedFiles = [];
    const allExisting = [...existingFiles];
    Array.from(files || []).forEach((file) => {
      const validation = validateDropZoneFile(file, areaConfig.accept || '', allExisting, areaConfig);
      const normalized = normalizeUploadFile(file, areaConfig.id || areaConfig.uploadArea || '', areaConfig.source || 'picker', validation);
      if (validation.accepted) {
        acceptedFiles.push(normalized);
        allExisting.push(normalized);
      } else {
        blockedFiles.push(normalized);
      }
    });
    return {
      files: acceptedFiles,
      blockedFiles,
      warnings: acceptedFiles.flatMap((file) => file.warnings || []),
      errors: blockedFiles.flatMap((file) => file.errors || [])
    };
  }

  function addFilesToUploadState(existingFiles = [], newFiles = [], areaConfig = {}) {
    const result = validateUploadSelection(newFiles, areaConfig, existingFiles);
    return {
      files: [...existingFiles, ...result.files],
      addedFiles: result.files,
      blockedFiles: result.blockedFiles,
      warnings: result.warnings,
      errors: result.errors
    };
  }

  function removeDropZoneFile(files = [], zoneId, fileIndex) {
    let currentIndex = -1;
    return files.filter((file) => {
      if (file.uploadArea !== zoneId) return true;
      currentIndex += 1;
      return currentIndex !== Number(fileIndex);
    });
  }

  function removeUploadFile(files = [], indexOrId) {
    if (typeof indexOrId === 'number') return files.filter((_, index) => index !== indexOrId);
    return files.filter((file) => file.id !== indexOrId);
  }

  function formatUploadWarnings(file = {}) {
    return [
      ...(file.warnings || []),
      ...(file.errors || []),
      file.duplicate ? 'Duplikat erkannt.' : '',
      file.blocked ? 'Datei ist blockiert und wird nicht uebernommen.' : '',
      file.referenceOnly ? 'Referenzliteratur bleibt local-only.' : ''
    ].filter(Boolean);
  }

  function createDropZoneHtml(config = {}) {
    const files = config.files || [];
    const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const inputAttr = config.kind === 'anchor' ? 'data-wizard-anchor-files' : `data-wizard-upload="${escapeHtml(config.id)}"`;
    return `
      <section class="dropzone-card ${files.length ? 'dropzone-has-files' : ''}" data-dropzone-card="${escapeHtml(config.id)}">
        <div class="factory-card-header">
          <strong>${escapeHtml(config.title || config.id)}</strong>
          <span class="status-badge">${escapeHtml(files.length)} Datei(en)</span>
        </div>
        ${config.description ? `<p class="dropzone-purpose">${escapeHtml(config.description)}</p>` : ''}
        <label class="dropzone" data-dropzone="${escapeHtml(config.id)}" tabindex="0" aria-label="${escapeHtml(config.title || config.id)} Uploadzone">
          <span>Dateien ablegen oder auswählen</span>
          <small>${config.multiple === false ? 'Einzeldatei' : 'Mehrfachauswahl möglich'} · ${formatBytes(totalSize)}</small>
          <input ${inputAttr} type="file" ${config.multiple === false ? '' : 'multiple'} ${config.accept ? `accept="${escapeHtml(config.accept)}"` : ''}>
        </label>
        <details class="dropzone-formats"><summary>Weitere Formate</summary><small>${escapeHtml(config.accept || 'Alle unterstützten Dateitypen')}</small></details>
        ${renderFileList(files, escapeHtml)}
      </section>
    `;
  }

  function renderFileList(files = [], escapeHtml = (value) => String(value ?? '')) {
    if (!files.length) return '<p class="dropzone-empty">Noch keine Dateien ausgewaehlt.</p>';
    return `<ul class="dropzone-file-list">${files.map((file, index) => `
      <li class="dropzone-file-chip ${file.blocked ? 'dropzone-warning' : ''}">
        <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <small>${formatBytes(file.size)}${file.duplicate ? ' | Duplikat' : ''}${file.referenceOnly ? ' | reference-only' : ''}</small>
        <button class="secondary-button" type="button" data-dropzone-remove="${escapeHtml(file.uploadArea)}:${index}" aria-label="Datei entfernen">entfernen</button>
        ${(file.warnings || []).map((warning) => `<em>${escapeHtml(warning)}</em>`).join('')}
        ${(file.errors || []).map((error) => `<em>${escapeHtml(error)}</em>`).join('')}
      </li>
    `).join('')}</ul>`;
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  const api = {
    DANGEROUS_EXTENSIONS,
    createDropZoneHtml,
    normalizeUploadFile,
    validateDropZoneFile,
    validateUploadSelection,
    addFilesToUploadState,
    removeUploadFile,
    removeDropZoneFile,
    isDuplicateUpload,
    formatUploadWarnings,
    renderFileList,
    normalizeAccept,
    fileKey,
    extensionOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ContentFactoryUploadUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
