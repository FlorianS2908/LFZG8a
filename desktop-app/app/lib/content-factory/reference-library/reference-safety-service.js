const watermarkPatterns = [
  /licensed\s+to/i,
  /lizenziert\s+f[üu]r/i,
  /registered\s+to/i,
  /@[\w.-]+\.[a-z]{2,}/i,
  /watermark/i,
  /wasserzeichen/i
];

function createSafetyReport(metadata, extraction, chunks) {
  const text = [extraction.text, ...(chunks || []).map((chunk) => chunk.text)].join('\n');
  const warnings = [];
  const containsWatermark = watermarkPatterns.some((pattern) => pattern.test(text));
  if (containsWatermark) {
    warnings.push('Moegliches Wasserzeichen, Lizenzhinweis oder personenbezogener Marker erkannt.');
  }
  return {
    referenceId: metadata.id,
    directCopyDetected: false,
    personalWatermarkDetected: containsWatermark,
    exportBlocked: false,
    warnings,
    checkedAt: new Date().toISOString()
  };
}

function validateNoReferenceExport(draft) {
  const errors = [];
  (draft.files || []).forEach((file) => {
    const path = String(file.path || '').replace(/\\/g, '/').toLowerCase();
    const content = String(file.content || '');
    if (/reference-library|\/original\/|extracted\.json|chunks\.json/.test(path)) errors.push(`Referenzbibliothek darf nicht exportiert werden: ${file.path}`);
    if (/\.(pdf|epub)$/i.test(path)) errors.push(`Buch-/Referenzdatei darf nicht im Container liegen: ${file.path}`);
    if (/^(teilnehmer|standalone|platform)\//.test(path) && /reference-library|referencechunk|originaltext/i.test(content)) {
      errors.push(`Referenztext im geschuetzten Exportbereich erkannt: ${file.path}`);
    }
    if (watermarkPatterns.some((pattern) => pattern.test(content))) {
      errors.push(`Moeglicher Wasserzeichen-/Lizenzhinweis im Export: ${file.path}`);
    }
  });
  return errors;
}

module.exports = {
  createSafetyReport,
  validateNoReferenceExport
};
