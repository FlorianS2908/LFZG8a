const { normalizeDayGenerationResult } = require('./output-normalizer');
const { decideArtifactSuggestions, describeAgeRange } = require('../container-profile/audience-artifact-decision-service');
const { normalizeDidacticProfile } = require('../didactics/didactic-profile-service');
const { buildDidacticFlow, buildReleasePlan } = require('../didactics/lesson-flow-service');

class LocalHeuristicProvider {
  constructor() {
    this.name = 'local';
  }

  isConfigured() {
    return true;
  }

  async generateDayDraft(input = {}) {
    const day = input.day || {};
    const targetAudience = input.targetAudience || input.curriculumPlan?.targetAudience || {};
    const ageProfile = describeAgeRange(targetAudience.ageRange);
    const didacticProfile = normalizeDidacticProfile(input.didacticProfile || input.curriculumPlan?.didacticProfile);
    const dayNumber = Number(input.dayNumber || day.dayNumber || 1);
    const title = input.title || day.title || `Tag ${dayNumber}`;
    const goals = day.learningGoals?.length ? day.learningGoals : [`${mainTopic(day, title)} verstehen und anwenden.`];
    const blocks = normalizeBlocks(day, title);
    const sourceRefs = [`course-plan-day-${dayNumber}`, ...(input.referenceContext || []).map((ref) => ref.sourceRef).filter(Boolean)];
    const warnings = [];
    if (!input.materials?.length) warnings.push('Kein Zusatzmaterial fuer diesen Tag erkannt. Entwurf basiert auf Unterrichtsplan und Referenzmetadaten.');

    const didacticFlow = buildDidacticFlow(didacticProfile, { ...day, title });
    const tasks = createTasks(blocks, dayNumber, sourceRefs, targetAudience, didacticProfile);
    const solutions = createSolutions(tasks, blocks, dayNumber, sourceRefs, targetAudience);
    const quiz = createQuiz(blocks, dayNumber, sourceRefs, targetAudience);
    const artifacts = createArtifactPlan(day, dayNumber, input.containerProfile, targetAudience, input);
    const demos = createDemoSuggestions(day, blocks, input.containerProfile, didacticProfile);
    const releasePlan = buildReleasePlan(didacticProfile, [{ dayNumber, tasks, quiz }]);
    const reflection = createReflection(didacticProfile, title);
    const teacherSections = createTeacherSections({ title, goals, blocks, tasks, solutions, quiz, sourceRefs, warnings, targetAudience, ageProfile, didacticProfile, didacticFlow, releasePlan, reflection });
    const participantSections = createParticipantSections({ title, goals, blocks, tasks, quiz, sourceRefs, targetAudience, ageProfile, didacticProfile, didacticFlow, reflection });

    return normalizeDayGenerationResult({
      dayNumber,
      title,
      status: 'draft',
      webvariant: {
        teacherHtmlSections: teacherSections,
        participantHtmlSections: participantSections
      },
      tasks,
      solutions,
      quiz,
      artifacts,
      demos,
      didacticFlow,
      releasePlan,
      reflection,
      sourceRefs,
      warnings,
      aiAdditions: input.referenceContext?.length ? ['Referenzmetadaten wurden als Kontext beruecksichtigt.'] : []
    });
  }

  async generateCurriculumPlan(input = {}) {
    return {
      days: [],
      warnings: ['LocalHeuristicProvider nutzt die deterministische Curriculum-Zeitplanung.']
    };
  }

  async reviseDayDraft(input = {}) {
    const draft = input.existingDraft || await this.generateDayDraft(input);
    return {
      ...draft,
      warnings: [
        ...(draft.warnings || []),
        `Korrekturhinweis lokal vorgemerkt: ${String(input.correctionPrompt || '').slice(0, 180)}`
      ],
      aiAdditions: [
        ...(draft.aiAdditions || []),
        'Lokale Revision: fachliche Korrektur bitte pruefen.'
      ]
    };
  }
}

function createDemoSuggestions(day, blocks, containerProfile = {}, didacticProfile = {}) {
  if (didacticProfile.defaultDemoEnabled === false || didacticProfile.demoStrategy === 'none') return [];
  const text = [day.title, day.mainTopic, containerProfile.courseType, ...blocks.map((block) => block.topic)].join(' ');
  if (didacticProfile.demoStrategy === 'error-demo') {
    return [{ title: 'Demo: Fehlerbild analysieren', tool: 'vscode', description: 'Fehlerhafte Ausgangsdatei fuer Problem-First-Analyse. Keine Loesung enthalten.', suggestedFileName: 'demo_01_code/Main.java', buttonLabel: 'Fehler-Demo oeffnen' }];
  }
  if (didacticProfile.demoStrategy === 'worked-example') {
    return [{ title: 'Demo: Musterbeispiel betrachten', tool: 'vscode', description: 'Kurzes Musterbeispiel als Einstieg, danach Fading-Aufgaben.', suggestedFileName: 'demo_01_code/Main.java', buttonLabel: 'Musterbeispiel oeffnen' }];
  }
  if (didacticProfile.demoStrategy === 'live-coding') {
    return [{ title: 'Demo: Live-Coding starten', tool: 'vscode', description: 'Schrittweise Code-Demo zum Mitmachen.', suggestedFileName: /python|jupyter/i.test(text) ? 'demo_01_code/main.py' : 'demo_01_code/Main.java', buttonLabel: 'Live-Coding in VS Code oeffnen' }];
  }
  if (/\b(sql|datenbank|abfrage|select|join|phpmyadmin)\b/i.test(text)) {
    return [{ title: 'Demo: SQL-Datei lesen', tool: 'sql', description: 'Dozenten-Demo zum Lesen einer SQL-Datei ohne Ausfuehrung.', suggestedFileName: 'demo_01_abfrage.sql', buttonLabel: 'SQL-Demo oeffnen' }];
  }
  if (/\b(erm|uml|pap|diagramm|ablauf|modellierung)\b/i.test(text)) {
    return [{ title: 'Demo: Diagramm betrachten', tool: 'drawio', description: 'Dozenten-Demo mit einer kleinen Draw.io-Skizze.', suggestedFileName: 'demo_01_diagramm.drawio', buttonLabel: 'Diagramm-Demo oeffnen' }];
  }
  if (/\b(html|css|layout|flexbox|grid|responsive)\b/i.test(text)) {
    return [{ title: 'Demo: Live-Vorschau', tool: 'browser', description: 'Dozenten-Demo mit einer kurzen HTML/CSS-Vorschau.', suggestedFileName: 'demo_01_html_css/demo.html', buttonLabel: 'Live-Demo oeffnen' }];
  }
  if (/\b(tabelle|datenanalyse|csv|excel|berechnung|filter|pivot|auswertung)\b/i.test(text)) {
    return [{ title: 'Demo: Tabelle filtern', tool: 'excel', description: 'Dozenten-Demo mit einer kleinen CSV-Tabelle.', suggestedFileName: 'demo_01_tabelle.csv', buttonLabel: 'Demo in Excel oeffnen' }];
  }
  if (/\b(java|python|javascript|php|code|funktion|klasse|methode|kontrollstruktur)\b/i.test(text)) {
    return [{ title: 'Demo: Code lesen', tool: 'vscode', description: 'Dozenten-Demo mit einem kurzen Codebeispiel.', suggestedFileName: /python|jupyter/i.test(text) ? 'demo_01_code/main.py' : 'demo_01_code/Main.java', buttonLabel: 'Demo in VS Code oeffnen' }];
  }
  return [{ title: 'Demo: Beispieltext markieren', tool: 'word', description: 'Dozenten-Demo mit einem kurzen Beispieltext.', suggestedFileName: 'demo_01_text.rtf', buttonLabel: 'Demo in Word oeffnen' }];
}

function createArtifactPlan(day, dayNumber, containerProfile, targetAudience, input) {
  const topics = day.topics?.length ? day.topics : normalizeBlocks(day, day.title || `Tag ${dayNumber}`).map((block, index) => ({ id: `block-${dayNumber}-${index + 1}`, title: block.topic }));
  return topics.slice(0, 3).flatMap((topic) => decideArtifactSuggestions({
    topic,
    day: { ...day, dayNumber },
    containerProfile,
    targetAudience,
    courseGoal: input.courseGoal || input.curriculumPlan?.courseGoal || '',
    expectedOutcome: input.expectedOutcome || input.curriculumPlan?.expectedOutcome || '',
    didacticStyle: input.didacticStyle || input.curriculumPlan?.didacticStyle || 'guided'
  }).artifactSuggestions.map((suggestion) => ({
    id: suggestion.id,
    title: suggestion.title,
    kind: suggestion.kind,
    format: suggestion.format,
    role: suggestion.role,
    path: '',
    solutionOnly: suggestion.kind === 'solution' || suggestion.role === 'teacher',
    description: suggestion.reason,
    reason: suggestion.reason,
    targetAudienceImpact: suggestion.targetAudienceImpact,
    warnings: suggestion.warnings || []
  })));
}

function normalizeBlocks(day, title) {
  const fromBlocks = day.ueBlocks?.length ? day.ueBlocks : [];
  const fromTopics = day.topics?.length ? day.topics.map((topic) => ({
    topic: topic.title,
    learnerTask: topic.summary,
    teacherTask: topic.summary,
    evaluation: `Bewerten, ob ${topic.title} fachlich korrekt erklaert und angewendet wird.`,
    resources: (topic.sourceRefs || []).join(', ')
  })) : [];
  const blocks = fromBlocks.length ? fromBlocks : fromTopics;
  return (blocks.length ? blocks : [{ topic: mainTopic(day, title), learnerTask: '', teacherTask: '', evaluation: '', resources: '' }])
    .map((block, index) => ({
      topic: block.topic || block.title || `${title} Schwerpunkt ${index + 1}`,
      learnerTask: block.learnerTask || `Bearbeiten Sie einen nachvollziehbaren Praxisfall zu ${block.topic || title}.`,
      teacherTask: block.teacherTask || `Fuehren Sie ${block.topic || title} mit einem kurzen Beispiel ein und sichern Sie die Begriffe.`,
      evaluation: block.evaluation || `Erwartet wird eine fachlich richtige Anwendung von ${block.topic || title} mit kurzer Begruendung.`,
      resources: block.resources || 'Unterrichtsplan, eigene Notizen und freigegebene Materialien'
    }));
}

function createTeacherSections({ title, goals, blocks, tasks, solutions, quiz, sourceRefs, warnings, targetAudience, ageProfile, didacticProfile, didacticFlow, releasePlan, reflection }) {
  return [
    section('Unterrichtsfluss', renderFlow(didacticFlow), sourceRefs),
    section('Didaktisches Konzept', paragraph(`${didacticProfile.label}: ${didacticProfile.description}`), sourceRefs),
    section('Einstieg und Motivation', paragraph(`${teacherIntro(title, ageProfile)} Sammeln Sie Vorwissen und klaeren Sie, wozu das Thema gebraucht wird.`), sourceRefs),
    section('Lernziele', list(goals), sourceRefs),
    section('Vorwissen aktivieren', list(blocks.map((block) => `Begriff oder Erfahrung zu ${block.topic} abfragen und sichtbar sichern.`)), sourceRefs),
    section('Themenabschnitte', blocks.map((block) => `<p><strong>${escapeHtml(block.topic)}</strong><br>${escapeHtml(block.teacherTask)}</p>`).join(''), sourceRefs),
    section('Beispiel und Demo', list(blocks.map((block) => `Zeigen Sie ein kleines Beispiel zu ${block.topic} und markieren Sie typische Stolperstellen.`)), sourceRefs),
    section('Freigabehinweis', list(releasePlan.map((item) => item.releaseHint || 'Nach der Demo Aufgabe ueber Freigabezentrum freigeben.')), sourceRefs),
    section('Arbeitsphase', list(tasks.map((task) => `${task.title}: ${task.text}`)), sourceRefs),
    section('Reflexion und Sicherung', list(reflection.questions.length ? reflection.questions : [`Lassen Sie Ergebnisse vergleichen, Fachbegriffe korrigieren und offene Fragen notieren. ${ageProfile.group === 'adult' ? 'Verbinden Sie die Ergebnisse mit Arbeitssituationen der Teilnehmenden.' : ''} ${targetAudience.examOrientation ? 'Schliessen Sie mit einer pruefungsnahen Kurzfrage ab.' : ''}`]), sourceRefs),
    section('Zusammenfassung und Ausblick', paragraph(`Sichern Sie die wichtigsten Erkenntnisse zu ${title} und leiten Sie zum naechsten Kurstag ueber.`), sourceRefs),
    section('Dozentenhinweise', list([...(warnings.length ? warnings : ['Fachliche Endpruefung empfohlen.']), `Quizfragen: ${quiz.length}`, `Erwartungshorizonte: ${solutions.length}`]), sourceRefs)
  ];
}

function createParticipantSections({ title, goals, blocks, tasks, quiz, sourceRefs, targetAudience, ageProfile, didacticProfile, didacticFlow, reflection }) {
  const stepHint = targetAudience.priorKnowledge === 'none' || targetAudience.needsStepByStep
    ? 'Arbeiten Sie Schritt fuer Schritt und notieren Sie Rueckfragen.'
    : 'Begruenden Sie Ihre Entscheidungen fachlich.';
  const ageHint = ageProfile.group === 'young'
    ? 'Nutzen Sie das Beispiel und pruefen Sie jeden Schritt einzeln.'
    : ageProfile.group === 'adult'
      ? 'Uebertragen Sie das Ergebnis auf eine berufliche Situation.'
      : '';
  return [
    section('Lernweg', renderParticipantFlow(didacticFlow), sourceRefs),
    section('Einstieg', paragraph(`Heute geht es um ${title}. Ziel ist, die Begriffe einzuordnen und an einem Beispiel anzuwenden.`), sourceRefs),
    section('Lernziele', list(goals), sourceRefs),
    section('Vorwissen', list(blocks.map((block) => `Was wissen Sie bereits zu ${block.topic}? Notieren Sie ein Beispiel.`)), sourceRefs),
    section('Themenueberblick', list(blocks.map((block) => block.topic)), sourceRefs),
    section('Beispiel und Demo', paragraph(`Folgen Sie der Demo aufmerksam und markieren Sie die Schritte, die Sie spaeter selbst anwenden koennen.`), sourceRefs),
    section('Arbeitsphase', list(tasks.map((task) => `${task.title}: ${task.text} ${stepHint} ${ageHint}`)), sourceRefs),
    section('Reflexion', list(reflection.questions.length ? reflection.questions : ['Vergleichen Sie Ihr Vorgehen mit einer anderen Person und halten Sie zwei Erkenntnisse fest.']), sourceRefs),
    section('Zusammenfassung und Ausblick', paragraph(`Fassen Sie die wichtigsten Punkte zu ${title} in eigenen Worten zusammen.`), sourceRefs),
    section('Quiz-Vorbereitung', list(quiz.slice(0, 3).map((item) => item.text)), sourceRefs)
  ];
}

function createTasks(blocks, dayNumber, sourceRefs, targetAudience, didacticProfile = {}) {
  const profileLevels = levelsForDidacticProfile(didacticProfile);
  const levels = profileLevels.length ? profileLevels : targetAudience.difficultyMode === 'easy-normal-hard'
    ? ['leicht', 'mittel', 'schwer']
    : targetAudience.difficultyMode === 'normal-and-hard'
      ? ['mittel', 'schwer']
      : ['mittel'];
  return blocks.flatMap((block, blockIndex) => levels.map((level, levelIndex) => ({
    id: `task-${dayNumber}-${blockIndex + 1}-${levelIndex + 1}`,
    title: taskTitle(block.topic, level, didacticProfile),
    text: taskInstruction(block.topic, level, targetAudience, didacticProfile),
    difficulty: level,
    sourceRefs,
    aiGenerated: false
  })));
}

function taskInstruction(topic, level, targetAudience, didacticProfile = {}) {
  if (didacticProfile.id === 'problem-first') return `Analysieren Sie den Problemfall zu "${topic}", finden Sie die Ursache, korrigieren Sie den Ansatz und begruenden Sie Ihre Diagnose.`;
  if (didacticProfile.id === 'project-based') return `Erweitern Sie den Projektbaustein zu "${topic}", dokumentieren Sie den Fortschritt und markieren Sie offene Risiken.`;
  if (didacticProfile.id === 'exam-training') return `Bearbeiten Sie "${topic}" als Zeitaufgabe in 15 Minuten. Dokumentieren Sie Bewertungskriterien, typische Fehler und Ihr Ergebnis.`;
  if (didacticProfile.id === 'station-learning') return `Bearbeiten Sie die Station zu "${topic}" und fuehren Sie danach den Selbstcheck durch.`;
  if (didacticProfile.id === 'guided-coding') return level === 'erweiterung'
    ? `Erweitern Sie die Live-Coding-Demo zu "${topic}" um eine kleine Zusatzfunktion.`
    : `Coden Sie den Schritt zu "${topic}" mit und kommentieren Sie jede wichtige Zeile kurz.`;
  if (didacticProfile.id === 'worked-example-fading') {
    if (level === 'muster') return `Lesen Sie das Musterbeispiel zu "${topic}" und markieren Sie die Schluesselschritte.`;
    if (level === 'gefuehrt') return `Bearbeiten Sie die gefuehrte Aufgabe zu "${topic}" mit Hilfeschritten.`;
    if (level === 'luecke') return `Ergaenzen Sie die fehlenden Schritte zu "${topic}" und begruenden Sie Ihre Auswahl.`;
    return `Loesen Sie eine freie Aufgabe zu "${topic}" eigenstaendig.`;
  }
  const ageProfile = describeAgeRange(targetAudience.ageRange);
  if (level === 'leicht') {
    return ageProfile.group === 'young'
      ? `Erklaeren Sie "${topic}" in zwei kurzen Saetzen und ergaenzen Sie ein einfaches Beispiel.`
      : `Erklaeren Sie den Begriff "${topic}" in drei Saetzen und nennen Sie ein einfaches Beispiel.`;
  }
  if (level === 'schwer') {
    if (ageProfile.group === 'adult') return `Uebertragen Sie "${topic}" auf eine berufliche Arbeitssituation, begruenden Sie Ihre Entscheidung und nennen Sie Risiken.`;
    return targetAudience.projectOrientation
      ? `Uebertragen Sie "${topic}" auf ein eigenes kleines Projektbeispiel, begruenden Sie Ihre Entscheidungen und dokumentieren Sie Risiken.`
      : `Analysieren Sie ein komplexeres Beispiel zu "${topic}", vergleichen Sie zwei Vorgehensweisen und begruenden Sie Ihre Empfehlung.`;
  }
  if (ageProfile.group === 'young') return `Bearbeiten Sie ein gefuehrtes Beispiel zu "${topic}" Schritt fuer Schritt und markieren Sie offene Fragen.`;
  if (ageProfile.group === 'adult') return `Erstellen Sie ein praxisnahes Beispiel zu "${topic}" aus einer Arbeitssituation und dokumentieren Sie Ihr Vorgehen.`;
  return targetAudience.examOrientation
    ? `Bearbeiten Sie eine pruefungsnahe Situation zu "${topic}" in 15 Minuten und dokumentieren Sie Vorgehen, Ergebnis und Begruendung.`
    : `Erstellen Sie ein nachvollziehbares Beispiel zu "${topic}" und dokumentieren Sie Ihr Vorgehen in Stichpunkten.`;
}

function levelsForDidacticProfile(profile = {}) {
  if (profile.id === 'worked-example-fading') return ['muster', 'gefuehrt', 'luecke', 'frei'];
  if (profile.id === 'station-learning') return ['grundlagen', 'anwendung', 'transfer', 'challenge'];
  if (profile.id === 'guided-coding') return ['mitmachen', 'zwischenaufgabe', 'erweiterung'];
  if (profile.id === 'exam-training') return ['zeitaufgabe', 'auswertung', 'mini-test'];
  if (profile.id === 'problem-first') return ['analyse', 'korrektur', 'systematisierung'];
  if (profile.id === 'project-based') return ['projektbaustein', 'fortschrittscheck'];
  return [];
}

function taskTitle(topic, level, profile = {}) {
  if (profile.id === 'worked-example-fading') return `${capitalize(level)}: ${topic}`;
  if (profile.id === 'station-learning') return `Station ${capitalize(level)}: ${topic}`;
  if (profile.id === 'guided-coding') return `Guided Coding ${capitalize(level)}: ${topic}`;
  if (profile.id === 'exam-training') return `Pruefungstraining ${capitalize(level)}: ${topic}`;
  if (profile.id === 'problem-first') return `Problem-First ${capitalize(level)}: ${topic}`;
  if (profile.id === 'project-based') return `Projekt ${capitalize(level)}: ${topic}`;
  return `${capitalize(level)}e Aufgabe: ${topic}`;
}

function createReflection(profile = {}, title) {
  const base = profile.reflectionMode || 'end-of-day';
  return {
    mode: base,
    questions: [
      `Was war im Ablauf "${profile.label || 'Didaktisches Profil'}" fuer ${title} der wichtigste Schritt?`,
      'Welche Frage ist offen geblieben?',
      profile.assessmentMode ? `Wie sicher fuehlen Sie sich im Assessment-Modus ${profile.assessmentMode}?` : 'Was nehmen Sie fuer die naechste Aufgabe mit?'
    ]
  };
}

function renderFlow(flow = []) {
  return `<ol>${flow.map((item) => `<li><strong>${escapeHtml(item.title)}</strong>: ${escapeHtml(item.teacherAction)} ${escapeHtml(item.releaseHint || '')}</li>`).join('')}</ol>`;
}

function renderParticipantFlow(flow = []) {
  return `<ol>${flow.filter((item) => !/Dozent|Freigabezentrum/i.test(item.title + item.teacherAction)).map((item) => `<li><strong>${escapeHtml(item.title)}</strong>: ${escapeHtml(item.participantAction)}</li>`).join('')}</ol>`;
}

function teacherIntro(title, ageProfile) {
  if (ageProfile.group === 'young') return `Starten Sie mit einem kurzen anschaulichen Beispiel zu ${title}.`;
  if (ageProfile.group === 'adult') return `Starten Sie mit einer berufspraktischen Situation zu ${title}.`;
  return `Starten Sie mit einer kurzen Situation zu ${title}.`;
}

function createSolutions(tasks, blocks, dayNumber, sourceRefs, targetAudience) {
  return tasks.map((task, index) => {
    const block = blocks[Math.min(blocks.length - 1, Math.floor(index / Math.max(1, tasks.length / blocks.length)))] || blocks[0];
    return {
      id: `solution-${dayNumber}-${index + 1}`,
      taskId: task.id,
      title: `Erwartungshorizont ${index + 1}: ${block.topic}`,
      text: [
        `Erwartungshorizont: Der Lernende beschreibt ${block.topic} fachlich korrekt und wendet es auf die Aufgabe an.`,
        `Moegliche Schritte: Begriffe klaeren, Beispiel analysieren, Vorgehen dokumentieren, Ergebnis begruenden.`,
        `Bewertungshinweise: Fachliche Richtigkeit, nachvollziehbare Struktur, passende Begruendung und saubere Dokumentation.`,
        `Typische Fehler: Begriffe vermischen, Beispiel nicht auf ${block.topic} beziehen, Begruendung auslassen.${targetAudience.examOrientation ? ' Zeitmanagement beachten.' : ''}`
      ].join(' '),
      sourceRefs,
      aiGenerated: false
    };
  });
}

function createQuiz(blocks, dayNumber, sourceRefs, targetAudience) {
  const count = targetAudience.examOrientation ? 8 : 5;
  const topics = blocks.map((block) => block.topic);
  return Array.from({ length: count }, (_, index) => {
    const topic = topics[index % topics.length] || `Tag ${dayNumber}`;
    const type = ['single-choice', 'multiple-choice', 'true-false', 'matching'][index % 4];
    if (type === 'true-false') {
      return { id: `quiz-${dayNumber}-${index + 1}`, type, topic, difficulty: 'leicht', text: `Wahr oder falsch: ${topic} sollte immer mit einem konkreten Beispiel erklaert werden.`, options: ['Wahr', 'Falsch'], correct: [0], sourceRefs, aiGenerated: false };
    }
    if (type === 'multiple-choice') {
      return { id: `quiz-${dayNumber}-${index + 1}`, type, topic, difficulty: 'mittel', text: `Welche Aussagen passen zu ${topic}?`, options: ['Fachbegriffe sauber verwenden', 'Vorgehen begruenden', 'Ergebnis ohne Kontext abgeben', 'Beispiel dokumentieren'], correct: [0, 1, 3], sourceRefs, aiGenerated: false };
    }
    if (type === 'matching') {
      return { id: `quiz-${dayNumber}-${index + 1}`, type, topic, difficulty: 'mittel', text: `Ordnen Sie zu: Begriff, Beispiel und Begruendung im Kontext ${topic}.`, options: ['Begriff -> Definition', 'Beispiel -> Anwendung', 'Begruendung -> Warum passend'], correct: [0, 1, 2], sourceRefs, aiGenerated: false };
    }
    return { id: `quiz-${dayNumber}-${index + 1}`, type, topic, difficulty: 'leicht', text: `Was ist der wichtigste erste Schritt bei ${topic}?`, options: ['Begriffe klaeren', 'Ergebnis raten', 'Dokumentation weglassen', 'Quelle ignorieren'], correct: [0], sourceRefs, aiGenerated: false };
  });
}

function mainTopic(day, fallback) {
  return day.mainTopic || day.topics?.[0]?.title || day.subTopics?.[0] || fallback;
}

function section(title, content, sourceRefs) {
  return { title, content, sourceRefs, aiGenerated: false };
}

function paragraph(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function list(items) {
  return `<ul>${(items.length ? items : ['Fachlich pruefen und konkretisieren']).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
  LocalHeuristicProvider
};
