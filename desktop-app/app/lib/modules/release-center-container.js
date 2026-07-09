const manifest = {
  id: 'release-center',
  name: 'Freigabezentrum',
  displayName: 'Freigabezentrum',
  courseName: 'Freigabezentrum',
  courseId: 'release-center',
  department: 'ALLGEMEIN',
  description: 'Benutzerkonten Kurse und Tools freischalten oder entziehen.',
  category: 'admin',
  icon: 'ShieldCheck',
  route: '/modules/release-center',
  visibleInLauncher: true,
  status: 'active',
  version: '0.1.0',
  containerType: 'system',
  assignable: false,
  allowedRoles: ['Admin', 'SuperAdmin'],
  tags: ['Admin', 'Freigaben', 'Benutzer'],
  requiredPermissions: ['module.releaseCenter.view'],
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
      id: 'release-center-module',
      label: 'Freigabezentrum',
      path: manifest.route,
      componentRef: 'electron:openReleaseCenter',
      sourcePath: 'desktop-app/app/renderer/tool-center/release-center.html',
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
