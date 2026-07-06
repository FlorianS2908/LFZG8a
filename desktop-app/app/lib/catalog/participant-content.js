const participantQuickLinks = [
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
];

const participantProjects = [
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
];

module.exports = {
  participantProjects,
  participantQuickLinks
};
