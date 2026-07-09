const manifest = {
  id: 'content-factory',
  name: 'ueTool_asSaaS ContentFactory',
  displayName: 'ContentFactory',
  courseName: 'ueTool_asSaaS ContentFactory',
  courseId: 'content-factory',
  department: 'ALLGEMEIN',
  description: 'Lerninhalte, Aufgaben, Loesungen und Materialien importieren, zuordnen und als Unterrichtscontainer veroeffentlichen.',
  category: 'admin',
  icon: 'Factory',
  route: '/modules/content-factory',
  visibleInLauncher: true,
  status: 'active',
  version: '0.1.0',
  containerType: 'system',
  assignable: false,
  allowedRoles: ['Admin', 'SuperAdmin'],
  tags: ['Container', 'Generator', 'Unterricht', 'Import', 'Factory'],
  requiredPermissions: ['module.contentFactory.view'],
  requiredRoles: ['Admin', 'SuperAdmin'],
  storageMode: 'static',
  standaloneEntry: '',
  exportable: false,
  createdBy: 'PLOGLAN Local MVP',
  createdAt: '2026-07-07T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z'
};

const systemContainer = {
  id: manifest.id,
  manifest,
  status: manifest.status,
  protected: true,
  routes: [
    {
      id: 'content-factory-module',
      label: 'ueTool_asSaaS ContentFactory',
      path: manifest.route,
      componentRef: 'electron:openContentFactory',
      sourcePath: 'desktop-app/app/renderer/tool-center/factory.html',
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
