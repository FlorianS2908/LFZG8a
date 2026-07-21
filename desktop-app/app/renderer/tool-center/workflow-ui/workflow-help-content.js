(function initWorkflowHelpContent(globalScope) {
  const planWizardHelp = {
    course: {
      title: 'Kursdaten',
      explained: 'Hier benennst du den Kurs. Diese Angaben erscheinen später im Kurscontainer und in der Kursverwaltung.',
      why: 'Die Kurs-ID wird für Speicherung, Zuordnung und spätere Freigaben verwendet.',
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
      optionalInputs: ['Seiten-/Folienbereiche für grosse Quellen'],
      typicalMistakes: ['Aufgaben statt Unterrichtsplan als Hauptquelle', 'falscher Anchor-Typ', 'riesige PDF ohne Bereichsangabe', 'alte Dateien gemischt mit neuen Dateien'],
      result: 'Themen können extrahiert werden.'
    },
    durationAudience: {
      title: 'Dauer & Zielgruppe',
      explained: 'Hier legst du fest, für wen der Kurs ist und wie umfangreich er sein soll.',
      why: 'Die KI/Fallback-Logik passt Sprache, Aufgaben, Demos und Hilfestufen daran an.',
      requiredInputs: ['Dauer', 'Vorkenntnisse', 'Niveau', 'Schwierigkeit'],
      optionalInputs: ['Prüfungsorientierung', 'Projektorientierung', 'Kursziel'],
      typicalMistakes: ['Vorkenntnisse zu hoch gewaehlt', 'Prüfungsorientierung vergessen', 'Projektorientierung unklar'],
      result: 'Zielgruppe und Umfang sind gesetzt.'
    },
    didactics: {
      title: 'Didaktisches Konzept',
      explained: 'Das didaktische Profil steuert, wie der Unterricht ablaeuft.',
      why: 'Das Profil beeinflusst Webvariante, Demo, Aufgabenprogression, Freigabeplan und Dozenten-Fahrplan.',
      requiredInputs: ['Didaktisches Profil'],
      optionalInputs: ['Demo-Strategie', 'Freigabe', 'Progression', 'Support'],
      typicalMistakes: ['Prüfungstraining für Grundlagenkurs', 'Projektbasiert ohne Projektziel', 'Guided Coding ohne Code-Thema'],
      result: 'Didaktischer Fahrplan ist vorbereitet.'
    },
    containerProfile: {
      title: 'Container-Konfiguration',
      explained: 'Hier wird festgelegt, welche Arbeitsdateien erzeugt werden.',
      why: 'Die Teilnehmer sollen passende Arbeitsdateien erhalten, aber keine Lösungen.',
      requiredInputs: ['Kurstyp', 'Artefaktmodus'],
      optionalInputs: ['Readme', 'Setup-Guide', 'Draw.io', 'Jupyter', 'SQL-Dateien'],
      typicalMistakes: ['Maven für absolute Java-Einsteiger', 'SQL-Autoausfuehrung erwarten', 'Lösungsmaterial für Teilnehmer freigeben'],
      result: 'Artefakt- und Sicherheitsprofil stehen fest.'
    },
    analysis: {
      title: 'Curriculum analysieren',
      explained: 'Jetzt extrahiert das System Themen und verteilt sie auf Tage.',
      why: 'Dieser Schritt erzeugt den CurriculumPlanDraft.',
      requiredInputs: ['freigegebene Voraussetzungen', 'Hauptquelle'],
      optionalInputs: ['KI-Modus für Analyse'],
      typicalMistakes: ['Analyse ohne Hauptquelle starten', 'unpassender Quellentyp'],
      result: 'CurriculumPlanDraft ist erstellt.'
    },
    curriculumReview: {
      title: 'Curriculum prüfen',
      explained: 'Hier prüfst du die vorgeschlagene Tagesstruktur.',
      why: 'Erst nach Freigabe werden Tagesentwürfe erzeugt.',
      requiredInputs: ['Themen prüfen', 'Plan freigeben'],
      optionalInputs: ['Themen verschieben', 'UE anpassen', 'Themen deaktivieren'],
      typicalMistakes: ['Plan ungeprüft freigeben', 'UE-Verteilung ignorieren'],
      result: 'Curriculum ist freigegeben.'
    },
    materials: {
      title: 'Materialien ergaenzen',
      explained: 'Hier kannst du zusaetzliche Aufgaben, Lösungen, Projektdateien, Quiz, Code oder Assets hochladen.',
      why: 'Die Hauptquelle bleibt die Grundlage; Zusatzmaterial macht den Kurs konkreter.',
      requiredInputs: [],
      optionalInputs: ['Aufgaben', 'Lösungen', 'Quiz', 'Projektmaterial', 'Assets'],
      typicalMistakes: ['Lösungen als Aufgaben hochladen', 'Referenzbuecher als Teilnehmermaterial verwenden', 'alte ZIPs mit neuen Dateien mischen'],
      result: 'Zusatzmaterial ist klassifiziert oder der Schritt wurde uebersprungen.'
    },
    aiMode: {
      title: 'KI/Fallback',
      explained: 'Hier waehlst du, wie Tagesentwürfe erzeugt werden.',
      why: 'OpenAI kann bessere Formulierungen liefern. Local ist sicherer und kostenlos, aber einfacher.',
      requiredInputs: ['KI-Modus'],
      optionalInputs: ['Prompt prüfen', 'Golden Tests', 'Kostenabschaetzung'],
      typicalMistakes: ['ChatGPT-Abo mit API-Key verwechseln', 'Kostenwarnung ignorieren'],
      result: 'Erzeugungsmodus ist festgelegt.'
    },
    generation: {
      title: 'Tagesentwürfe',
      explained: 'Hier werden Webvariante, Aufgaben, Lösungen, Quiz, Demos und Dozenten-Fahrplan erzeugt.',
      why: 'Aus dem freigegebenen Curriculum entstehen konkrete Unterrichtstage.',
      requiredInputs: ['freigegebenes Curriculum', 'KI/Fallback-Modus'],
      optionalInputs: ['Korrekturhinweise', 'einzelnen Tag neu erzeugen'],
      typicalMistakes: ['Lösungen im Teilnehmerbereich erwarten', 'Korrekturhinweise zu unklar formulieren'],
      result: 'Tagesentwürfe, DemoTargets, teacherRunbook und ReleasePlan sind vorbereitet.'
    },
    preflight: {
      title: 'Preflight/Testlauf',
      explained: 'Hier prüft das System den Entwurf, bevor daraus ein Container wird.',
      why: 'Preflight schuetzt vor Lösungen im Teilnehmerbereich, Secrets, Rohtexten und Sicherheitsproblemen.',
      requiredInputs: ['Tagesentwurf'],
      optionalInputs: ['Testlauf trotz Warnungen bestätigen'],
      typicalMistakes: ['Warnungen ungeprüft uebergehen', 'Referenzrohtexte exportieren wollen'],
      result: 'Sicherheits- und Qualitätsprüfung ist dokumentiert.'
    },
    containerDraft: {
      title: 'Container-Draft',
      explained: 'Der geprüfte Entwurf wird als Dual-Mode-Kurscontainer gespeichert.',
      why: 'Der Entwurf kann standalone getestet und später in die Plattform integriert werden.',
      requiredInputs: ['bestandener Testlauf oder geprüfter Tagesentwurf'],
      optionalInputs: ['Reports öffnen', 'Testprotokoll ansehen'],
      typicalMistakes: ['Kursentwurf mit veröffentlichtem Container verwechseln'],
      result: 'Standalone, Plattformadapter, Kataloge, Reports und Testprotokoll sind erzeugt.'
    }
  };

  const workflowHelpContent = {
    'create-course-container': planWizardHelp,
    'manage-containers': {
      overview: {
        title: 'Container verwalten',
        explained: 'Hier prüfst du vorhandene Container und deren Status.',
        why: 'Nur geprüfte Entwürfe sollten veröffentlicht werden.',
        requiredInputs: ['Containerliste'],
        optionalInputs: ['Bericht öffnen', 'veröffentlichen', 'deaktivieren', 'archivieren'],
        typicalMistakes: ['Draft mit Active verwechseln', 'Archivierte Container erneut freigeben wollen'],
        result: 'Containerstatus ist nachvollziehbar.'
      }
    },
    'duplicate-container': {
      duplicate: {
        title: 'Container duplizieren',
        explained: 'Ein vorhandener Container wird als neuer Entwurf vorbereitet.',
        why: 'Duplizieren ist sinnvoll für Varianten, Wiederholungen und neue Kurse auf gleicher Basis.',
        requiredInputs: ['Quellcontainer', 'neuer Name'],
        optionalInputs: ['Routen', 'Materialien', 'Assets', 'Aufgaben', 'Lösungen', 'Quiz'],
        typicalMistakes: ['Lösungen versehentlich mitnehmen', 'Kopie und Referenzieren verwechseln'],
        result: 'Ein neuer Entwurf ist erzeugt.'
      }
    },
    'expert-import': {
      import: {
        title: 'Rohdaten / Expertenimport',
        explained: 'Dieser Bereich ist für direkte Dateiimporte und technische Zuordnung.',
        why: 'Er ist nicht der Standardweg, hilft aber bei Sonderfaellen und Mapping-Korrekturen.',
        requiredInputs: ['Batch-Name', 'Dateien'],
        optionalInputs: ['ZIPs', 'Mapping später korrigieren'],
        typicalMistakes: ['Als normalen Container-Assistenten verwenden', 'Mapping ungeprüft lassen'],
        result: 'Import-Batch ist zwischengespeichert.'
      },
      batches: {
        title: 'Import-Batches / Zuordnungen',
        explained: 'Ein Import-Batch ist ein zwischengespeicherter Dateiimport. Mapping ist die Zuordnung der Datei zu einem Zweck.',
        why: 'Falsche Zuordnung fuehrt zu falschen Containerbereichen.',
        requiredInputs: ['Batch auswählen', 'Zuordnung prüfen'],
        optionalInputs: ['Warnungen beheben', 'validieren', 'Container erzeugen'],
        typicalMistakes: ['Duplikate ignorieren', 'blockierte Dateien exportieren wollen', 'ZIP-Inhalte nicht prüfen'],
        result: 'Dateien sind validiert und korrekt zugeordnet.'
      }
    },
    'reference-library': {
      references: {
        title: 'Referenzbibliothek',
        explained: 'Referenzen sind lokale Kontextquellen, kein Teilnehmermaterial.',
        why: 'Buchtexte und Referenzrohtexte duerfen nicht in Kurscontainer exportiert werden.',
        requiredInputs: ['Quelle', 'Lizenzbestätigung'],
        optionalInputs: ['Titel', 'Autor', 'Lizenznotiz', 'Suche'],
        typicalMistakes: ['Referenz als Teilnehmermaterial verwenden', 'nicht lizenzierte Quelle importieren'],
        result: 'Quelle ist local-reference-only indexiert.'
      }
    },
    'ai-fallback': {
      ai: {
        title: 'KI/Fallback',
        explained: 'Providerstatus, Prompt-Prüfung, Golden Tests und Kostenabschaetzung werden hier geprüft.',
        why: 'Ein ChatGPT-Abonnement ist kein API-Schlüssel; die lokale Erstellung bleibt immer möglich.',
        requiredInputs: ['Modus wählen'],
        optionalInputs: ['API-Key importieren', 'Modell speichern', 'Testanfrage senden'],
        typicalMistakes: ['API-Key in Dateien committen', 'Kostenabschaetzung ignorieren'],
        result: 'Der KI-Modus ist nachvollziehbar dokumentiert.'
      }
    }
  };

  const api = { planWizardHelp, workflowHelpContent };
  globalScope.ContentFactoryWorkflowHelp = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
