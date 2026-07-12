const codeCoursePattern = /java|python|html-css|html|css|php|javascript|jupyter/i;

const profileSignals = {
  'explain-demo-practice': {
    priorKnowledge: ['basic', 'intermediate'],
    courseTypes: ['theory', 'html-css', 'mixed-project'],
    demoStrategies: ['teacher-demo'],
    reasons: ['Klassischer Ablauf mit Erklaerung, Demo und Uebung.']
  },
  'problem-first': {
    textPattern: /debug|fehler|analyse|korrektur|troubleshooting|bug/i,
    demoStrategies: ['error-demo'],
    reasons: ['Stark bei Fehleranalyse, Hypothesenbildung und Korrekturaufgaben.']
  },
  'project-based': {
    project: true,
    courseTypes: ['html-css', 'mixed-project', 'database-project', 'java-maven'],
    reasons: ['Passt bei Projektorientierung und sichtbarem Tagesbaustein.']
  },
  'worked-example-fading': {
    priorKnowledge: ['none', 'basic'],
    supportLevels: ['high-to-low', 'guided'],
    reasons: ['Einsteiger profitieren von Musterbeispiel, Fuehrung und abnehmenden Hilfen.']
  },
  'exam-training': {
    exam: true,
    assessmentPattern: /rubric|mini-test|quiz|review|bewertung|pruefung/i,
    reasons: ['Pruefungsorientierung braucht Zeitaufgaben, Kriterien und Mini-Test.']
  },
  'station-learning': {
    heterogeneous: true,
    reasons: ['Heterogene Gruppen profitieren von Stationen und Selbstcheck.']
  },
  'flipped-classroom': {
    textPattern: /wiederholung|vorbereitung|selbstlern|flipped|vorab|kurze vorbereitung/i,
    reasons: ['Vorbereitung und Einstiegscheck schaffen mehr Praxiszeit.']
  },
  'guided-coding': {
    courseTypePattern: codeCoursePattern,
    demoStrategies: ['live-coding'],
    reasons: ['Code-Themen profitieren von Live-Coding, Code-Along und Microtasks.']
  }
};

const fitCriteria = [
  'targetAudienceFit',
  'priorKnowledgeFit',
  'ageRangeFit',
  'courseTypeFit',
  'examFit',
  'projectFit',
  'demoFit',
  'releaseFit',
  'taskProgressionFit',
  'assessmentFit',
  'reflectionFit',
  'safetyFit'
];

function scoreLevel(score) {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 50) return 'usable';
  return 'weak';
}

module.exports = {
  profileSignals,
  fitCriteria,
  codeCoursePattern,
  scoreLevel
};
