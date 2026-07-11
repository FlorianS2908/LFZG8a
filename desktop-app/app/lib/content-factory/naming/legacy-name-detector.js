const legacyPattern = /\bLF(?:ZQ|ZG)?\d{1,2}a?\b/gi;

function detectLegacyNames(text) {
  return Array.from(new Set(String(text || '').match(legacyPattern) || []));
}

module.exports = {
  detectLegacyNames,
  legacyPattern
};
