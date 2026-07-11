function validateGeneratedArtifacts(files = [], targets = []) {
  const errors = [];
  const warnings = [];
  files.forEach((file) => {
    const lower = String(file.path || '').toLowerCase();
    if (/\.(exe|bat|cmd|ps1)$/i.test(lower)) errors.push(`Ausfuehrbare Datei blockiert: ${file.path}`);
    if (file.solutionOnly && lower.startsWith('teilnehmer/')) errors.push(`solutionOnly Artefakt im Teilnehmerbereich: ${file.path}`);
    if (lower.startsWith('teilnehmer/') && /loesung|lösung|solution/i.test(String(file.content || '') + lower)) errors.push(`Loesungshinweis im Teilnehmerartefakt: ${file.path}`);
    if (lower.endsWith('.ipynb')) {
      try { JSON.parse(file.content); } catch { errors.push(`Notebook ist kein valides JSON: ${file.path}`); }
    }
    if (lower.endsWith('.drawio') && !/^<mxfile[\s>]/.test(String(file.content || '').trim())) errors.push(`Draw.io Datei ist nicht XML-artig: ${file.path}`);
    if (lower.endsWith('.sql') && /drop\s+database|delete\s+from\s+\w+\s*;|update\s+\w+\s+set\s+/i.test(file.content || '')) warnings.push(`SQL-Datei enthaelt riskantes Statement und muss manuell geprueft werden: ${file.path}`);
  });
  targets.forEach((target) => {
    if (target.solutionOnly && /^teilnehmer\//i.test(target.targetPath || '')) errors.push(`solutionOnly Zielpfad im Teilnehmerbereich: ${target.targetPath}`);
  });
  return { isValid: errors.length === 0, errors, warnings };
}

module.exports = {
  validateGeneratedArtifacts
};
