const manifest = {
  id: 'participant-create',
  name: 'Teilnehmer anlegen',
  displayName: 'Teilnehmer anlegen',
  courseName: 'Teilnehmer anlegen',
  courseId: 'participant-create',
  department: 'ALLGEMEIN',
  description: 'Teilnehmer lokal vormerken, damit sie sich mit Admin-Freigabe registrieren koennen.',
  category: 'admin',
  icon: 'UserRoundPlus',
  route: '/modules/participant-create',
  visibleInLauncher: true,
  status: 'active',
  version: '0.1.0',
  containerType: 'system',
  assignable: false,
  allowedRoles: ['Admin', 'SuperAdmin'],
  tags: ['Admin', 'Benutzer', 'Teilnehmer'],
  requiredPermissions: ['module.userCreate.view'],
  requiredRoles: ['Admin', 'SuperAdmin'],
  storageMode: 'static',
  standaloneEntry: '',
  exportable: false,
  createdBy: 'ueTool_asSaaS',
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z'
};

const systemContainer = {
  id: manifest.id,
  manifest,
  status: manifest.status,
  protected: true,
  routes: [
    {
      id: 'participant-create-module',
      label: 'Teilnehmer anlegen',
      path: manifest.route,
      componentRef: 'electron:openUserCreate',
      sourcePath: 'desktop-app/app/renderer/tool-center/user-create.html',
      order: 1
    }
  ],
  materials: [],
  assets: [],
  tasks: [],
  solutions: [],
  quizzes: []
};

module.exports = {
  manifest,
  systemContainer
};
