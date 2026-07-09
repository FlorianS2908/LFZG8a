const adminToolDefinitions = [
  {
    id: 'container-adapter',
    displayName: 'Container-Adapter',
    courseName: 'Container-Adapter / Legacy-Migration',
    description: 'Bestehende Legacy-Kacheln analysieren und als Draft-Container vorbereiten.',
    icon: 'RefreshCw',
    tags: ['Migration', 'Legacy', 'Container']
  },
  {
    id: 'import-analysis',
    displayName: 'Import- & Dateianalyse',
    courseName: 'Import- & Dateianalyse',
    description: 'Dateien, ZIPs, Quellcode und SQL-Materialien sicher analysieren und klassifizieren.',
    icon: 'FileSearch',
    tags: ['Import', 'Analyse', 'ZIP']
  },
  {
    id: 'course-generator',
    displayName: 'Kurscontainer-Generator',
    courseName: 'Kurscontainer-Generator',
    description: 'Neue Kurscontainer mit Tagesstruktur, Unterrichtsplan und Reviewmodus vorbereiten.',
    icon: 'PackagePlus',
    tags: ['Generator', 'Kurs', 'Draft']
  },
  {
    id: 'quiz-builder',
    displayName: 'Quiz-Builder',
    courseName: 'Quiz-Builder',
    description: 'Quizfragen importieren, validieren und als Kursbestandteil oder eigene Kachel vorbereiten.',
    icon: 'ListChecks',
    tags: ['Quiz', 'Fragenpool', 'Validierung']
  },
  {
    id: 'container-export',
    displayName: 'Container-Export',
    courseName: 'Container-Export',
    description: 'Container als ZIP oder Standalone-Paket ohne Nutzerdaten und Secrets exportieren.',
    icon: 'Archive',
    tags: ['Export', 'ZIP', 'Standalone']
  },
  {
    id: 'ai-provider-config',
    displayName: 'KI-/Provider-Konfiguration',
    courseName: 'KI-/Provider-Konfiguration',
    description: 'Provider, lokalen Fallback und sichere API-Key-Konfiguration verwalten.',
    icon: 'BrainCircuit',
    tags: ['KI', 'Provider', 'Konfiguration']
  },
  {
    id: 'test-center',
    displayName: 'Test-Center',
    courseName: 'Test-Center / Qualitaetssicherung',
    description: 'Tests entdecken, Testlaeufe protokollieren, Berichte anzeigen und Testvorlagen vorbereiten.',
    icon: 'BadgeCheck',
    tags: ['Tests', 'Qualitaet', 'Berichte']
  },
  {
    id: 'system-diagnostics',
    displayName: 'Systemdiagnose',
    courseName: 'Systemdiagnose / Pruefberichte',
    description: 'Manifest-, Pfad-, ReleaseKey- und Exportfaehigkeitspruefungen zentral auswerten.',
    icon: 'Activity',
    tags: ['Diagnose', 'Pruefung', 'Berichte']
  }
];

function createAdminToolContainer(definition, order) {
  const manifest = {
    id: definition.id,
    name: definition.displayName,
    displayName: definition.displayName,
    courseName: definition.courseName,
    courseId: definition.id,
    department: 'ALLGEMEIN',
    description: definition.description,
    category: 'admin',
    icon: definition.icon,
    route: `/modules/${definition.id}`,
    visibleInLauncher: true,
    status: 'active',
    version: '0.1.0',
    containerType: 'system',
    assignable: false,
    allowedRoles: ['Admin', 'SuperAdmin'],
    requiredPermissions: [`module.${definition.id}.view`],
    requiredRoles: ['Admin', 'SuperAdmin'],
    requiredLicense: 'starter',
    tags: definition.tags,
    storageMode: 'static',
    exportable: false,
    legacyRoutes: [],
    createdBy: 'ueTool_asSaaS',
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z'
  };
  return {
    id: manifest.id,
    manifest,
    status: manifest.status,
    protected: true,
    routes: [
      {
        id: `${manifest.id}-module`,
        label: manifest.courseName,
        path: manifest.route,
        componentRef: 'electron:openAdminTool',
        sourcePath: 'desktop-app/app/renderer/tool-center/admin-tool.html',
        order
      }
    ],
    materials: [],
    assets: [],
    tasks: [],
    solutions: [],
    quizzes: []
  };
}

const adminToolContainers = adminToolDefinitions.map(createAdminToolContainer);

module.exports = {
  adminToolDefinitions,
  adminToolContainers,
  createAdminToolContainer
};
