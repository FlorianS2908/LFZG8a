(function initDifficultyLevels(globalScope) {
  const levels = Object.freeze([
    Object.freeze({ value: 'easy', label: 'Einfach' }),
    Object.freeze({ value: 'medium', label: 'Mittel' }),
    Object.freeze({ value: 'hard', label: 'Schwer' })
  ]);

  function normalizeDifficulty(value, fallback = 'medium') {
    const input = String(value || '').trim().toLowerCase();
    if (['easy', 'leicht', 'einfach'].includes(input)) return 'easy';
    if (['hard', 'schwer', 'difficult'].includes(input)) return 'hard';
    if (['medium', 'mittel', 'normal', 'standard', 'normal-and-hard', 'easy-normal-hard'].includes(input)) return 'medium';
    return fallback;
  }

  function difficultyLabel(value) {
    const normalized = normalizeDifficulty(value);
    return levels.find((level) => level.value === normalized)?.label || 'Mittel';
  }

  const api = { levels, normalizeDifficulty, difficultyLabel };
  globalScope.ContentFactoryDifficultyLevels = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
