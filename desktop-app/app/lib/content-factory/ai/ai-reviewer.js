function reviewDayGeneration(result = {}) {
  const warnings = [];
  if (JSON.stringify(result.webvariant?.participantHtmlSections || []).match(/loesung|solution/i)) {
    warnings.push('Teilnehmerbereich enthaelt moeglicherweise Loesungshinweise.');
  }
  return { ok: warnings.length === 0, warnings };
}

module.exports = {
  reviewDayGeneration
};
