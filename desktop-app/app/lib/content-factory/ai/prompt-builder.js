function buildDayPrompt(input = {}) {
  return {
    system: 'Erzeuge strukturierte Kursentwuerfe ohne Loesungen im Teilnehmerbereich.',
    input
  };
}

module.exports = {
  buildDayPrompt
};
