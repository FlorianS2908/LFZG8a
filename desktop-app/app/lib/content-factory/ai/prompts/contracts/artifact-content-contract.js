const artifactContentContract = {
  id: 'artifact-content-v1',
  version: '1.0.0',
  purpose: 'generateArtifactContent',
  description: 'Erzeugt sichere Artefaktdateien ohne automatische Ausfuehrung.',
  requiredInputs: ['course', 'artifactTargets', 'targetAudience', 'containerProfile'],
  expectedOutputSchema: 'ArtifactContent',
  mustIncludeRules: ['Output ausschliesslich als valides JSON.', 'Dateipfad, Inhalt und solutionOnly Kennzeichnung liefern.'],
  mustNotIncludeRules: ['Keine EXE/BAT/CMD/PS1.', 'Keine Secrets.', 'Keine Originaltexte.', 'Keine SQL-Autoausfuehrung.'],
  didacticRules: ['Inhalt passt zu priorKnowledge und learningLevel.'],
  safetyRules: ['solutionOnly niemals unter teilnehmer/.', 'Jupyter muss valides JSON sein.'],
  artifactRules: ['Draw.io XML beginnt mit mxfile.', 'SQL ohne DROP DATABASE oder Autostart.'],
  qualityRubric: ['Dateien syntaktisch plausibel.', 'Aufgaben und Loesungen getrennt.'],
  examples: [],
  antiExamples: []
};

module.exports = { artifactContentContract };
