const { normalizeDayGenerationResult } = require('./output-normalizer');

class LocalHeuristicProvider {
  constructor() {
    this.name = 'local';
  }

  isConfigured() {
    return true;
  }

  async generateDayDraft(input = {}) {
    const day = input.day || {};
    const dayNumber = Number(input.dayNumber || day.dayNumber || 1);
    const title = input.title || day.title || `Tag ${dayNumber}`;
    const goals = day.learningGoals?.length ? day.learningGoals : ['Tagesziel aus Unterrichtsplan pruefen.'];
    const blocks = day.ueBlocks?.length ? day.ueBlocks : [{
      topic: day.mainTopic || title,
      teacherTask: 'Dozentenhinweis noch ergaenzen',
      learnerTask: 'Aufgabe noch ergaenzen',
      evaluation: 'Lernzielkontrolle noch ergaenzen',
      resources: 'Material noch ergaenzen'
    }];
    const sourceRefs = [`course-plan-day-${dayNumber}`, ...(input.referenceContext || []).map((ref) => ref.sourceRef).filter(Boolean)];
    const warnings = [];
    if (!input.materials?.length) warnings.push('Kein Zusatzmaterial fuer diesen Tag erkannt. Entwurf basiert auf Unterrichtsplan und Referenzmetadaten.');

    return normalizeDayGenerationResult({
      dayNumber,
      title,
      status: 'draft',
      webvariant: {
        teacherHtmlSections: [
          section('Tagesziel', list(goals), sourceRefs),
          section('Themen', list([day.mainTopic, ...(day.subTopics || [])].filter(Boolean)), sourceRefs),
          section('UE-Bloecke', blocks.map((block) => `<p><strong>${escapeHtml(block.topic || 'Thema')}</strong><br>${escapeHtml(block.teacherTask || 'Dozentenhinweis noch ergaenzen')}<br>${escapeHtml(block.resources || 'Material noch ergaenzen')}</p>`).join(''), sourceRefs),
          section('Hinweise', list(warnings.length ? warnings : ['Fachliche Pruefung erforderlich.']), sourceRefs)
        ],
        participantHtmlSections: [
          section('Tagesziel', list(goals), sourceRefs),
          section('Themen', list([day.mainTopic, ...(day.subTopics || [])].filter(Boolean)), sourceRefs),
          section('Lernaufgaben', list(blocks.map((block) => block.learnerTask || 'Aufgabe noch ergaenzen')), sourceRefs),
          section('Materialien', list(blocks.map((block) => block.resources || 'Material noch ergaenzen')), sourceRefs)
        ]
      },
      tasks: blocks.map((block, index) => ({
        id: `task-${dayNumber}-${index + 1}`,
        title: block.topic || `Aufgabe ${index + 1}`,
        text: block.learnerTask || 'Aufgabe noch ergaenzen',
        difficulty: 'mittel',
        sourceRefs,
        aiGenerated: false
      })),
      solutions: blocks.map((block, index) => ({
        id: `solution-${dayNumber}-${index + 1}`,
        taskId: `task-${dayNumber}-${index + 1}`,
        title: `Loesungshinweis ${index + 1}`,
        text: block.evaluation || block.teacherTask || 'Loesung noch ergaenzen',
        sourceRefs,
        aiGenerated: false
      })),
      quiz: [{
        id: `quiz-${dayNumber}-1`,
        type: 'single-choice',
        topic: day.mainTopic || title,
        difficulty: 'leicht',
        text: 'Welche Aussage passt zum heutigen Thema?',
        options: ['Bitte fachlich pruefen', 'Nicht zutreffend'],
        correct: [0],
        sourceRefs,
        aiGenerated: false
      }],
      sourceRefs,
      warnings,
      aiAdditions: input.referenceContext?.length ? ['Referenzmetadaten wurden als Kontext beruecksichtigt.'] : []
    });
  }
}

function section(title, content, sourceRefs) {
  return { title, content, sourceRefs, aiGenerated: false };
}

function list(items) {
  return `<ul>${(items.length ? items : ['Noch ergaenzen']).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
  LocalHeuristicProvider
};
