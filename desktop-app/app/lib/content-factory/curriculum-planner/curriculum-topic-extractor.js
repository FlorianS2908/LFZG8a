const path = require('path');

function extractTopicsFromCoursePlan(coursePlan) {
  return (coursePlan.days || []).flatMap((day) => {
    const blocks = day.ueBlocks?.length ? day.ueBlocks : [{ topic: day.mainTopic, resources: '', learnerTask: '' }];
    return blocks.map((block, index) => ({
      id: `topic-day-${day.dayNumber}-${index + 1}`,
      title: block.topic || day.mainTopic || day.title,
      summary: createSummary(block.topic || day.mainTopic || day.title),
      sourceRefs: [`course-plan-day-${day.dayNumber}`],
      estimatedUE: Number(block.ue) || 1,
      difficulty: 'normal',
      depth: 'basic',
      practiceType: block.learnerTask ? 'guided-task' : 'demo',
      active: true,
      warnings: []
    }));
  });
}

function extractTopicsFromSource(anchor, fileInputs = []) {
  const topics = [];
  (fileInputs.length ? fileInputs : anchor.sourceFiles || []).forEach((file, fileIndex) => {
    const title = file.name || file.originalFilename || path.basename(file.path || `Quelle ${fileIndex + 1}`);
    const base = path.basename(title, path.extname(title)).replace(/[_-]+/g, ' ');
    const ranges = anchor.ranges?.length ? anchor.ranges : [{ type: anchor.type === 'book-or-presentation' && /\.pptx$/i.test(title) ? 'slides' : 'pages', from: 1, to: 1 }];
    ranges.forEach((range, rangeIndex) => {
      topics.push({
        id: `topic-${fileIndex + 1}-${rangeIndex + 1}`,
        title: `${base}${anchor.ranges?.length ? ` ${range.type === 'slides' ? 'Folien' : 'Seiten'} ${range.from}-${range.to}` : ''}`,
        summary: createSummary(base),
        sourceRefs: [`${anchor.id}:${title}${anchor.ranges?.length ? `:${range.from}-${range.to}` : ''}`],
        estimatedUE: Math.max(1, Math.ceil(((range.to || 1) - (range.from || 1) + 1) / (range.type === 'slides' ? 8 : 15))),
        difficulty: 'normal',
        depth: 'basic',
        practiceType: anchor.type === 'book-or-presentation' ? 'demo' : 'guided-task',
        active: true,
        warnings: anchor.type === 'book-or-presentation' ? ['Quelle wird nur analysiert; Originalseiten werden nicht exportiert.'] : []
      });
    });
  });
  return topics.length ? topics : [{
    id: 'topic-fallback-1',
    title: anchor.title || 'Thema pruefen',
    summary: 'Eigenformulierte Zusammenfassung aus der Hauptquelle ergaenzen.',
    sourceRefs: [anchor.id],
    estimatedUE: 1,
    difficulty: 'normal',
    depth: 'intro',
    practiceType: 'demo',
    active: true,
    warnings: ['Keine eindeutigen Themen erkannt.']
  }];
}

function applyAudienceToTopics(topics, targetAudience = {}) {
  return topics.map((topic) => {
    const prior = targetAudience.priorKnowledge || 'basic';
    const easy = prior === 'none';
    const advanced = prior === 'intermediate' || prior === 'advanced';
    return {
      ...topic,
      difficulty: easy ? 'easy' : advanced ? 'hard' : topic.difficulty,
      depth: easy ? 'intro' : advanced ? 'deep' : topic.depth,
      practiceType: targetAudience.projectOrientation ? 'project' : topic.practiceType
    };
  });
}

function createSummary(title) {
  return `Eigene didaktische Kurzbeschreibung zu ${String(title || 'diesem Thema')}.`;
}

module.exports = {
  extractTopicsFromCoursePlan,
  extractTopicsFromSource,
  applyAudienceToTopics
};
