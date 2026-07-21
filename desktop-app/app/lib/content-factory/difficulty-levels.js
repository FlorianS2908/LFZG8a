(function initDifficultyLevels(globalScope) {
  const levels = Object.freeze([
    Object.freeze({ value: 'easy', label: 'Einfach' }),
    Object.freeze({ value: 'medium', label: 'Mittel' }),
    Object.freeze({ value: 'hard', label: 'Schwer' }),
    Object.freeze({ value: 'easy_medium', label: 'Einfach & Mittel' }),
    Object.freeze({ value: 'medium_hard', label: 'Mittel & Schwer' }),
    Object.freeze({ value: 'all', label: 'Alle 3' })
  ]);

  function normalizeDifficulty(value, fallback = 'medium') {
    const raw = Array.isArray(value) ? value.join(',') : value;
    const input = String(raw || '').trim().toLowerCase().replace(/-and-/g, '_').replace(/\s*&\s*|\s*\+\s*|\s*,\s*|[\s-]+/g, '_').replace(/[^a-zäöü_]/g, '');
    if (['easy_medium_hard', 'easy_normal_hard', 'einfach_mittel_schwer', 'leicht_mittel_schwer', 'all', 'alle'].includes(input)) return 'all';
    if (['easy_medium', 'easy_normal', 'einfach_mittel', 'leicht_mittel'].includes(input)) return 'easy_medium';
    if (['medium_hard', 'normal_hard', 'mittel_schwer'].includes(input)) return 'medium_hard';
    if (['easy', 'leicht', 'einfach'].includes(input)) return 'easy';
    if (['hard', 'schwer', 'difficult'].includes(input)) return 'hard';
    if (['medium', 'mittel', 'normal', 'standard', 'normal-and-hard', 'easy-normal-hard'].includes(input)) return 'medium';
    return fallback;
  }

  function expandDifficulty(value) {
    const normalized = normalizeDifficulty(value);
    if (normalized === 'easy_medium') return ['easy', 'medium'];
    if (normalized === 'medium_hard') return ['medium', 'hard'];
    if (normalized === 'all') return ['easy', 'medium', 'hard'];
    return [normalized];
  }

  function difficultyLabel(value) {
    const normalized = normalizeDifficulty(value);
    return levels.find((level) => level.value === normalized)?.label || 'Mittel';
  }

  const api = { levels, normalizeDifficulty, expandDifficulty, difficultyLabel };
  globalScope.ContentFactoryDifficultyLevels = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
