const dayDraftContract = {
  id: 'day-draft-v1',
  version: '1.0.0',
  purpose: 'generateDayDraft',
  description: 'Erzeugt einen sicheren Tagesentwurf fuer ContentFactory-Container.',
  requiredInputs: ['course', 'day', 'learningGoals', 'targetAudience', 'containerProfile', 'artifactSuggestions', 'sourceRefs'],
  expectedOutputSchema: 'DayGenerationResult',
  mustIncludeRules: [
    'Output ausschliesslich als valides JSON.',
    'dayNumber, title, webvariant.teacherHtmlSections, webvariant.participantHtmlSections, tasks, solutions, quiz, artifacts, optionale demos, sourceRefs, warnings und aiMeta liefern.',
    'Teilnehmerbereich enthaelt niemals Loesungen.',
    'Loesungen ausschliesslich in solutions und Dozentenbereich.',
    'Webvariante erklaert das Thema und kann einen kurzen Demo-Vorschlag fuer den Dozenten enthalten.'
  ],
  mustNotIncludeRules: [
    'Keine Originalbuchtexte uebernehmen.',
    'Keine Referenzchunks oder textPreview uebernehmen.',
    'Keine API-Keys, Tokens oder Secrets verwenden.',
    'Keine EXE/BAT/CMD/PS1 erzeugen.',
    'Keine SQL-Autoausfuehrung erzeugen.',
    'Demo-Vorschlaege duerfen keine vollstaendige Aufgabenloesung enthalten.'
  ],
  didacticRules: [
    'ageRange, priorKnowledge, learningLevel, difficultyMode, needsStepByStep, examOrientation und projectOrientation beachten.',
    'Einsteiger erhalten einfache Sprache und kleinere Schritte.',
    'Fortgeschrittene erhalten Transferaufgaben und optionale Erweiterungen.'
  ],
  safetyRules: [
    'Teilnehmerartefakte duerfen keine Loesungshinweise enthalten.',
    'Referenzquellen nur ueber sourceRefs oder kurze Metadaten nennen.',
    'Unsichere oder ausfuehrbare Artefakte blockieren.'
  ],
  artifactRules: [
    'Java Einsteiger erhalten keine Maven-Struktur, ausser explizit erzwungen.',
    'SQL wird niemals automatisch ausgefuehrt.',
    'Draw.io ist primaeres Diagrammformat.',
    'Jupyter Notebooks muessen valides ipynb JSON sein.',
    'Demos sind standardmaessig fuer Dozenten gedacht und bleiben von Aufgabenfreigaben getrennt.'
  ],
  qualityRubric: [
    'Konkrete Aufgaben statt Platzhalter.',
    'Mindestens ein Quizimpuls.',
    'Schwierigkeit passt zur Zielgruppe.',
    'Artefakte passen zum containerProfile.',
    'sourceRefs bleiben nachvollziehbar.'
  ],
  examples: [
    { name: 'Java Beginner', expectation: 'Einfache .java-Dateien, Schritt-fuer-Schritt, Loesung nur Dozent.' },
    { name: 'SQL Beginner', expectation: 'SQL-Dateien und phpMyAdmin README, keine automatische Ausfuehrung.' }
  ],
  antiExamples: [
    { name: 'Teilnehmerloesung', reason: 'Loesungen im Teilnehmerbereich sind verboten.' },
    { name: 'Java Beginner Maven', reason: 'Maven fuer Einsteiger nur bei expliziter Erzwingung.' }
  ]
};

module.exports = {
  dayDraftContract
};
