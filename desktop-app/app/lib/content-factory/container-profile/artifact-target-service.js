function suggestionsToTargets(suggestions = []) {
  return suggestions.filter((item) => item.recommended !== false && item.active !== false).map((item) => {
    const daySlug = `tag_${String(item.dayNumber || 1).padStart(2, '0')}`;
    const roleRoot = item.role === 'teacher' || item.solutionOnly ? 'dozent' : item.role === 'shared' ? 'shared' : 'teilnehmer';
    const folder = folderFor(item);
    return {
      id: `artifact-${item.id || `${daySlug}-${item.kind}`}`,
      dayNumber: Number(item.dayNumber || 1),
      role: item.role || 'participant',
      kind: item.kind,
      format: item.format,
      targetPath: `${roleRoot}/${daySlug}/${folder}/${fileNameFor(item)}`.replace(/^shared\/tag_\d+\//, 'shared/metadata/'),
      sourceTopicIds: [item.topicId].filter(Boolean),
      visibleFor: item.role === 'teacher' || item.solutionOnly ? ['Dozenten'] : ['Teilnehmer'],
      solutionOnly: item.solutionOnly === true || item.role === 'teacher' || item.kind === 'solution',
      warnings: item.warnings || [],
      reason: item.reason || '',
      targetAudienceImpact: item.targetAudienceImpact || '',
      wasAutoSuggested: true,
      wasUserChanged: item.wasUserChanged === true
    };
  });
}

function folderFor(item) {
  if (item.kind === 'diagram' || item.format === 'drawio') return 'diagramme';
  if (item.kind === 'database' || item.format === 'sql') return 'sql';
  if (item.kind === 'notebook' || item.format === 'ipynb') return 'notebooks';
  if (item.kind === 'solution') return 'loesung';
  if (item.kind === 'readme' || item.kind === 'setup') return 'hinweise';
  return 'starter';
}

function fileNameFor(item) {
  const base = slug(item.title || item.kind || 'artefakt');
  const ext = {
    java: 'java',
    'maven-project': 'README.md',
    py: 'py',
    ipynb: 'ipynb',
    sql: 'sql',
    drawio: 'drawio',
    dia: 'dia',
    php: 'php',
    css: 'css',
    html: 'html',
    md: 'md',
    json: 'json'
  }[item.format] || item.format || 'txt';
  return ext.includes('.') ? ext : `${base}.${ext}`;
}

function slug(value) {
  return String(value || 'artefakt').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'artefakt';
}

module.exports = {
  suggestionsToTargets
};
