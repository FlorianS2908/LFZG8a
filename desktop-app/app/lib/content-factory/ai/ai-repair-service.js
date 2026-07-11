function repairDayGeneration(result = {}) {
  return {
    ...result,
    webvariant: {
      ...result.webvariant,
      participantHtmlSections: (result.webvariant?.participantHtmlSections || []).map((section) => ({
        ...section,
        content: String(section.content || '').replace(/loesung/gi, 'Hinweis').replace(/solution/gi, 'Hinweis')
      }))
    }
  };
}

module.exports = {
  repairDayGeneration
};
