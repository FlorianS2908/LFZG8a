(function initWorkflowHelpContent(globalScope) {
  const planWizardHelp = {
    course: {
      title: 'Kursdaten',
      explained: 'Hier benennst du den Kurs. Diese Angaben erscheinen spaeter im Kurscontainer und in der Kursverwaltung.',
      why: 'Die Kurs-ID wird fuer Speicherung, Zuordnung und spaetere Freigaben verwendet.',
      requiredInputs: ['Kursname', 'Kurs-ID', 'Fachbereich'],
      optionalInputs: ['Beschreibung'],
      typicalMistakes: ['Kurs-ID mit Sonderzeichen', 'Fachbereich leer', 'zu allgemeiner Kursname'],
      result: 'Kursbasis ist angelegt.'
    },
    anchor: {
      title: 'Hauptquelle',
      explained: 'Die Hauptquelle bestimmt die Themenstruktur des Kurses.',
      why: 'Aus dieser Quelle werden Themen, Tage, Lernziele und Reihenfolge abgeleitet.',
      requiredInputs: ['Unterrichtsplan Excel, PowerPoint, PDF, EPUB, Word, Markdown, HTML, TXT oder ZIP'],
      optionalInputs: ['Seiten-/Folienbereiche fuer grosse Quellen'],
      typicalMistakes: ['Aufgaben statt Unterrichtsplan als Hauptquelle', 'falscher Anchor-Typ', 'riesige PDF ohne Bereichsangabe', 'alte Dateien gemischt mit neuen Dateien'],
      result: 'Themen koennen extrahiert werden.'
    },
    durationAudience: {
      title: 'Dauer & Zielgruppe',
      explained: 'Hier legst du fest, fuer wen der Kurs ist und wie umfangreich er sein soll.',
      why: 'Die KI/Fallback-Logik passt Sprache, Aufgaben, Demos und Hilfestufen daran an.',
      requiredInputs: ['Dauer', 'Vorkenntnisse', 'Niveau', 'Schwierigkeit'],
      optionalInputs: ['Pruefungsorientierung', 'Projektorientierung', 'Kursziel'],
      typicalMistakes: ['Vorkenntnisse zu hoch gewaehlt', 'Pruefungsorientierung vergessen', 'Projektorientierung unklar'],
      result: 'Zielgruppe und Umfang sind gesetzt.'
    },
    didactics: {
      title: 'Didaktisches Konzept',
      explained: 'Das didaktische Profil steuert, wie der Unterricht ablaeuft.',
      why: 'Das Profil beeinflusst Webvariante, Demo, Aufgabenprogression, Freigabeplan und Dozenten-Fahrplan.',
      requiredInputs: ['Didaktisches Profil'],
      optionalInputs: ['Demo-Strategie', 'Freigabe', 'Progression', 'Support'],
      typicalMistakes: ['Pruefungstraining fuer Grundlagenkurs', 'Projektbasiert ohne Projektziel', 'Guided Coding ohne Code-Thema'],
      result: 'Didaktischer Fahrplan ist vorbereitet.'
    },
    containerProfile: {
      title: 'Container-Konfiguration',
      explained: 'Hier wird festgelegt, welche Arbeitsdateien erzeugt werden.',
      why: 'Die Teilnehmer sollen passende Arbeitsdateien erhalten, aber keine Loesungen.',
      requiredInputs: ['Kurstyp', 'Artefaktmodus'],
      optionalInputs: ['Readme', 'Setup-Guide', 'Draw.io', 'Jupyter', 'SQL-Dateien'],
      typicalMistakes: ['Maven fuer absolute Java-Einsteiger', 'SQL-Autoausfuehrung erwarten', 'Loesungsmaterial fuer Teilnehmer freigeben'],
      result: 'Artefakt- und Sicherheitsprofil stehen fest.'
    },
    analysis: {
      title: 'Curriculum analysieren',
      explained: 'Jetzt extrahiert das System Themen und verteilt sie auf Tage.',
      why: 'Dieser Schritt erzeugt den CurriculumPlanDraft.',
      requiredInputs: ['freigegebene Voraussetzungen', 'Hauptquelle'],
      optionalInputs: ['KI-Modus fuer Analyse'],
      typicalMistakes: ['Analyse ohne Hauptquelle starten', 'unpassender Quellentyp'],
      result: 'CurriculumPlanDraft ist erstellt.'
    },
    curriculumReview: {
      title: 'Curriculum pruefen',
      explained: 'Hier pruefst du die vorgeschlagene Tagesstruktur.',
      why: 'Erst nach Freigabe werden Tagesentwuerfe erzeugt.',
      requiredInputs: ['Themen pruefen', 'Plan freigeben'],
      optionalInputs: ['Themen verschieben', 'UE anpassen', 'Themen deaktivieren'],
      typicalMistakes: ['Plan ungeprueft freigeben', 'UE-Verteilung ignorieren'],
      result: 'Curriculum ist freigegeben.'
    },
    materials: {
      title: 'Materialien ergaenzen',
      explained: 'Hier kannst du zusaetzliche Aufgaben, Loesungen, Projektdateien, Quiz, Code oder Assets hochladen.',
      why: 'Die Hauptquelle bleibt die Grundlage; Zusatzmaterial macht den Kurs konkreter.',
      requiredInputs: [],
      optionalInputs: ['Aufgaben', 'Loesungen', 'Quiz', 'Projektmaterial', 'Assets'],
      typicalMistakes: ['Loesungen als Aufgaben hochladen', 'Referenzbuecher als Teilnehmermaterial verwenden', 'alte ZIPs mit neuen Dateien mischen'],
      result: 'Zusatzmaterial ist klassifiziert oder der Schritt wurde uebersprungen.'
    },
    aiMode: {
      title: 'KI/Fallback',
      explained: 'Hier waehlst du, wie Tagesentwuerfe erzeugt werden.',
      why: 'OpenAI kann bessere Formulierungen liefern. Local ist sicherer und kostenlos, aber einfacher.',
      requiredInputs: ['KI-Modus'],
      optionalInputs: ['Prompt pruefen', 'Golden Tests', 'Kostenabschaetzung'],
      typicalMistakes: ['ChatGPT-Abo mit API-Key verwechseln', 'Kostenwarnung ignorieren'],
      result: 'Erzeugungsmodus ist festgelegt.'
    },
    generation: {
      title: 'Tagesentwuerfe',
      explained: 'Hier werden Webvariante, Aufgaben, Loesungen, Quiz, Demos und Dozenten-Fahrplan erzeugt.',
      why: 'Aus dem freigegebenen Curriculum entstehen konkrete Unterrichtstage.',
      requiredInputs: ['freigegebenes Curriculum', 'KI/Fallback-Modus'],
      optionalInputs: ['Korrekturhinweise', 'einzelnen Tag neu erzeugen'],
      typicalMistakes: ['Loesungen im Teilnehmerbereich erwarten', 'Korrekturhinweise zu unklar formulieren'],
      result: 'Tagesentwuerfe, DemoTargets, teacherRunbook und ReleasePlan sind vorbereitet.'
    },
    preflight: {
      title: 'Preflight/Testlauf',
      explained: 'Hier prueft das System den Entwurf, bevor daraus ein Container wird.',
      why: 'Preflight schuetzt vor Loesungen im Teilnehmerbereich, Secrets, Rohtexten und Sicherheitsproblemen.',
      requiredInputs: ['Tagesentwurf'],
      optionalInputs: ['Testlauf trotz Warnungen bestaetigen'],
      typicalMistakes: ['Warnungen ungeprueft uebergehen', 'Referenzrohtexte exportieren wollen'],
      result: 'Sicherheits- und Qualitaetspruefung ist dokumentiert.'
    },
    containerDraft: {
      title: 'Container-Draft',
      explained: 'Der gepruefte Entwurf wird als Dual-Mode-Kurscontainer gespeichert.',
      why: 'Der Entwurf kann standalone getestet und spaeter in die Plattform integriert werden.',
      requiredInputs: ['bestandener Testlauf oder gepruefter Tagesentwurf'],
      optionalInputs: ['Reports oeffnen', 'Testprotokoll ansehen'],
      typicalMistakes: ['Draft mit veroeffentlichtem Container verwechseln'],
      result: 'Standalone, Plattformadapter, Kataloge, Reports und Testprotokoll sind erzeugt.'
    }
  };

  const workflowHelpContent = {
    'create-course-container': planWizardHelp,
    'manage-containers': {
      overview: {
        title: 'Container verwalten',
        explained: 'Hier pruefst du vorhandene Container und deren Status.',
        why: 'Nur gepruefte Entwuerfe sollten veroeffentlicht werden.',
        requiredInputs: ['Containerliste'],
        optionalInputs: ['Bericht oeffnen', 'veroeffentlichen', 'deaktivieren', 'archivieren'],
        typicalMistakes: ['Draft mit Active verwechseln', 'Archivierte Container erneut freigeben wollen'],
        result: 'Containerstatus ist nachvollziehbar.'
      }
    },
    'duplicate-container': {
      duplicate: {
        title: 'Container duplizieren',
        explained: 'Ein vorhandener Container wird als neuer Entwurf vorbereitet.',
        why: 'Duplizieren ist sinnvoll fuer Varianten, Wiederholungen und neue Kurse auf gleicher Basis.',
        requiredInputs: ['Quellcontainer', 'neuer Name'],
        optionalInputs: ['Routen', 'Materialien', 'Assets', 'Aufgaben', 'Loesungen', 'Quiz'],
        typicalMistakes: ['Loesungen versehentlich mitnehmen', 'Kopie und Referenzieren verwechseln'],
        result: 'Ein neuer Entwurf ist erzeugt.'
      }
    },
    'expert-import': {
      import: {
        title: 'Rohdaten / Expertenimport',
        explained: 'Dieser Bereich ist fuer direkte Dateiimporte und technische Zuordnung.',
        why: 'Er ist nicht der Standardweg, hilft aber bei Sonderfaellen und Mapping-Korrekturen.',
        requiredInputs: ['Batch-Name', 'Dateien'],
        optionalInputs: ['ZIPs', 'Mapping spaeter korrigieren'],
        typicalMistakes: ['Als normalen Container-Assistenten verwenden', 'Mapping ungeprueft lassen'],
        result: 'Import-Batch ist zwischengespeichert.'
      },
      batches: {
        title: 'Import-Batches / Zuordnungen',
        explained: 'Ein Import-Batch ist ein zwischengespeicherter Dateiimport. Mapping ist die Zuordnung der Datei zu einem Zweck.',
        why: 'Falsche Zuordnung fuehrt zu falschen Containerbereichen.',
        requiredInputs: ['Batch auswaehlen', 'Zuordnung pruefen'],
        optionalInputs: ['Warnungen beheben', 'validieren', 'Container erzeugen'],
        typicalMistakes: ['Duplikate ignorieren', 'blockierte Dateien exportieren wollen', 'ZIP-Inhalte nicht pruefen'],
        result: 'Dateien sind validiert und korrekt zugeordnet.'
      }
    },
    'reference-library': {
      references: {
        title: 'Referenzbibliothek',
        explained: 'Referenzen sind lokale Kontextquellen, kein Teilnehmermaterial.',
        why: 'Buchtexte und Referenzrohtexte duerfen nicht in Kurscontainer exportiert werden.',
        requiredInputs: ['Quelle', 'Lizenzbestaetigung'],
        optionalInputs: ['Titel', 'Autor', 'Lizenznotiz', 'Suche'],
        typicalMistakes: ['Referenz als Teilnehmermaterial verwenden', 'nicht lizenzierte Quelle importieren'],
        result: 'Quelle ist local-reference-only indexiert.'
      }
    },
    'ai-fallback': {
      ai: {
        title: 'KI/Fallback',
        explained: 'Providerstatus, Prompt-Pruefung, Golden Tests und Kostenabschaetzung werden hier geprueft.',
        why: 'ChatGPT-Abo ist kein API-Key; Local/Fallback bleibt immer moeglich.',
        requiredInputs: ['Modus waehlen'],
        optionalInputs: ['API-Key importieren', 'Modell speichern', 'Testanfrage senden'],
        typicalMistakes: ['API-Key in Dateien committen', 'Kostenabschaetzung ignorieren'],
        result: 'KI-Modus ist pruefbar dokumentiert.'
      }
    }
  };

  const api = { planWizardHelp, workflowHelpContent };
  globalScope.ContentFactoryWorkflowHelp = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
