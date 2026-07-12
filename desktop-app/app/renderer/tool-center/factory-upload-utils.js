(function initFactoryUploadUtils(root) {
  const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.msi', '.vbs', '.scr', '.com'];
  const LARGE_FILE_BYTES = 250 * 1024 * 1024;

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

  function validateDropZoneFile(file, accept = '', existingFiles = []) {
    const extension = extensionOf(file.name);
    const accepted = normalizeAccept(accept);
    const warnings = [];
    const errors = [];
    const dangerous = DANGEROUS_EXTENSIONS.includes(extension);
    if (dangerous) errors.push(`Gefaehrliche Dateiendung blockiert: ${extension}`);
    if (accepted.length && !accepted.includes(extension) && !(extension === '.zip' && accepted.includes('.zip'))) {
      warnings.push(`Dateityp ${extension || 'unbekannt'} passt nicht zur Uploadzone.`);
    }
    if (Number(file.size || 0) <= 0) warnings.push('Datei ist leer oder Groesse unbekannt.');
    if (Number(file.size || 0) > LARGE_FILE_BYTES) warnings.push('Grosse Datei: bitte Speicherverbrauch und Inhalt pruefen.');
    const duplicate = existingFiles.some((item) => fileKey(item) === fileKey(file));
    if (duplicate) warnings.push('Duplikat erkannt.');
    return {
      accepted: !dangerous,
      blocked: dangerous,
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
      const validation = validateDropZoneFile(file, areaConfig.accept || '', allExisting);
      const normalized = {
        name: file.name || '',
        path: file.path || '',
        size: Number(file.size || 0),
        type: file.type || '',
        lastModified: Number(file.lastModified || 0),
        uploadArea: areaConfig.id || areaConfig.uploadArea || '',
        source: areaConfig.source || 'picker',
        warnings: validation.warnings,
        errors: validation.errors,
        duplicate: validation.duplicate,
        blocked: validation.blocked,
        referenceOnly: areaConfig.id === 'reference-literature'
      };
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

  function removeDropZoneFile(files = [], zoneId, fileIndex) {
    let currentIndex = -1;
    return files.filter((file) => {
      if (file.uploadArea !== zoneId) return true;
      currentIndex += 1;
      return currentIndex !== Number(fileIndex);
    });
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
    validateDropZoneFile,
    validateUploadSelection,
    removeDropZoneFile,
    renderFileList,
    normalizeAccept,
    fileKey,
    extensionOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ContentFactoryUploadUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
