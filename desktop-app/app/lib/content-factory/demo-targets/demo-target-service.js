const path = require('path');
const { createDemoSafety } = require('./demo-target-types');

function inferDemoTargetsForDays(input = {}) {
  const dayResults = input.dayResults || [];
  const coursePlanDays = input.coursePlan?.days || [];
  const options = input.options || {};
  const didacticProfile = input.didacticProfile || {};
  const maxPerDay = Math.max(0, Math.min(3, Number(options.maxPerDay ?? input.maxPerDay ?? 1)));
  if (didacticProfile.defaultDemoEnabled === false || didacticProfile.demoStrategy === 'none') return [];
  if (!maxPerDay) return [];
  return dayResults.flatMap((result) => {
    const planDay = coursePlanDays.find((day) => Number(day.dayNumber) === Number(result.dayNumber)) || {};
    const explicit = normalizeExplicitDemos(result.demos || [], result);
    const inferred = inferForDay(result, planDay, input.containerProfile || {}, didacticProfile);
    return [...explicit, ...inferred].slice(0, maxPerDay).map((target, index) => normalizeTarget(target, result, index, options));
  });
}

function inferForDay(result = {}, planDay = {}, profile = {}, didacticProfile = {}) {
  const text = collectTopicText(result, planDay, profile);
  const lower = text.toLowerCase();
  if (didacticProfile.demoStrategy === 'error-demo') return [codeDemo(result, lower, profile, 'Fehler-Demo oeffnen', 'Demo: Fehlerbild analysieren')];
  if (didacticProfile.demoStrategy === 'worked-example') return [codeDemo(result, lower, profile, 'Musterbeispiel oeffnen', 'Demo: Musterbeispiel betrachten')];
  if (didacticProfile.demoStrategy === 'live-coding') return [codeDemo(result, lower, profile, 'Live-Coding in VS Code oeffnen', 'Demo: Live-Coding')];
  if (/\b(sql|datenbank|datenbanken|abfrage|select|join|phpmyadmin)\b/i.test(text)) return [sqlDemo(result)];
  if (/\b(erm|uml|pap|diagramm|ablauf|modellierung)\b/i.test(text)) return [drawioDemo(result)];
  if (/\b(html|css|layout|flexbox|grid|responsive)\b/i.test(text)) return [htmlDemo(result)];
  if (/\b(tabelle|datenanalyse|csv|excel|berechnung|filter|pivot|auswertung)\b/i.test(text)) return [excelDemo(result)];
  if (/\b(text|dokumentation|bericht|lastenheft|pflichtenheft|protokoll|beschreibung)\b/i.test(text)) return [wordDemo(result)];
  if (/\b(java|python|javascript|php|c#|code|funktion|klasse|methode|kontrollstruktur)\b/i.test(text) || /java|python|jupyter/i.test(profile.courseType || '')) {
    return [codeDemo(result, lower, profile)];
  }
  return [wordDemo(result)];
}

function normalizeExplicitDemos(demos, result) {
  return demos.map((demo, index) => ({
    id: demo.id,
    dayNumber: result.dayNumber,
    title: demo.title || `Demo ${index + 1}`,
    description: demo.description || 'Kurze Dozenten-Demo zum Einstieg in das Thema.',
    tool: demo.tool || 'default',
    fileName: demo.suggestedFileName || demo.fileName || '',
    buttonLabel: demo.buttonLabel || buttonLabelForTool(demo.tool || 'default'),
    visibleForParticipants: demo.visibleForParticipants === true
  }));
}

function normalizeTarget(target, result, index, options = {}) {
  const dayNumber = Number(result.dayNumber || target.dayNumber || 1);
  const demoNumber = index + 1;
  const daySlug = `tag_${String(dayNumber).padStart(2, '0')}`;
  const id = target.id || `demo-tag${String(dayNumber).padStart(2, '0')}-${String(demoNumber).padStart(3, '0')}`;
  const filePath = target.filePath || `dozent/${daySlug}/demos/${target.fileName || defaultFileName(target.tool, demoNumber)}`;
  return {
    id,
    dayNumber,
    title: target.title || `Demo: ${result.title || `Tag ${dayNumber}`}`,
    description: target.description || 'Kurze Dozenten-Demo zum Einstieg in das Thema.',
    topicRef: target.topicRef || `day-${dayNumber}`,
    role: target.role || 'teacher',
    visibleForParticipants: options.visibleForParticipants === true || target.visibleForParticipants === true,
    tool: target.tool || 'default',
    launchMode: target.launchMode || launchModeForTool(target.tool),
    filePath,
    fallbackPath: target.fallbackPath || '',
    buttonLabel: target.buttonLabel || buttonLabelForTool(target.tool),
    safety: createDemoSafety(target.safety)
  };
}

function collectTopicText(result = {}, planDay = {}, profile = {}) {
  const values = [
    result.title,
    planDay.title,
    planDay.mainTopic,
    profile.courseType,
    ...(planDay.learningGoals || []),
    ...(planDay.subTopics || []),
    ...(planDay.ueBlocks || []).flatMap((block) => [block.topic, block.learnerTask, block.teacherTask, block.resources]),
    ...(result.tasks || []).flatMap((task) => [task.title, task.text]),
    ...(result.webvariant?.teacherHtmlSections || []).flatMap((section) => [section.title])
  ];
  return values.filter(Boolean).join(' ');
}

function excelDemo(result) {
  return { tool: 'excel', title: 'Demo: Tabelle filtern', fileName: 'demo_01_tabelle.csv', buttonLabel: 'Demo in Excel oeffnen', description: `Tabellen-Demo zu ${result.title || 'diesem Thema'}.` };
}

function wordDemo(result) {
  return { tool: 'word', title: 'Demo: Beispieltext markieren', fileName: 'demo_01_text.rtf', buttonLabel: 'Demo in Word oeffnen', description: `Text-Demo zu ${result.title || 'diesem Thema'}.` };
}

function codeDemo(result, lower, profile, buttonLabel = 'Demo in VS Code oeffnen', title = 'Demo: Code lesen') {
  if (/python|jupyter/.test(lower) || /python|jupyter/.test(profile.courseType || '')) {
    return { tool: 'vscode', title, fileName: 'demo_01_code/main.py', buttonLabel };
  }
  return { tool: 'vscode', title, fileName: 'demo_01_code/Main.java', buttonLabel };
}

function sqlDemo() {
  return { tool: 'sql', title: 'Demo: SQL-Datei lesen', fileName: 'demo_01_abfrage.sql', buttonLabel: 'SQL-Demo oeffnen' };
}

function drawioDemo() {
  return { tool: 'drawio', title: 'Demo: Diagramm betrachten', fileName: 'demo_01_diagramm.drawio', buttonLabel: 'Diagramm-Demo oeffnen' };
}

function htmlDemo() {
  return { tool: 'browser', title: 'Demo: Live-Vorschau', fileName: 'demo_01_html_css/demo.html', buttonLabel: 'Live-Demo oeffnen', launchMode: 'open-browser' };
}

function defaultFileName(tool, index) {
  const n = String(index).padStart(2, '0');
  if (tool === 'excel') return `demo_${n}_tabelle.csv`;
  if (tool === 'word') return `demo_${n}_text.rtf`;
  if (tool === 'sql') return `demo_${n}_abfrage.sql`;
  if (tool === 'drawio') return `demo_${n}_diagramm.drawio`;
  if (tool === 'browser') return `demo_${n}_html_css/demo.html`;
  return `demo_${n}_hinweis.md`;
}

function launchModeForTool(tool) {
  if (tool === 'browser') return 'open-browser';
  if (tool === 'vscode' || tool === 'jupyter') return 'open-folder';
  return 'open-file';
}

function buttonLabelForTool(tool) {
  if (tool === 'excel') return 'Demo in Excel oeffnen';
  if (tool === 'word') return 'Demo in Word oeffnen';
  if (tool === 'vscode' || tool === 'jupyter') return 'Demo in VS Code oeffnen';
  if (tool === 'sql') return 'SQL-Demo oeffnen';
  if (tool === 'drawio') return 'Diagramm-Demo oeffnen';
  if (tool === 'browser') return 'Live-Demo oeffnen';
  return 'Demo oeffnen';
}

module.exports = {
  inferDemoTargetsForDays,
  collectTopicText
};
