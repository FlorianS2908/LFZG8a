const targetAreas = [
  'webvariant',
  'task',
  'solution',
  'quiz',
  'projectTask',
  'material',
  'asset',
  'style',
  'script',
  'presentation',
  'documentation',
  'classbookTemplate',
  'trainerInfo',
  'participantMaterial',
  'report',
  'other'
];

const targetAreaLabels = {
  webvariant: 'Webvariante',
  task: 'Aufgabe',
  solution: 'Loesung',
  quiz: 'Quiz',
  projectTask: 'Projektaufgabe',
  material: 'Material',
  asset: 'Asset/Bild',
  style: 'CSS/Style',
  script: 'JavaScript/Script',
  presentation: 'Praesentation',
  documentation: 'Dokumentation',
  classbookTemplate: 'Klassenbuch-Vorlage',
  trainerInfo: 'Dozenteninformation',
  participantMaterial: 'Teilnehmermaterial',
  report: 'Testbericht',
  other: 'Sonstiges'
};

const targetAreaFolders = {
  webvariant: 'webvariants',
  task: 'tasks',
  solution: 'solutions',
  quiz: 'quizzes',
  projectTask: 'projects',
  material: 'materials',
  asset: 'assets',
  style: 'styles',
  script: 'scripts',
  presentation: 'materials',
  documentation: 'documentation',
  classbookTemplate: 'classbook',
  trainerInfo: 'trainer-info',
  participantMaterial: 'participant-materials',
  report: 'reports',
  other: 'other'
};

module.exports = {
  targetAreas,
  targetAreaLabels,
  targetAreaFolders
};
