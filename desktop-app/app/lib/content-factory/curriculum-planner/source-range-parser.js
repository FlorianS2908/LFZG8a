function parseRanges(value, rangeType = 'pages') {
  if (Array.isArray(value)) {
    return value.map((range) => normalizeRange(range, range.type || rangeType)).filter(Boolean);
  }
  return String(value || '')
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /(\d+)\s*-\s*(\d+)/.exec(part) || /(\d+)/.exec(part);
      if (!match) return { type: rangeType, from: null, to: null, warnings: [`Ungueltiger Bereich: ${part}`] };
      return normalizeRange({ from: Number(match[1]), to: Number(match[2] || match[1]) }, rangeType);
    });
}

function normalizeRange(range, rangeType) {
  if (!range) return null;
  const from = Number(range.from);
  const to = Number(range.to);
  const warnings = [];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    warnings.push(`Ungueltiger ${rangeType === 'slides' ? 'Folien' : 'Seiten'}bereich.`);
  }
  return { type: range.type || rangeType, from, to, warnings };
}

function validateRanges(ranges = []) {
  return ranges.flatMap((range) => range.warnings || []);
}

module.exports = {
  parseRanges,
  validateRanges
};
