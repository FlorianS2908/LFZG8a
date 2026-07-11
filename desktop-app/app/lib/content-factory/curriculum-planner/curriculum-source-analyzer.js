const path = require('path');
const { parseCoursePlan } = require('../course-plan-parser');
const { extractSourceOutlines } = require('../source-extraction/source-extractor-service');
const { extractTopicsFromCoursePlan, extractTopicsFromSource, extractTopicsFromOutlines, applyAudienceToTopics } = require('./curriculum-topic-extractor');

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
  const outlines = extractSourceOutlines(anchor.sourceFiles || [], { ranges: anchor.ranges || [] });
  const outline = outlines.flatMap((sourceOutline) => (sourceOutline.sections || []).map((section) => ({
    sourceRef: section.sourceRef,
    sourceFile: sourceOutline.sourceFile,
    format: sourceOutline.format,
    title: section.title,
    summary: section.summary,
    pageNumber: section.pageNumber,
    slideNumber: section.slideNumber,
    chapter: section.chapter,
    wordCount: section.wordCount,
    warnings: section.warnings,
    quality: sourceOutline.quality
  })));
  const fallbackTopics = extractTopicsFromSource(anchor, anchor.sourceFiles);
  const outlineTopics = extractTopicsFromOutlines(outlines, anchor);
  return {
    outline,
    topics: applyAudienceToTopics(outlineTopics.length ? outlineTopics : fallbackTopics, input.targetAudience),
    coursePlan: null,
    warnings: [...warnings, ...outlines.flatMap((item) => item.warnings || []), ...(outlineTopics.length ? [] : ['Themen nur aus Dateinamen erzeugt.'])]
  };
}

module.exports = {
  analyzeCurriculumSource
};
