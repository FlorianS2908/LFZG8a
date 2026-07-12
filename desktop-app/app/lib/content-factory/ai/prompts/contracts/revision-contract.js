const revisionContract = {
  id: 'revision-v1',
  version: '1.0.0',
  purpose: 'reviseDayDraft',
  description: 'Ueberarbeitet einen Tagesentwurf anhand expliziter Korrekturhinweise.',
  requiredInputs: ['dayDraft', 'correctionPrompt', 'targetAudience', 'containerProfile'],
  expectedOutputSchema: 'DayGenerationResult',
  mustIncludeRules: ['Output ausschliesslich als valides JSON.', 'Bestehende Struktur erhalten und gezielt verbessern.'],
  mustNotIncludeRules: ['Keine Teilnehmerloesungen.', 'Keine Secrets.', 'Keine Referenzchunks.'],
  didacticRules: ['Korrekturhinweise fachlich und didaktisch einarbeiten.'],
  safetyRules: ['Loesungsschutz erneut pruefen.', 'Unsichere Artefakte entfernen.'],
  artifactRules: ['Java Beginner ohne Maven.', 'SQL nicht automatisch ausfuehren.'],
  qualityRubric: ['Korrektur sichtbar umgesetzt.', 'Schema bleibt gueltig.'],
  examples: [],
  antiExamples: []
};

module.exports = { revisionContract };
