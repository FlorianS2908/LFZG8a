const manifest = {
  id: 'course-management',
  name: 'Kursverwaltung',
  displayName: 'Kursverwaltung',
  courseName: 'Kursverwaltung',
  courseId: 'course-management',
  department: 'ALLGEMEIN',
  description: 'Kursinstanzen anlegen, Dozenten und Teilnehmer zuordnen, Container verbinden und Syncstatus pruefen.',
  category: 'admin',
  icon: 'ClipboardList',
  route: '/modules/course-management',
  visibleInLauncher: true,
  status: 'active',
  version: '0.1.0',
  containerType: 'system',
  assignable: false,
  allowedRoles: ['course_manager', 'Admin', 'SuperAdmin'],
  requiredPermissions: ['module.courseManagement.view'],
  requiredRoles: ['course_manager', 'Admin', 'SuperAdmin'],
  requiredLicense: 'starter',
  tags: ['Kursverwaltung', 'CourseInstance', 'Sync'],
  storageMode: 'static',
  standaloneEntry: '',
  exportable: false,
  legacyRoutes: [],
  createdBy: 'ueTool_asSaaS',
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
};

const systemContainer = {
  id: manifest.id,
  manifest,
  status: manifest.status,
  protected: true,
  routes: [
    {
      id: 'course-management-module',
      label: 'Kursverwaltung',
      path: manifest.route,
      componentRef: 'electron:openCourseManagement',
      sourcePath: 'desktop-app/app/renderer/tool-center/course-management.html',
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
