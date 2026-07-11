const path = require('path');
const { publicReferenceMetadata } = require('./reference-metadata-service');

function searchReferences(store, input = {}) {
  const query = String(input.query || '').toLowerCase();
  const topics = (input.topics || []).map((topic) => String(topic).toLowerCase());
  const terms = [query, ...topics, input.courseName, input.dayTopic]
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);
  const maxResults = Number(input.maxResults || 5);
  const warnings = [];
  const results = [];

  store.readIndex().sources.forEach((source) => {
    const chunksPath = path.join(store.rootDir, 'sources', source.id, 'chunks.json');
    const chunks = store.readJson(chunksPath, []);
    chunks.forEach((chunk) => {
      const haystack = `${chunk.title} ${chunk.sectionTitle} ${chunk.text}`.toLowerCase();
      const hits = terms.filter((term) => haystack.includes(term)).length;
      if (!hits) return;
      results.push({
        referenceId: source.id,
        title: source.title,
        author: source.author,
        sectionTitle: chunk.sectionTitle,
        pageNumber: chunk.pageNumber,
        relevanceScore: Math.min(0.99, hits / Math.max(terms.length, 1)),
        shortSummary: paraphraseSummary(chunk.text),
        sourceRef: chunk.sourceRef,
        metadata: publicReferenceMetadata(source)
      });
    });
  });

  return {
    results: results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults),
    warnings
  };
}

function paraphraseSummary(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Keine durchsuchbare Textzusammenfassung vorhanden.';
  const words = clean.split(/\s+/).slice(0, 28);
  return `Interne Referenz weist auf relevante Inhalte zu: ${words.join(' ')}${clean.split(/\s+/).length > words.length ? ' ...' : ''}`;
}

module.exports = {
  searchReferences,
  paraphraseSummary
};
