const path = require('path');
const { parseCoursePlan } = require('../course-plan-parser');
const { extractTopicsFromCoursePlan, extractTopicsFromSource, applyAudienceToTopics } = require('./curriculum-topic-extractor');

function analyzeCurriculumSource(anchor, input = {}) {
  const warnings = [...(anchor.warnings || [])];
  if (anchor.type === 'course-plan') {
    const file = anchor.sourceFiles[0] || {};
    const coursePlan = parseCoursePlan(file.path || file.sourcePath, {
      fileName: file.name || file.originalFilename,
      courseTitle: input.course?.courseName,
      selectedSheet: input.selectedSheet
    });
    return {
      outline: coursePlan.days.map((day) => ({
        sourceRef: `course-plan-day-${day.dayNumber}`,
        title: day.title,
        summary: `Tag ${day.dayNumber} aus Unterrichtsplan.`,
        originalDay: day.dayNumber
      })),
      topics: applyAudienceToTopics(extractTopicsFromCoursePlan(coursePlan), input.targetAudience),
      coursePlan,
      warnings: [...warnings, ...(coursePlan.warnings || [])]
    };
  }
  const fileNames = (anchor.sourceFiles || []).map((file) => file.name || path.basename(file.path || 'Quelle'));
  const outline = fileNames.map((name, index) => ({
    sourceRef: `${anchor.id}:${index + 1}`,
    title: name,
    summary: 'Sicherer Quellenumriss ohne Originaltext.',
    ranges: anchor.ranges || []
  }));
  return {
    outline,
    topics: applyAudienceToTopics(extractTopicsFromSource(anchor, anchor.sourceFiles), input.targetAudience),
    coursePlan: null,
    warnings
  };
}

module.exports = {
  analyzeCurriculumSource
};
