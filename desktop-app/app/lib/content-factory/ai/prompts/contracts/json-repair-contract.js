const jsonRepairContract = {
  id: 'json-repair-v1',
  version: '1.0.0',
  purpose: 'repairInvalidJson',
  description: 'Repariert ungueltige KI-JSON-Ausgabe ohne neue Inhalte zu erfinden.',
  requiredInputs: ['invalidJson', 'expectedOutputSchema'],
  expectedOutputSchema: 'ValidJsonObject',
  mustIncludeRules: ['Output ausschliesslich als valides JSON.', 'Nur Syntax reparieren und fehlende Pflichtfelder minimal neutral setzen.'],
  mustNotIncludeRules: ['Keine neuen Fachinhalte erfinden.', 'Keine Secrets.', 'Keine Referenztexte.'],
  didacticRules: [],
  safetyRules: ['Unsichere Inhalte nicht erweitern.', 'Loesungsschutz nicht aufweichen.'],
  artifactRules: [],
  qualityRubric: ['Valides JSON.', 'Schema-nahe Struktur.', 'Keine neuen Quellen.'],
  examples: [],
  antiExamples: []
};

module.exports = { jsonRepairContract };
