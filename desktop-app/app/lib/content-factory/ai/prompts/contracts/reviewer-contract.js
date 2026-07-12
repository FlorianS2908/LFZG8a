const reviewerContract = {
  id: 'reviewer-v1',
  version: '1.0.0',
  purpose: 'reviewOutput',
  description: 'Prueft Prompt- oder Outputqualitaet regelgebunden.',
  requiredInputs: ['candidate', 'rules', 'targetAudience'],
  expectedOutputSchema: 'ReviewResult',
  mustIncludeRules: ['Output ausschliesslich als valides JSON.', 'Status, Score, Fehler, Warnungen und Empfehlungen liefern.'],
  mustNotIncludeRules: ['Keine freien Langtexte.', 'Keine erfundenen Quellen.', 'Keine Secrets.'],
  didacticRules: ['Zielgruppenpassung bewerten.'],
  safetyRules: ['Loesungsschutz, Secrets und Rohtexte pruefen.'],
  artifactRules: ['Artefaktregeln gegen containerProfile pruefen.'],
  qualityRubric: ['Konkrete Findings.', 'Keine Spekulation.'],
  examples: [],
  antiExamples: []
};

module.exports = { reviewerContract };
