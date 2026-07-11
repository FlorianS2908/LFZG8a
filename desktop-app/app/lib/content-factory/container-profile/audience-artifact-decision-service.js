const { createDefaultContainerProfile } = require('./container-profile-types');

function decideArtifactSuggestions(input = {}) {
  const topic = input.topic || {};
  const day = input.day || {};
  const targetAudience = input.targetAudience || {};
  const profile = createDefaultContainerProfile(input.containerProfile || {});
  const base = {
    dayNumber: Number(day.dayNumber || input.dayNumber || 1),
    topicId: topic.id || `topic-${day.dayNumber || 1}`,
    topicTitle: topic.title || day.mainTopic || day.title || 'Thema',
    difficulty: audienceDifficulty(targetAudience),
    recommended: true,
    canBeChangedByUser: true,
    warnings: []
  };
  const suggestions = [];
  addReadme(suggestions, base, profile, targetAudience);
  if (profile.courseType === 'java') addJavaSuggestions(suggestions, base, targetAudience, false);
  if (profile.courseType === 'java-maven') addJavaSuggestions(suggestions, base, targetAudience, true);
  if (profile.courseType === 'python') addPythonSuggestions(suggestions, base, targetAudience);
  if (profile.courseType === 'jupyter') addJupyterSuggestions(suggestions, base, targetAudience);
  if (profile.courseType === 'sql' || profile.courseType === 'database-project') addSqlSuggestions(suggestions, base, targetAudience);
  if (profile.courseType === 'php-xampp') addPhpSuggestions(suggestions, base, targetAudience);
  if (profile.courseType === 'uml-pap') addDiagramSuggestions(suggestions, base, targetAudience);
  if (profile.courseType === 'html-css') addHtmlCssSuggestions(suggestions, base, targetAudience);
  if (profile.courseType === 'mixed-project') {
    addHtmlCssSuggestions(suggestions, base, targetAudience);
    addDiagramSuggestions(suggestions, base, targetAudience);
  }
  return { artifactSuggestions: suggestions };
}

function addSuggestion(list, base, patch) {
  list.push({
    id: `suggestion-${base.dayNumber}-${list.length + 1}`,
    dayNumber: base.dayNumber,
    topicId: base.topicId,
    title: patch.title,
    kind: patch.kind,
    format: patch.format,
    difficulty: patch.difficulty || base.difficulty,
    role: patch.role || 'participant',
    recommended: patch.recommended !== false,
    reason: patch.reason,
    targetAudienceImpact: patch.targetAudienceImpact || 'An Zielgruppe und Vorkenntnisse angepasst.',
    canBeChangedByUser: true,
    warnings: patch.warnings || []
  });
}

function addReadme(list, base, profile) {
  if (!profile.generateReadme) return;
  addSuggestion(list, base, { title: `README zu ${base.topicTitle}`, kind: 'readme', format: 'md', role: 'shared', reason: 'Jeder Kurscontainer braucht eine sichere manuelle Orientierung.' });
}

function addJavaSuggestions(list, base, audience, forceMaven) {
  const advanced = ['intermediate', 'advanced'].includes(audience.priorKnowledge) || audience.learningLevel === 'advanced';
  const useMaven = forceMaven || advanced;
  if (useMaven) {
    addSuggestion(list, base, { title: `Maven-Starter zu ${base.topicTitle}`, kind: 'project', format: 'maven-project', reason: 'Fortgeschrittene Zielgruppe kann mit Projektstruktur und Import in IDE arbeiten.' });
    addSuggestion(list, base, { title: `Maven-Loesungsprojekt zu ${base.topicTitle}`, kind: 'solution', format: 'maven-project', role: 'teacher', reason: 'Loesungsprojekt bleibt ausschliesslich im Dozentenbereich.' });
  } else {
    addSuggestion(list, base, { title: `Einfache Java-Aufgabe zu ${base.topicTitle}`, kind: 'starter', format: 'java', reason: 'Keine oder geringe Java-Vorkenntnisse: einfache Datei ohne Maven, Packages und JUnit.', warnings: ['Maven wurde nicht automatisch vorgeschlagen, weil die Zielgruppe geringe Java-Vorkenntnisse hat.'] });
    addSuggestion(list, base, { title: `Java-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'java', role: 'teacher', reason: 'Dozentenloesung als separate Java-Datei.' });
  }
  if (audience.examOrientation) addSuggestion(list, base, { title: `Codeverstaendnis zu ${base.topicTitle}`, kind: 'task', format: 'md', reason: 'Pruefungsorientierung: Code lesen, Fehler erkennen und Ausgabe begruenden.' });
}

function addPythonSuggestions(list, base, audience) {
  const advanced = ['intermediate', 'advanced'].includes(audience.priorKnowledge);
  addSuggestion(list, base, { title: `Python-Aufgaben zu ${base.topicTitle}`, kind: advanced ? 'project' : 'starter', format: 'py', reason: advanced ? 'Fortgeschrittene erhalten eine kleine Projektstruktur.' : 'Einsteiger erhalten einfache .py-Dateien.' });
  addSuggestion(list, base, { title: `Python-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'py', role: 'teacher', reason: 'Loesung bleibt im Dozentenbereich.' });
  if (audience.needsStepByStep) addJupyterSuggestions(list, base, audience);
}

function addJupyterSuggestions(list, base) {
  addSuggestion(list, base, { title: `Notebook zu ${base.topicTitle}`, kind: 'notebook', format: 'ipynb', reason: 'Schrittweise Erarbeitung mit Markdown und leeren Codezellen.' });
  addSuggestion(list, base, { title: `Notebook-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'ipynb', role: 'teacher', reason: 'Loesungsnotebook nur fuer Dozenten.' });
}

function addSqlSuggestions(list, base, audience) {
  addSuggestion(list, base, { title: `SQL-Starter zu ${base.topicTitle}`, kind: 'database', format: 'sql', reason: 'SQL-Dateien werden nur erzeugt, niemals automatisch ausgefuehrt.' });
  addSuggestion(list, base, { title: `phpMyAdmin Importanleitung zu ${base.topicTitle}`, kind: 'setup', format: 'md', role: 'shared', reason: 'Einsteiger brauchen manuelle Importhinweise ohne CLI-Zwang.' });
  addSuggestion(list, base, { title: `SQL-Loesungen zu ${base.topicTitle}`, kind: 'solution', format: 'sql', role: 'teacher', reason: 'Loesungsskripte nur im Dozentenbereich.' });
  if (['intermediate', 'advanced'].includes(audience.priorKnowledge)) addSuggestion(list, base, { title: `SQL-Vertiefung zu ${base.topicTitle}`, kind: 'database', format: 'sql', reason: 'Fortgeschrittene koennen Views, Transaktionen oder Procedures pruefen.' });
}

function addPhpSuggestions(list, base) {
  addSuggestion(list, base, { title: `XAMPP-Starter zu ${base.topicTitle}`, kind: 'project', format: 'php', reason: 'PHP/XAMPP-Projekt mit manueller Startanleitung.' });
  addSuggestion(list, base, { title: `XAMPP-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'php', role: 'teacher', reason: 'Loesungsprojekt nur im Dozentenbereich.' });
}

function addDiagramSuggestions(list, base) {
  addSuggestion(list, base, { title: `Draw.io Vorlage zu ${base.topicTitle}`, kind: 'diagram', format: 'drawio', reason: 'Draw.io ist das sichere Primaerformat fuer Diagrammaufgaben.' });
  addSuggestion(list, base, { title: `Draw.io Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'drawio', role: 'teacher', reason: 'Vollstaendigere Diagrammloesung nur im Dozentenbereich.' });
}

function addHtmlCssSuggestions(list, base) {
  addSuggestion(list, base, { title: `HTML/CSS Starter zu ${base.topicTitle}`, kind: 'starter', format: 'html', reason: 'Starterdateien fuer Web-Aufgaben.' });
  addSuggestion(list, base, { title: `CSS Arbeitsdatei zu ${base.topicTitle}`, kind: 'starter', format: 'css', reason: 'Getrennte CSS-Datei fuer Arbeitsphase.' });
  addSuggestion(list, base, { title: `HTML/CSS Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'html', role: 'teacher', reason: 'Loesung nur im Dozentenbereich.' });
}

function audienceDifficulty(audience = {}) {
  if (audience.priorKnowledge === 'none') return 'easy';
  if (['intermediate', 'advanced'].includes(audience.priorKnowledge)) return 'hard';
  return 'normal';
}

module.exports = {
  decideArtifactSuggestions
};
