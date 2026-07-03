const courseCatalog = {
  teacher: {
    quickLinks: [
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
    ],
    days: [
      {
        id: 'day-1',
        title: 'Tag 1 - CSS-Grundlagen',
        releaseKey: 'tag_01',
        theme: 'Selektoren, Box-Modell, Custom Properties',
        web: 'dozent/tag_01/LFZQ8a_tag_01_Webvariante_Dozent.html',
        tasks: 'dozent/tag_01/aufgaben_teilnehmer.html',
        solutions: 'dozent/tag_01/loesungen_dozent.html',
        quiz25: 'dozent/tools/quiz/Tag_01_CSS_Grundlagen_25_Fragen_35_Minuten.json',
        quiz50: 'dozent/tools/quiz/Tag_01_CSS_Grundlagen_50_Fragen_70_Minuten.json'
      },
      {
        id: 'day-2',
        title: 'Tag 2 - Flexbox',
        releaseKey: 'tag_02',
        theme: 'Navigation, Komponenten, Flexbox-Achsen',
        web: 'dozent/tag_02/LFZQ8a_tag_02_Webvariante_Dozent.html',
        tasks: 'dozent/tag_02/aufgaben_teilnehmer.html',
        solutions: 'dozent/tag_02/loesungen_dozent.html',
        quiz25: 'dozent/tools/quiz/Tag_02_Flexbox_Komponenten_25_Fragen_35_Minuten.json',
        quiz50: 'dozent/tools/quiz/Tag_02_Flexbox_Komponenten_50_Fragen_70_Minuten.json'
      },
      {
        id: 'day-3',
        title: 'Tag 3 - CSS Grid',
        releaseKey: 'tag_03',
        theme: 'Raster, Layoutbereiche, Datenlayouts',
        web: 'dozent/tag_03/LFZQ8a_tag_03_Webvariante_Dozent.html',
        tasks: 'dozent/tag_03/aufgaben_teilnehmer.html',
        solutions: 'dozent/tag_03/loesungen_dozent.html',
        quiz25: 'dozent/tools/quiz/Tag_03_CSS_Grid_Layout_25_Fragen_35_Minuten.json',
        quiz50: 'dozent/tools/quiz/Tag_03_CSS_Grid_Layout_50_Fragen_70_Minuten.json'
      },
      {
        id: 'day-4',
        title: 'Tag 4 - Responsive Design',
        releaseKey: 'tag_04',
        theme: 'Media Queries, Breakpoints, flexible Medien',
        web: 'dozent/tag_04/LFZQ8a_tag_04_Webvariante_Dozent.html',
        tasks: 'dozent/tag_04/aufgaben_teilnehmer.html',
        solutions: 'dozent/tag_04/loesungen_dozent.html',
        quiz25: 'dozent/tools/quiz/Tag_04_Responsive_Design_25_Fragen_35_Minuten.json',
        quiz50: 'dozent/tools/quiz/Tag_04_Responsive_Design_50_Fragen_70_Minuten.json'
      },
      {
        id: 'day-5',
        title: 'Tag 5 - Projektabschluss',
        releaseKey: 'tag_05',
        theme: 'Webfonts, Refactoring, Abschlussprojekt',
        web: 'dozent/tag_05/LFZQ8a_tag_05_Webvariante_Dozent.html',
        tasks: 'dozent/tag_05/aufgaben_teilnehmer.html',
        solutions: 'dozent/tag_05/loesungen_dozent.html',
        quiz25: 'dozent/tools/quiz/Tag_05_Webfonts_Projekt_Refactoring_25_Fragen_35_Minuten.json',
        quiz50: 'dozent/tools/quiz/Tag_05_Webfonts_Projekt_Refactoring_50_Fragen_70_Minuten.json'
      }
    ],
    projects: [
      {
        id: 'project-akkordeon',
        title: 'Projekt Akkordeon',
        releaseKey: 'project_materials',
        overview: 'dozent/Projektmaterialien/aufgaben/akkordeon/aufgabenpakete.html',
        workspace: 'dozent/Projektmaterialien/aufgaben/akkordeon/Ausgangssituation',
        solution: 'dozent/Projektmaterialien/loesungen/akkordeon/index.html'
      },
      {
        id: 'project-wunderland',
        title: 'Projekt Wunderland',
        releaseKey: 'project_materials',
        overview: 'dozent/Projektmaterialien/aufgaben/wunderland/aufgabenpakete.html',
        workspace: 'dozent/Projektmaterialien/aufgaben/wunderland/Ausgangssituation',
        solution: 'dozent/Projektmaterialien/loesungen/wunderland/index.html'
      }
    ],
    guides: [
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
    ]
  },
  participant: {
    quickLinks: [
      {
        id: 'participant-dashboard',
        title: 'Teilnehmer-Main-View',
        description: 'Freigegebene Tageskarten, Projekte und Tools.',
        path: 'teilnehmer/index_teilnehmer.html',
        releaseKey: null,
        kind: 'Uebersicht'
      },
      {
        id: 'participant-tags',
        title: 'HTML/CSS Tag-Tool',
        description: 'Tag- und CSS-Uebersicht fuer die Bearbeitung.',
        path: 'teilnehmer/tools/html-css-tag-tool-teilnehmer.html',
        releaseKey: 'tool_tags',
        kind: 'Tool'
      },
      {
        id: 'participant-projects',
        title: 'Projektmaterialien',
        description: 'Aufgabenpakete und Ausgangssituationen ohne Loesungen.',
        path: 'teilnehmer/Projektmaterialien/index.html',
        releaseKey: 'project_materials',
        kind: 'Projekt'
      }
    ],
    projects: [
      {
        id: 'participant-akkordeon',
        title: 'Akkordeon Arbeitsordner',
        releaseKey: 'project_materials',
        overview: 'teilnehmer/Projektmaterialien/aufgaben/akkordeon/aufgabenpakete.html',
        workspace: 'teilnehmer/Projektmaterialien/aufgaben/akkordeon/Ausgangssituation'
      },
      {
        id: 'participant-wunderland',
        title: 'Wunderland Arbeitsordner',
        releaseKey: 'project_materials',
        overview: 'teilnehmer/Projektmaterialien/aufgaben/wunderland/aufgabenpakete.html',
        workspace: 'teilnehmer/Projektmaterialien/aufgaben/wunderland/Ausgangssituation'
      }
    ]
  }
};

function flattenCatalog(catalog = courseCatalog) {
  const teacher = catalog.teacher;
  const participant = catalog.participant;
  return [
    ...teacher.quickLinks.map((item) => item.path),
    ...teacher.days.flatMap((day) => [day.web, day.tasks, day.solutions, day.quiz25, day.quiz50]),
    ...teacher.projects.flatMap((project) => [project.overview, project.workspace, project.solution]),
    ...teacher.guides.map((item) => item.path),
    ...participant.quickLinks.map((item) => item.path),
    ...participant.projects.flatMap((project) => [project.overview, project.workspace])
  ].filter(Boolean);
}

module.exports = {
  courseCatalog,
  flattenCatalog
};
