const { normalizeDidacticProfile } = require('./didactic-profile-service');

const requiredProfileTerms = {
  'explain-demo-practice': [/erklaer|erklär|theory|theorie/i, /demo/i, /uebung|übung|aufgabe/i, /reflexion|zusammenfassung/i],
  'problem-first': [/problemfall/i, /hypothese|vermutung/i, /analyse/i, /korrektur/i, /systematisierung/i],
  'project-based': [/projektziel/i, /tagesbaustein/i, /projektaufgabe/i, /fortschritt/i, /projekt.*reflexion|reflexion/i],
  'worked-example-fading': [/musterbeispiel/i, /gefuehrt|geführt/i, /luecke|lücke/i, /freie? aufgabe/i, /abnehmende hilfen|fading|hilf/i],
  'exam-training': [/pruefungsimpuls|prüfungsimpuls/i, /zeitaufgabe/i, /bewertungskriterien/i, /typische fehler/i, /mini-test|quiz/i],
  'station-learning': [/station/i, /grundlagen/i, /anwendung|transfer|challenge/i, /selbstcheck/i, /station.*freig/i],
  'flipped-classroom': [/vorbereitung/i, /einstiegscheck/i, /praxisphase/i, /debrief|besprechung/i, /reflexion/i],
  'guided-coding': [/live-coding/i, /code-along|mitmachen/i, /microtask|zwischenaufgabe/i, /erweiter/i, /code-review|quiz/i]
};

function runDidacticQualityGate(result = {}, context = {}) {
  const profile = normalizeDidacticProfile(context.didacticProfile || result.didacticProfile || {});
  const errors = [];
  const warnings = [];
  const recommendations = [];
  const evidence = [];
  const text = JSON.stringify({
    flow: result.didacticFlow || [],
    webvariant: result.webvariant || {},
    tasks: result.tasks || [],
    demos: result.demos || [],
    releasePlan: result.releasePlan || [],
    reflection: result.reflection || {},
    teacherRunbook: result.teacherRunbook || {}
  });
  const runbook = result.teacherRunbook || {};
  const phases = Array.isArray(runbook.phases) ? runbook.phases : [];

  check(Boolean((result.didacticFlow || []).length), 'didacticFlow vorhanden.', 'didacticFlow fehlt.', errors, evidence);
  check(Boolean(phases.length), 'teacherRunbook vorhanden.', 'teacherRunbook fehlt.', errors, evidence);
  check(!phases.length || runbookMatchesProfile(profile, runbook), 'teacherRunbook passt zum Profil.', 'teacherRunbook passt nicht sichtbar zum didacticProfile.', warnings, evidence);
  check(!phases.length || phases.every((phase) => phase.teacherAction), 'Jede Runbook-Phase hat teacherAction.', 'Runbook-Phase ohne teacherAction.', errors, evidence);
  check(!phases.length || phases.every((phase) => phase.participantAction), 'Jede Runbook-Phase hat participantAction.', 'Runbook-Phase ohne participantAction.', errors, evidence);
  check(!phases.length || phases.some((phase) => (phase.moderationQuestions || []).length), 'Moderationsfragen vorhanden.', 'Moderationsfragen fehlen im teacherRunbook.', warnings, evidence);
  check(!phases.length || phases.some((phase) => (phase.typicalProblems || []).length), 'Typische Fehler vorhanden.', 'Typische Fehler fehlen im teacherRunbook.', warnings, evidence);
  check(!phases.length || phases.some((phase) => phase.differentiation?.supportWeak && phase.differentiation?.challengeStrong), 'Differenzierung vorhanden.', 'Differenzierung fuer schwache/starke Teilnehmende fehlt.', warnings, evidence);
  check(!phases.length || phases.some((phase) => phase.checkpoint), 'Checkpoints vorhanden.', 'Checkpoints fehlen im teacherRunbook.', warnings, evidence);
  check(flowMatches(profile, result.didacticFlow || []), 'LessonFlow passt zum Profil.', 'LessonFlow passt nicht vollstaendig zum Profil.', warnings, evidence);
  (requiredProfileTerms[profile.id] || []).forEach((pattern) => {
    if (pattern.test(text)) evidence.push(`Regel erfuellt: ${pattern}`);
    else warnings.push(`Profilregel nicht sichtbar umgesetzt: ${pattern}`);
  });
  check(Boolean((result.releasePlan || []).length), 'ReleasePlan vorhanden.', 'ReleasePlan fehlt.', warnings, evidence);
  if (profile.demoStrategy && profile.demoStrategy !== 'none') {
    check(new RegExp(escapeRegex(profile.demoStrategy), 'i').test(text) || phases.some((phase) => phase.demoId), 'DemoStrategy im Runbook sichtbar.', 'DemoStrategy ist im Runbook nicht sichtbar.', warnings, evidence);
  }
  if (profile.releaseStrategy) {
    check(new RegExp(escapeRegex(profile.releaseStrategy), 'i').test(text) || phases.some((phase) => (phase.releaseActions || []).length), 'ReleaseStrategy im Runbook sichtbar.', 'ReleaseStrategy ist im Runbook nicht sichtbar.', warnings, evidence);
  }
  if (profile.taskProgression) {
    check(new RegExp(escapeRegex(profile.taskProgression), 'i').test(text) || (result.tasks || []).some((task) => task.progressionLevel), 'Aufgabenprogression sichtbar.', 'Aufgabenprogression ist nicht sichtbar.', warnings, evidence);
  }
  check(Boolean(result.reflection?.mode || (result.reflection?.questions || []).length), 'Reflexion vorhanden.', 'Reflexion fehlt.', warnings, evidence);
  if (profile.requiresReflection) {
    check(/reflexion|reflection/i.test(text), 'Erforderliche Reflexion sichtbar.', 'Profil verlangt Reflexion, aber sie ist nicht sichtbar.', warnings, evidence);
  }
  if (profile.requiresTeacherNotes) {
    check(/Dozentenhinweise|Didaktisches Konzept|Freigabehinweis|Unterrichtsfluss/i.test(text), 'Dozentenhinweise vorhanden.', 'Dozentenhinweise fehlen.', warnings, evidence);
  }
  const participantText = JSON.stringify([result.webvariant?.participantHtmlSections || [], result.tasks || []]);
  if (/loesung|lösung|solution|erwartungshorizont|dozentenhinweis|freigabezentrum|teacherRunbook|unterrichtsablauf|dozenten-fahrplan/i.test(participantText)) {
    errors.push('Teilnehmeransicht enthaelt Loesungs- oder Dozentenhinweise.');
  } else {
    evidence.push('Teilnehmeransicht ist loesungsfrei.');
  }
  (result.demos || []).forEach((demo) => {
    const demoText = JSON.stringify(demo);
    if (demo.visibleForParticipants === true && /loesung|lösung|solution|erwartungshorizont/i.test(demoText)) errors.push(`Demo enthaelt Loesungshinweis: ${demo.id || demo.title}`);
    if (profile.defaultParticipantDemoVisible !== true && demo.visibleForParticipants === true) warnings.push(`Demo ist fuer Teilnehmende sichtbar, obwohl Profil dozent-only erwartet: ${demo.id || demo.title}`);
  });
  if (warnings.length) recommendations.push('Tagesentwurf gegen didaktische Profilregeln manuell pruefen und ggf. neu generieren.');
  const score = Math.max(0, 100 - errors.length * 25 - warnings.length * 7);
  return {
    status: errors.length ? 'failed' : warnings.length ? 'warning' : 'passed',
    score,
    errors,
    warnings,
    recommendations,
    evidence
  };
}

function flowMatches(profile, flow = []) {
  const phases = flow.map((item) => item.phase);
  return (profile.lessonFlow || []).every((phase) => phases.includes(phase));
}

function runbookMatchesProfile(profile, runbook = {}) {
  const text = JSON.stringify(runbook);
  const patterns = requiredProfileTerms[profile.id] || [];
  return patterns.length ? patterns.slice(0, 3).some((pattern) => pattern.test(text)) : true;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function check(condition, passEvidence, failMessage, target, evidence) {
  if (condition) evidence.push(passEvidence);
  else target.push(failMessage);
}

module.exports = {
  runDidacticQualityGate
};
