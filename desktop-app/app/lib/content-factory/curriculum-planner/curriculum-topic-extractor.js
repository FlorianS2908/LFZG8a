const path = require('path');
const ignoredTitles = new Set(['inhalt', 'agenda', 'quellen', 'danke', 'uebung', 'übung', 'loesung', 'lösung']);

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

function extractTopicsFromOutlines(outlines = [], anchor = {}) {
  const topics = [];
  outlines.forEach((outline, outlineIndex) => {
    (outline.sections || []).forEach((section, sectionIndex) => {
      if (!isRelevantTitle(section.title)) return;
      topics.push({
        id: `topic-outline-${outlineIndex + 1}-${sectionIndex + 1}`,
        title: section.title,
        summary: section.summary || createSummary(section.title),
        sourceRefs: [section.sourceRef].filter(Boolean),
        estimatedUE: estimateUE(section, outline.format),
        difficulty: 'normal',
        depth: 'basic',
        practiceType: outline.format === 'pptx' ? 'demo' : 'guided-task',
        active: true,
        warnings: [...(section.warnings || []), ...(outline.warnings || [])].filter(Boolean)
      });
    });
  });
  const unique = mergeDuplicateTopics(topics);
  return unique.length ? unique : extractTopicsFromSource(anchor, anchor.sourceFiles);
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

function isRelevantTitle(title) {
  const normalized = normalizeTitle(title);
  return normalized.length > 2 && !ignoredTitles.has(normalized);
}

function mergeDuplicateTopics(topics) {
  const byKey = new Map();
  topics.forEach((topic) => {
    const key = normalizeTitle(topic.title).replace(/\b(grundlagen|einführung|einfuehrung)\b/g, '').trim();
    if (byKey.has(key)) {
      const existing = byKey.get(key);
      existing.estimatedUE += Number(topic.estimatedUE || 1);
      existing.sourceRefs = Array.from(new Set([...(existing.sourceRefs || []), ...(topic.sourceRefs || [])]));
      existing.warnings = Array.from(new Set([...(existing.warnings || []), ...(topic.warnings || [])]));
    } else {
      byKey.set(key, { ...topic });
    }
  });
  return Array.from(byKey.values());
}

function estimateUE(section, format) {
  if (format === 'pptx') return Math.max(1, Math.ceil((section.slideNumber ? 1 : 6) / 8));
  if (format === 'pdf' || format === 'epub') return Math.max(1, Math.ceil(Number(section.wordCount || 300) / 900));
  return Math.max(1, Math.ceil(Number(section.wordCount || 500) / 1000));
}

function normalizeTitle(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

module.exports = {
  extractTopicsFromCoursePlan,
  extractTopicsFromSource,
  extractTopicsFromOutlines,
  applyAudienceToTopics
};
