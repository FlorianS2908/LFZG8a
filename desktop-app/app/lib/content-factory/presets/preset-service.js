const { presets } = require('./default-presets');

function listPresets() {
  return presets.map((preset) => ({ ...preset }));
}

function applyPreset(id, state = {}) {
  const preset = presets.find((item) => item.id === id);
  if (!preset) throw new Error(`Preset wurde nicht gefunden: ${id}`);
  return {
    ...state,
    selectedPresetId: preset.id,
    containerProfile: { ...(state.containerProfile || {}), ...preset.containerProfile },
    targetAudience: { ...(state.targetAudience || {}), ...preset.targetAudience },
    presetWarnings: [
      'Preset setzt nur Vorschlaege. Alle Werte koennen manuell angepasst werden.',
      preset.id === 'java-beginner' ? 'Maven wird fuer Einsteiger nicht automatisch vorgeschlagen.' : '',
      'EXE-Tools werden nicht ausgefuehrt oder exportiert.'
    ].filter(Boolean)
  };
}

module.exports = {
  listPresets,
  applyPreset
};
