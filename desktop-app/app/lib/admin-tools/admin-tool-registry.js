const adminTools = [
  {
    id: 'container-adapter',
    title: 'Container-Adapter / Legacy-Migration',
    category: 'migration',
    summary: 'Analysiert Legacy-Kacheln und bereitet einen nicht destruktiven Draft-Container vor.',
    whenToUse: 'Wenn bestehende HTML/CSS-, LFZQ8a- oder andere Kursstrukturen in das Container-Schema ueberfuehrt werden sollen.',
    steps: [
      'Legacy-Quelle auswaehlen',
      'Analyse starten',
      'Manifest- und Katalogvorschau pruefen',
      'Konflikte bearbeiten',
      'Draft-Container erzeugen',
      'Migrationsbericht speichern'
    ],
    defaultConfig: {
      migrationMode: 'analysis',
      pathStrategy: 'reference',
      releaseKeyStrategy: 'suggest',
      ignoredFolders: ['.git', 'node_modules', 'dist', '_archiv'],
      allowedFileTypes: ['.html', '.css', '.js', '.json', '.md', '.pdf', '.docx', '.png', '.jpg', '.svg']
    }
  },
  {
    id: 'import-analysis',
    title: 'Import- & Dateianalyse',
    category: 'import',
    summary: 'Klassifiziert Unterrichtsmaterial, Aufgaben, Loesungen, Quellcode, SQL, Assets und Sonstiges.',
    whenToUse: 'Wenn Dateien oder ZIPs vor einer Container-Erstellung geprueft und gemappt werden sollen.',
    steps: ['Dateien oder ZIP auswaehlen', 'Sicherheitspruefung starten', 'Dateitypen pruefen', 'Mapping korrigieren', 'Analysebericht speichern'],
    defaultConfig: {
      maxFileSizeMb: 100,
      zipSlipProtection: true,
      sourceCodeAnalysis: true,
      sqlAnalysis: true,
      unknownFilesTarget: 'other',
      blockedExtensions: ['.exe', '.bat', '.cmd', '.ps1']
    }
  },
  {
    id: 'course-generator',
    title: 'Kurscontainer-Generator',
    category: 'generator',
    summary: 'Erstellt neue Kurscontainer als Draft mit Unterrichtsplan, Tagesstruktur und Reviewmodus.',
    whenToUse: 'Wenn aus strukturierten Materialien ein neuer Kurscontainer entstehen soll.',
    steps: ['Metadaten erfassen', 'Unterrichtsplan pruefen', 'Tagesstruktur erzeugen', 'Uploadbereiche mappen', 'Draft speichern'],
    defaultConfig: {
      department: 'FIAE',
      dayCount: 5,
      lessonPlanRequired: true,
      projectMode: true,
      reviewMode: 'daily'
    }
  },
  {
    id: 'quiz-builder',
    title: 'Quiz-Builder',
    category: 'quiz',
    summary: 'Erstellt und validiert Quizcontainer oder kurstagbezogene Quizfragen.',
    whenToUse: 'Wenn Fragenpools importiert, validiert oder als eigene Kachel veroeffentlicht werden sollen.',
    steps: ['Fragenpool importieren', 'Antwortregeln pruefen', 'Themen zuordnen', 'Zeitlimit setzen', 'Draft oder Release vorbereiten'],
    defaultConfig: {
      questionCount: 25,
      timeLimitMinutes: 35,
      difficulty: 'mixed',
      allowMultipleChoice: true,
      exportFormat: 'json'
    }
  },
  {
    id: 'container-export',
    title: 'Container-Export',
    category: 'export',
    summary: 'Exportiert Container ohne lokale Nutzerdaten, Secrets oder produktive App-Daten.',
    whenToUse: 'Wenn ein Kurs, Tool oder Standalone-Paket weitergegeben werden soll.',
    steps: ['Container auswaehlen', 'Manifest pruefen', 'Nutzerdaten ausschliessen', 'Exportart waehlen', 'ZIP erzeugen'],
    defaultConfig: {
      zipExport: true,
      standaloneExport: true,
      excludeUserData: true,
      excludeSecrets: true,
      validateManifestBeforeExport: true
    }
  },
  {
    id: 'ai-provider-config',
    title: 'KI-/Provider-Konfiguration',
    category: 'ai',
    summary: 'Verwaltet Provider, lokalen Fallback und sichere lokale KI-Konfiguration.',
    whenToUse: 'Wenn KI-Unterstuetzung fuer Analyse, Quiz oder Generierung vorbereitet werden soll.',
    steps: ['Provider waehlen', 'Fallback setzen', 'API-Key lokal konfigurieren', 'Test-Prompt ausfuehren', 'Status pruefen'],
    defaultConfig: {
      provider: 'local',
      localFallback: true,
      apiKeyStorage: 'secure-local',
      model: '',
      testPromptEnabled: false
    }
  },
  {
    id: 'test-center',
    title: 'Test-Center / Qualitaetssicherung',
    category: 'test',
    summary: 'Listet Tests, Testgruppen, letzte Laeufe und vorbereitet Testberichte.',
    whenToUse: 'Wenn der Workflow, Container oder Freigaben geprueft werden sollen.',
    steps: ['Testgruppe waehlen', 'Testlauf starten oder Status lesen', 'Fehler pruefen', 'Bericht exportieren', 'Testvorlage erzeugen'],
    defaultConfig: {
      defaultRun: 'verify',
      reportFormat: 'json-html',
      dangerousTestsDisabled: true,
      testDataFolder: 'data/test-runs',
      groups: ['manifest', 'roles', 'content-factory', 'path-security', 'ui-renderer']
    }
  },
  {
    id: 'system-diagnostics',
    title: 'Systemdiagnose / Pruefberichte',
    category: 'diagnostics',
    summary: 'Prueft Manifeste, ReleaseKeys, Pfade, Teilnehmerinhalte und Exportfaehigkeit.',
    whenToUse: 'Wenn technische Inkonsistenzen im lokalen System gesucht werden sollen.',
    steps: ['Prueftiefe setzen', 'Manifest- und Pfadpruefung starten', 'Warnungen auswerten', 'Bericht speichern'],
    defaultConfig: {
      depth: 'standard',
      pathCheck: true,
      manifestCheck: true,
      releaseKeyCheck: true,
      participantSolutionCheck: true,
      exportReadinessCheck: true
    }
  }
];

function listAdminTools() {
  return adminTools.map((tool) => ({ ...tool, defaultConfig: { ...tool.defaultConfig }, steps: [...tool.steps] }));
}

function getAdminTool(toolId) {
  return listAdminTools().find((tool) => tool.id === toolId) || null;
}

module.exports = {
  listAdminTools,
  getAdminTool
};
