const teacherQuickLinks = [
  {
    id: 'teacher-dashboard',
    title: 'Dozentenarbeitsplatz',
    description: 'Bisherige zentrale Dozentenuebersicht als integrierter Inhalt.',
    path: 'dozent/index_dozent.html',
    releaseKey: null,
    kind: 'Uebersicht'
  },
  {
    id: 'teacher-tag-tool',
    title: 'HTML/CSS Tag-Tool',
    description: 'Tag-Erklaerungen, CSS-Varianten und Dozenteninfos.',
    path: 'dozent/tools/html-css-tag-tool-dozent.html',
    releaseKey: 'tool_tags',
    kind: 'Tool'
  },
  {
    id: 'teacher-quiz',
    title: 'Quiztool',
    description: 'Quizpools fuer Wiederholung und Sicherung.',
    path: 'dozent/tools/quiz/QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html',
    releaseKey: 'tool_quiz',
    kind: 'Tool'
  },
  {
    id: 'teacher-projects',
    title: 'Projektmaterialien',
    description: 'Projektpakete, Aufgaben, Ausgangssituationen und Loesungen.',
    path: 'dozent/Projektmaterialien/index.html',
    releaseKey: 'project_materials',
    kind: 'Projekt'
  },
  {
    id: 'teacher-additional',
    title: 'Zusatzaufgaben',
    description: 'Ergaenzende Aufgaben nach Kurstagen inklusive Dozentenloesungen.',
    path: 'dozent/zusatzaufgaben/index.html',
    releaseKey: 'additional_tasks',
    kind: 'Training'
  }
];

const teacherGuides = [
  {
    id: 'guide-workflow',
    title: 'Workflow-Uebersicht',
    path: 'LFZQ8a_Workflow_Uebersicht.html',
    kind: 'Dokumentation'
  },
  {
    id: 'guide-teacher',
    title: 'Dozentenleitfaden',
    path: 'dozent/tools/leitfaeden/Dozentenleitfaden.html',
    kind: 'Leitfaden'
  },
  {
    id: 'guide-week',
    title: 'Wochenplan HTML/CSS',
    path: 'dozent/tools/leitfaeden/Wochenplan_HTML_CSS.html',
    kind: 'Planung'
  },
  {
    id: 'guide-css',
    title: 'CSS-Techniken Uebersicht',
    path: 'dozent/tools/leitfaeden/CSS_Techniken_Uebersicht.html',
    kind: 'Referenz'
  }
];

module.exports = {
  teacherGuides,
  teacherQuickLinks
};
