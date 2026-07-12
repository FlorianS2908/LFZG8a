const curriculumPlanContract = {
  id: 'curriculum-plan-v1',
  version: '1.0.0',
  purpose: 'generateCurriculumPlan',
  description: 'Erzeugt eine CurriculumPlanDraft-Teilstruktur aus sicheren Quellenmetadaten.',
  requiredInputs: ['course', 'duration', 'targetAudience', 'didacticProfile', 'sourceOutline'],
  expectedOutputSchema: 'CurriculumPlanDraftPartial',
  mustIncludeRules: ['Output ausschliesslich als valides JSON.', 'Tage, Themen, Lernziele, Warnungen, didacticProfile und sourceRefs liefern.'],
  mustNotIncludeRules: ['Keine Originalbuchtexte.', 'Keine rawText/chunks/textPreview.', 'Keine Secrets.'],
  didacticRules: ['Zielgruppenalter, Niveau und Vorkenntnisse beachten.', 'Tagesumfang plausibel verteilen.', 'didacticProfile.lessonFlow, releaseStrategy und taskProgression in Tagesstruktur beruecksichtigen.'],
  safetyRules: ['Unklare Quellen als Warnung markieren.', 'Keine externen Dateien ausfuehren.'],
  artifactRules: ['Artefakte nur als spaetere Vorschlaege benennen.'],
  qualityRubric: ['Tage vollstaendig.', 'Themen aktivierbar.', 'sourceRefs nachvollziehbar.'],
  examples: [],
  antiExamples: []
};

module.exports = { curriculumPlanContract };
