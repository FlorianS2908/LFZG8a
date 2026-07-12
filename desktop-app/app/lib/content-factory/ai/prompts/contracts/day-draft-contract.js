const dayDraftContract = {
  id: 'day-draft-v1',
  version: '1.0.0',
  purpose: 'generateDayDraft',
  description: 'Erzeugt einen sicheren Tagesentwurf fuer ContentFactory-Container.',
  requiredInputs: ['course', 'day', 'learningGoals', 'targetAudience', 'ageRange', 'priorKnowledge', 'learningLevel', 'difficultyMode', 'needsStepByStep', 'examOrientation', 'projectOrientation', 'containerProfile', 'didacticProfile', 'artifactSuggestions', 'sourceRefs'],
  expectedOutputSchema: 'DayGenerationResult',
  mustIncludeRules: [
    'Output ausschliesslich als valides JSON.',
    'dayNumber, title, webvariant.teacherHtmlSections, webvariant.participantHtmlSections, tasks, solutions, quiz, artifacts, didacticFlow, releasePlan, teacherRunbook, reflection, optionale demos, sourceRefs, warnings und aiMeta liefern.',
    'Teilnehmerbereich enthaelt niemals Loesungen.',
    'Loesungen ausschliesslich in solutions und Dozentenbereich.',
    'Webvariante erklaert das Thema und kann einen kurzen Demo-Vorschlag fuer den Dozenten enthalten.',
    'didacticProfile.lessonFlow, demoStrategy, releaseStrategy, taskProgression, supportLevel, assessmentMode und reflectionMode muessen erkennbar umgesetzt werden.',
    'Jede Aufgabe darf phaseRef, progressionLevel, socialForm, estimatedMinutes, releaseHint und assessmentCriteria liefern.',
    'Demos duerfen phaseRef, demoStrategy und teacherOnly liefern.',
    'reflection muss mode, questions und expectedEvidence liefern.',
    'teacherRunbook muss erzeugt werden und zum didacticProfile passen.',
    'Jede teacherRunbook-Phase braucht teacherAction und participantAction.',
    'Jede Demo muss im teacherRunbook referenziert werden, wenn Demos erzeugt werden.',
    'Jede Freigabe muss im releasePlan oder teacherRunbook stehen.',
    'Jede Aufgabe braucht didaktische Einordnung ueber phaseRef, progressionLevel oder assessmentCriteria.',
    'Typische Fehler muessen genannt werden.',
    'Differenzierung fuer schwaechere und staerkere Teilnehmende muss vorhanden sein.'
  ],
  mustNotIncludeRules: [
    'Keine Originalbuchtexte uebernehmen.',
    'Keine Referenzchunks oder textPreview uebernehmen.',
    'Keine API-Keys, Tokens oder Secrets verwenden.',
    'Keine EXE/BAT/CMD/PS1 erzeugen.',
    'Keine SQL-Autoausfuehrung erzeugen.',
    'Demo-Vorschlaege duerfen keine vollstaendige Aufgabenloesung enthalten.',
    'teacherRunbook darf nicht im Teilnehmerbereich erscheinen.',
    'Teilnehmerbereich darf keine Dozentenhinweise enthalten.'
  ],
  didacticRules: [
    'ageRange, priorKnowledge, learningLevel, difficultyMode, needsStepByStep, examOrientation und projectOrientation beachten.',
    'Einsteiger erhalten einfache Sprache und kleinere Schritte.',
    'Fortgeschrittene erhalten Transferaufgaben und optionale Erweiterungen.',
    'Das gewaehlte didacticProfile steuert Reihenfolge, Sozialform, Aufgabenprogression und Reflexion.',
    'worked-example-fading startet mit Musterbeispiel und reduziert Hilfe schrittweise.',
    'problem-first startet mit Problemfall, Hypothesen und Fehleranalyse.',
    'exam-training enthaelt Zeitaufgabe, Auswertung und Mini-Test.',
    'guided-coding enthaelt Live-Coding, Code-Along und Micro-Task.',
    'exam-training liefert Bewertungskriterien oder Bewertungsraster.',
    'worked-example-fading liefert progressionLevel fuer Muster, gefuehrt, Luecke und frei.',
    'station-learning liefert stationId oder klaren Stationsbezug.',
    'guided-coding liefert codeStep oder klaren Code-Schritt.'
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
