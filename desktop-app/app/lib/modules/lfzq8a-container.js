const manifest = {
  id: 'lfzq8a',
  name: 'HTML/CSS',
  displayName: 'HTML/CSS',
  courseName: 'HTML/CSS',
  courseId: 'html-css',
  department: 'FIAE',
  legacyName: 'LFZQ8a',
  description: 'HTML, CSS und Webentwicklung fuer Unterricht und Kursdurchfuehrung',
  category: 'course',
  icon: 'Code',
  route: '/modules/lfzq8a',
  legacyRoutes: ['/lfzq8a'],
  visibleInLauncher: true,
  status: 'active',
  version: '1.0.0',
  containerType: 'learning-content',
  assignable: true,
  allowedRoles: ['Dozent', 'Teilnehmer'],
  tags: ['HTML', 'CSS', 'Webentwicklung', 'FIAE'],
  requiredPermissions: ['module.lfzq8a.view'],
  requiredLicense: 'starter',
  catalogRef: 'desktop-app/app/lib/catalog',
  storageMode: 'static',
  standaloneEntry: '',
  exportable: true,
  createdBy: 'PLOGLAN Local MVP',
  createdAt: '2026-07-07T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z'
};

const learningContainer = {
  id: manifest.id,
  manifest,
  status: manifest.status,
  routes: [
    {
      id: 'lfzq8a-module',
      label: 'HTML/CSS Unterricht',
      path: manifest.route,
      componentRef: 'electron:openCourseFromWorkspace',
      sourcePath: 'desktop-app/app/renderer/course.html',
      order: 1
    },
    {
      id: 'lfzq8a-legacy',
      label: 'Alte LFZQ8a Route',
      path: '/lfzq8a',
      componentRef: 'redirect:/modules/lfzq8a',
      sourcePath: 'desktop-app/app/renderer/course.html',
      order: 2
    }
  ],
  materials: [
    {
      id: 'dozent-overview',
      title: 'Dozenten Kursview',
      type: 'html',
      sourcePath: 'dozent/index_dozent.html',
      targetPath: 'dozent/index_dozent.html',
      category: 'course-view',
      dayNumber: null,
      visibleForRoles: ['Admin', 'Dozent'],
      order: 1
    },
    {
      id: 'teilnehmer-overview',
      title: 'Teilnehmer Freigabeansicht',
      type: 'html',
      sourcePath: 'teilnehmer/index_teilnehmer.html',
      targetPath: 'teilnehmer/index_teilnehmer.html',
      category: 'participant-view',
      dayNumber: null,
      visibleForRoles: ['Admin', 'Dozent', 'Teilnehmer'],
      order: 2
    }
  ],
  assets: [
    {
      id: 'course-assets',
      filename: 'course-assets',
      mimeType: 'directory',
      sourcePath: 'dozent/assets',
      targetPath: 'dozent/assets',
      usage: 'Dozenten- und Kursdarstellung'
    }
  ],
  tasks: [
    {
      id: 'tag-01-tasks',
      title: 'Tag 1 Aufgaben',
      sourcePath: 'teilnehmer/aufgaben/tag_01_aufgaben.html',
      dayNumber: 1,
      difficulty: 'mixed',
      taskType: 'html-css'
    }
  ],
  solutions: [
    {
      id: 'tag-01-solutions',
      taskId: 'tag-01-tasks',
      sourcePath: 'dozent/loesungen/tag_01_loesungen_dozent.html',
      visibleForRoles: ['Admin', 'Dozent']
    }
  ],
  quizzes: [
    {
      id: 'tag-01-quiz-25',
      title: 'Tag 1 Quiz 25 Fragen',
      sourcePath: 'teilnehmer/tools/quiz/Tag_01_HTML_CSS_Basis_25_Fragen_35_Minuten.json',
      questionCount: 25,
      timeLimitMinutes: 35
    }
  ]
};

module.exports = {
  manifest,
  learningContainer
};
