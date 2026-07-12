(function initWorkflowRegistry(globalScope) {
  const help = globalScope.ContentFactoryWorkflowHelp || (typeof require !== 'undefined' ? require('./workflow-help-content') : {});
  const planHelp = help.planWizardHelp || {};

  const workflows = [
    {
      id: 'create-course-container',
      title: 'Neuen Kurscontainer erstellen',
      subtitle: 'Aus Unterrichtsplan, PowerPoint, PDF oder Materialien einen Kurscontainer erzeugen.',
      audience: 'Admin / Dozent',
      difficulty: 'gefuehrt',
      primaryGoal: 'Vom fachlichen Plan zum geprueften Kurscontainer-Entwurf fuehren.',
      result: 'Dual-Mode-Kurscontainer mit Standalone, Plattformadapter, Reports und Testprotokoll.',
      steps: [
        ['course', 'Kursdaten', 'Kurs', 'Grunddaten des Kurses festlegen.'],
        ['anchor', 'Hauptquelle', 'Quelle', 'Unterrichtsplan, PowerPoint, PDF oder Textdokument als Themenbasis hochladen.'],
        ['durationAudience', 'Dauer & Zielgruppe', 'Ziel', 'Umfang, Vorkenntnisse und Schwierigkeit festlegen.'],
        ['didactics', 'Didaktisches Konzept', 'Didaktik', 'Unterrichtsmodell und Aufgabenprogression festlegen.'],
        ['containerProfile', 'Container-Konfiguration', 'Container', 'Arbeitsdateien und Artefaktmodus konfigurieren.'],
        ['analysis', 'Curriculum analysieren', 'Analyse', 'Themen extrahieren und auf Tage verteilen.'],
        ['curriculumReview', 'Curriculum pruefen', 'Pruefen', 'Tagesstruktur kontrollieren und freigeben.'],
        ['materials', 'Materialien ergaenzen', 'Material', 'Zusatzmaterial optional hochladen.', true],
        ['aiMode', 'KI/Fallback', 'KI', 'Erzeugungsmodus, Prompt-Pruefung und Kosten klaeren.'],
        ['generation', 'Tagesentwuerfe', 'Entwurf', 'Webvarianten, Aufgaben, Loesungen, Quiz und Demos erzeugen.'],
        ['preflight', 'Preflight/Testlauf', 'Test', 'Sicherheits- und Qualitaetspruefung starten.'],
        ['containerDraft', 'Container-Draft', 'Draft', 'Geprueften Container-Entwurf speichern.', true]
      ].map(([id, label, shortLabel, goal, optional]) => ({
        id,
        label,
        shortLabel,
        goal,
        why: planHelp[id]?.why || 'Dieser Schritt fuehrt den Workflow kontrolliert weiter.',
        requiredInputs: planHelp[id]?.requiredInputs || [],
        optionalInputs: planHelp[id]?.optionalInputs || [],
        doneWhen: planHelp[id]?.result || 'Schritt ist abgeschlossen.',
        lockedWhen: 'Vorherige Pflichtschritte sind noch offen.',
        help: [planHelp[id]?.explained].filter(Boolean),
        typicalMistakes: planHelp[id]?.typicalMistakes || [],
        result: planHelp[id]?.result || 'Naechster Schritt ist vorbereitet.',
        optional: Boolean(optional)
      }))
    },
    {
      id: 'manage-containers',
      title: 'Container verwalten',
      subtitle: 'Vorhandene Container pruefen, veroeffentlichen, deaktivieren oder archivieren.',
      audience: 'Admin',
      difficulty: 'standard',
      primaryGoal: 'Containerstatus transparent machen.',
      result: 'Container sind geprueft und korrekt freigegeben oder archiviert.',
      steps: [{ id: 'overview', label: 'Containerliste pruefen', shortLabel: 'Liste', goal: 'Status pruefen.', why: 'Draft, Active und Archived haben unterschiedliche Wirkung.', requiredInputs: ['Containerliste'], optionalInputs: ['Berichte'], doneWhen: 'Status ist klar.', lockedWhen: '', help: [], typicalMistakes: ['Draft mit veroeffentlichtem Container verwechseln'], result: 'Statusentscheidung ist vorbereitet.' }]
    },
    {
      id: 'duplicate-container',
      title: 'Container duplizieren',
      subtitle: 'Bestehende Unterrichtscontainer als neuen Entwurf vorbereiten.',
      audience: 'Admin',
      difficulty: 'standard',
      primaryGoal: 'Variante eines vorhandenen Containers erzeugen.',
      result: 'Neuer Draft ist vorhanden.',
      steps: [{ id: 'duplicate', label: 'Duplizieren', shortLabel: 'Kopie', goal: 'Quelle, Namen und Inhalte waehlen.', why: 'Duplizieren spart Arbeit, muss aber Loesungen und Referenzen sauber behandeln.', requiredInputs: ['Quellcontainer', 'neuer Name'], optionalInputs: ['Inhalte auswaehlen'], doneWhen: 'Entwurf ist erzeugt.', lockedWhen: 'Kein Container vorhanden.', help: [], typicalMistakes: ['Loesungen versehentlich mitnehmen'], result: 'Neuer Entwurf ist erzeugt.' }]
    },
    {
      id: 'reference-library',
      title: 'Referenzbibliothek',
      subtitle: 'Eigene lizenzierte Fachquellen lokal als Kontext nutzen.',
      audience: 'Admin / Dozent',
      difficulty: 'optional',
      primaryGoal: 'Lokale Quellen indexieren, ohne sie zu exportieren.',
      result: 'Quellen sind local-reference-only verfuegbar.',
      steps: [{ id: 'references', label: 'Referenzen importieren', shortLabel: 'Quellen', goal: 'Quelle auswaehlen und Lizenz bestaetigen.', why: 'Referenzliteratur ist kein Teilnehmermaterial.', requiredInputs: ['Quelle', 'Lizenzbestaetigung'], optionalInputs: ['Metadaten'], doneWhen: 'Quelle ist indexiert.', lockedWhen: '', help: [], typicalMistakes: ['Buchtexte exportieren wollen'], result: 'Quelle bleibt lokal.' }]
    },
    {
      id: 'expert-import',
      title: 'Expertenbereich',
      subtitle: 'Direkter Rohdatenimport, Import-Batches und technische Zuordnung.',
      audience: 'Admin / Expert',
      difficulty: 'expert',
      primaryGoal: 'Sonderfaelle und direkte Dateiimporte bearbeiten.',
      result: 'Import-Batches sind validiert und zugeordnet.',
      steps: [
        { id: 'import', label: 'Rohdaten / Expertenimport', shortLabel: 'Import', goal: 'Batch anlegen und Dateien hochladen.', why: 'Nur fuer technische Sonderfaelle.', requiredInputs: ['Batch-Name', 'Dateien'], optionalInputs: ['ZIPs'], doneWhen: 'Batch ist angelegt.', lockedWhen: 'Guided Mode ohne Voraussetzungen.', help: [], typicalMistakes: ['Als Standardweg nutzen'], result: 'Dateien liegen im Staging.' },
        { id: 'batches', label: 'Import-Batches / Zuordnungen', shortLabel: 'Mapping', goal: 'Dateien pruefen und zuordnen.', why: 'Mapping bestimmt den spaeteren Zweck im Kurscontainer.', requiredInputs: ['Batch'], optionalInputs: ['Validierung'], doneWhen: 'Zuordnung ist validiert.', lockedWhen: 'Kein Batch vorhanden.', help: [], typicalMistakes: ['Warnungen ignorieren'], result: 'Batch ist nutzbar.' }
      ]
    }
  ];

  function listWorkflows() {
    return workflows.map((workflow) => ({ ...workflow, steps: workflow.steps.map((step) => ({ ...step })) }));
  }

  function getWorkflow(id) {
    return listWorkflows().find((workflow) => workflow.id === id) || null;
  }

  const api = { workflows, listWorkflows, getWorkflow };
  globalScope.ContentFactoryWorkflowRegistry = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
