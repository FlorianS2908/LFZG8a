const path = require('path');
const { targetAreas } = require('./target-areas');
const { detectTargetArea, extractDayNumber } = require('./file-type-rules');

function createMappingSuggestion(file) {
  const selectedTarget = detectTargetArea(file.originalFilename || file.filename);
  const dayNumber = extractDayNumber(file.originalFilename || file.filename);
  const baseName = path.basename(file.originalFilename || file.filename || 'Datei', path.extname(file.originalFilename || file.filename || ''));

  return {
    selectedTarget,
    suggestedTarget: selectedTarget,
    dayNumber,
    title: baseName.replace(/[_-]+/g, ' ').trim() || file.originalFilename,
    description: '',
    visibility: selectedTarget === 'solution' || selectedTarget === 'trainerInfo'
      ? ['Admin', 'Trainer']
      : ['Admin', 'Trainer', 'Teilnehmer'],
    order: 0,
    category: '',
    difficulty: selectedTarget === 'task' ? 'normal' : '',
    relatedTaskId: '',
    materialType: '',
    notes: '',
    mappingLocked: false,
    mappingSource: 'auto'
  };
}

function applyMapping(file, mappingInput = {}) {
  const currentTarget = file.selectedTarget || file.suggestedTarget || 'other';
  const selectedTarget = mappingInput.selectedTarget || currentTarget;
  if (!targetAreas.includes(selectedTarget)) {
    throw new Error(`Ungueltiger Zielbereich: ${selectedTarget}`);
  }
  return {
    ...file,
    ...mappingInput,
    selectedTarget,
    dayNumber: mappingInput.dayNumber === '' || mappingInput.dayNumber === undefined
      ? file.dayNumber
      : Number(mappingInput.dayNumber),
    mappingSource: mappingInput.mappingLocked ? 'manual' : (mappingInput.mappingSource || 'manual'),
    mappingLocked: mappingInput.mappingLocked === undefined ? file.mappingLocked === true : mappingInput.mappingLocked === true
  };
}

function suggestMappings(files) {
  return (files || []).map((file) => {
    if (file.mappingLocked) {
      return file;
    }
    return {
      ...file,
      ...createMappingSuggestion(file)
    };
  });
}

function validateMappings(files) {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  (files || []).forEach((file) => {
    if (!targetAreas.includes(file.selectedTarget)) {
      errors.push(`${file.originalFilename || file.filename}: ungueltiger Zielbereich.`);
    }
    if (file.dayNumber !== null && file.dayNumber !== undefined && file.dayNumber !== '' && (Number(file.dayNumber) < 1 || Number(file.dayNumber) > 99)) {
      errors.push(`${file.originalFilename || file.filename}: ungueltige Tagnummer.`);
    }
    if (file.selectedTarget === 'solution' && !file.relatedTaskId) {
      warnings.push(`${file.originalFilename || file.filename}: Loesung ohne Aufgabenbezug.`);
    }
    if (file.selectedTarget === 'task') {
      const hasSolution = (files || []).some((candidate) => candidate.selectedTarget === 'solution' && candidate.dayNumber === file.dayNumber);
      if (!hasSolution) {
        suggestions.push(`${file.originalFilename || file.filename}: Aufgabe ohne erkannte Loesung.`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

module.exports = {
  createMappingSuggestion,
  suggestMappings,
  applyMapping,
  validateMappings,
  extractDayNumber
};
