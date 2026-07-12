const artifactSuggestionContract = {
  id: 'artifact-suggestion-v1',
  version: '1.0.0',
  purpose: 'generateArtifactSuggestions',
  description: 'Schlaegt sichere Artefakte passend zu Thema, Zielgruppe und Containerprofil vor.',
  requiredInputs: ['topic', 'day', 'targetAudience', 'containerProfile'],
  expectedOutputSchema: 'ArtifactSuggestions',
  mustIncludeRules: ['Output ausschliesslich als valides JSON.', 'Zielpfad, Format, Sichtbarkeit und Begruendung liefern.'],
  mustNotIncludeRules: ['Keine EXE/BAT/CMD/PS1.', 'Keine Loesungen im Teilnehmerbereich.', 'Keine Secrets.'],
  didacticRules: ['Einsteiger erhalten kleine Artefakte.', 'Fortgeschrittene erhalten optionale Projektstruktur.'],
  safetyRules: ['SQL nur als Datei.', 'Ausfuehrung durch Nutzer/Trainer, nie automatisch.'],
  artifactRules: ['Draw.io fuer Diagramme.', 'Java Beginner ohne Maven.', 'Jupyter als valides ipynb.'],
  qualityRubric: ['Passung zu courseType.', 'Sichtbarkeit korrekt.', 'Loesungsschutz klar.'],
  examples: [],
  antiExamples: []
};

module.exports = { artifactSuggestionContract };
