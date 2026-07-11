const { createDefaultContainerProfile } = require('./container-profile-types');

function decideArtifactSuggestions(input = {}) {
  const topic = input.topic || {};
  const day = input.day || {};
  const targetAudience = input.targetAudience || {};
  const ageProfile = describeAgeRange(targetAudience.ageRange);
  const profile = createDefaultContainerProfile(input.containerProfile || {});
  const base = {
    dayNumber: Number(day.dayNumber || input.dayNumber || 1),
    topicId: topic.id || `topic-${day.dayNumber || 1}`,
    topicTitle: topic.title || day.mainTopic || day.title || 'Thema',
    difficulty: audienceDifficulty(targetAudience),
    recommended: true,
    canBeChangedByUser: true,
    ageProfile,
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
    targetAudienceImpact: patch.targetAudienceImpact || base.ageProfile.impact,
    canBeChangedByUser: true,
    warnings: patch.warnings || []
  });
}

function addReadme(list, base, profile) {
  if (!profile.generateReadme) return;
  addSuggestion(list, base, { title: `README zu ${base.topicTitle}`, kind: 'readme', format: 'md', role: 'shared', reason: `Jeder Kurscontainer braucht eine sichere manuelle Orientierung. ${base.ageProfile.reason}` });
}

function addJavaSuggestions(list, base, audience, forceMaven) {
  const advanced = ['intermediate', 'advanced'].includes(audience.priorKnowledge) || audience.learningLevel === 'advanced';
  const useMaven = advanced || (forceMaven && base.ageProfile.group !== 'young');
  if (useMaven) {
    addSuggestion(list, base, { title: `Maven-Starter zu ${base.topicTitle}`, kind: 'project', format: 'maven-project', reason: `Fortgeschrittene Zielgruppe kann mit Projektstruktur und Import in IDE arbeiten. ${base.ageProfile.reason}` });
    addSuggestion(list, base, { title: `Maven-Loesungsprojekt zu ${base.topicTitle}`, kind: 'solution', format: 'maven-project', role: 'teacher', reason: 'Loesungsprojekt bleibt ausschliesslich im Dozentenbereich.' });
  } else {
    addSuggestion(list, base, { title: `Einfache Java-Aufgabe zu ${base.topicTitle}`, kind: 'starter', format: 'java', reason: `Keine oder geringe Java-Vorkenntnisse: einfache Datei ohne Maven, Packages und JUnit. ${base.ageProfile.reason}`, warnings: ['Maven wurde nicht automatisch vorgeschlagen, weil die Zielgruppe geringe Java-Vorkenntnisse oder junges Zielgruppenalter hat.'] });
    addSuggestion(list, base, { title: `Java-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'java', role: 'teacher', reason: 'Dozentenloesung als separate Java-Datei.' });
  }
  if (audience.examOrientation) addSuggestion(list, base, { title: `Codeverstaendnis zu ${base.topicTitle}`, kind: 'task', format: 'md', reason: 'Pruefungsorientierung: Code lesen, Fehler erkennen und Ausgabe begruenden.' });
}

function addPythonSuggestions(list, base, audience) {
  const advanced = ['intermediate', 'advanced'].includes(audience.priorKnowledge);
  addSuggestion(list, base, { title: `Python-Aufgaben zu ${base.topicTitle}`, kind: advanced && base.ageProfile.group !== 'young' ? 'project' : 'starter', format: 'py', reason: `${advanced && base.ageProfile.group !== 'young' ? 'Fortgeschrittene erhalten eine kleine Projektstruktur.' : 'Einsteiger erhalten einfache .py-Dateien.'} ${base.ageProfile.reason}` });
  addSuggestion(list, base, { title: `Python-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'py', role: 'teacher', reason: 'Loesung bleibt im Dozentenbereich.' });
  if (audience.needsStepByStep) addJupyterSuggestions(list, base, audience);
}

function addJupyterSuggestions(list, base) {
  addSuggestion(list, base, { title: `Notebook zu ${base.topicTitle}`, kind: 'notebook', format: 'ipynb', reason: 'Schrittweise Erarbeitung mit Markdown und leeren Codezellen.' });
  addSuggestion(list, base, { title: `Notebook-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'ipynb', role: 'teacher', reason: 'Loesungsnotebook nur fuer Dozenten.' });
}

function addSqlSuggestions(list, base, audience) {
  addSuggestion(list, base, { title: `SQL-Starter zu ${base.topicTitle}`, kind: 'database', format: 'sql', reason: 'SQL-Dateien werden nur erzeugt, niemals automatisch ausgefuehrt.' });
  addSuggestion(list, base, { title: `phpMyAdmin Importanleitung zu ${base.topicTitle}`, kind: 'setup', format: 'md', role: 'shared', reason: `${base.ageProfile.group === 'young' ? 'Junge Zielgruppen profitieren besonders von phpMyAdmin-Schritten.' : 'Einsteiger brauchen manuelle Importhinweise ohne CLI-Zwang.'} ${base.ageProfile.reason}` });
  addSuggestion(list, base, { title: `SQL-Loesungen zu ${base.topicTitle}`, kind: 'solution', format: 'sql', role: 'teacher', reason: 'Loesungsskripte nur im Dozentenbereich.' });
  if (['intermediate', 'advanced'].includes(audience.priorKnowledge)) addSuggestion(list, base, { title: `SQL-Vertiefung zu ${base.topicTitle}`, kind: 'database', format: 'sql', reason: 'Fortgeschrittene koennen Views, Transaktionen oder Procedures pruefen.' });
}

function addPhpSuggestions(list, base) {
  addSuggestion(list, base, { title: `XAMPP-Starter zu ${base.topicTitle}`, kind: 'project', format: 'php', reason: 'PHP/XAMPP-Projekt mit manueller Startanleitung.' });
  addSuggestion(list, base, { title: `XAMPP-Loesung zu ${base.topicTitle}`, kind: 'solution', format: 'php', role: 'teacher', reason: 'Loesungsprojekt nur im Dozentenbereich.' });
}

function addDiagramSuggestions(list, base) {
  addSuggestion(list, base, { title: `Draw.io Vorlage zu ${base.topicTitle}`, kind: 'diagram', format: 'drawio', reason: `${base.ageProfile.group === 'young' ? 'Vorbereitete Draw.io-Vorlage mit klarer Startstruktur.' : 'Draw.io ist das sichere Primaerformat fuer Diagrammaufgaben.'} ${base.ageProfile.reason}` });
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

function describeAgeRange(ageRange) {
  const value = String(ageRange || 'unknown').toLowerCase();
  if (value === '16-20') {
    return {
      group: 'young',
      impact: 'Zielgruppenalter 16-20: kuerzere Aufgaben, klare Schrittfolge, mehr Beispiele und einfache Projektstruktur.',
      reason: 'Zielgruppenalter 16-20 fuehrt zu kuerzeren Aufgaben, mehr Beispielen und reduzierter Projektkomplexitaet.'
    };
  }
  if (value === '20-30') {
    return {
      group: 'standard',
      impact: 'Zielgruppenalter 20-30: normale Aufgaben, moderate Transferanteile und passende Projektstruktur.',
      reason: 'Zielgruppenalter 20-30 erlaubt moderate Transferanteile und normale Aufgabenlaenge.'
    };
  }
  if (value === '30+' || value === '30-plus') {
    return {
      group: 'adult',
      impact: 'Zielgruppenalter 30+: berufspraktische Beispiele und Transfer auf Arbeitssituationen.',
      reason: 'Zielgruppenalter 30+ bevorzugt berufspraktische Beispiele und Arbeitssituationen.'
    };
  }
  return {
    group: 'safe-default',
    impact: 'Zielgruppenalter mixed/unknown: sichere Standardvorschlaege wie bisher.',
    reason: 'Kein klares Zielgruppenalter gesetzt; sichere Standardvorschlaege werden verwendet.'
  };
}

module.exports = {
  decideArtifactSuggestions,
  describeAgeRange
};
