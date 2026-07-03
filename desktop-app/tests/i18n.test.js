const assert = require('node:assert/strict');
const {
  getTranslations,
  normalizeLanguage,
  supportedLanguages,
  translate
} = require('../app/lib/i18n');

test('i18n exposes the supported workshop languages', () => {
  assert.deepEqual(supportedLanguages.map((language) => language.code), ['de', 'en', 'tr']);
});

test('i18n normalizes unknown languages to german', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('tr'), 'tr');
  assert.equal(normalizeLanguage('fr'), 'de');
  assert.equal(normalizeLanguage(null), 'de');
});

test('i18n translates labels and replaces placeholders with german fallback', () => {
  assert.equal(translate('en', 'saveConfig'), 'Save configuration');
  assert.equal(translate('tr', 'participantAddress', { url: 'http://localhost:3000/teilnehmer' }), 'Katilimci adresi: http://localhost:3000/teilnehmer');
  assert.equal(translate('en', 'missing.key'), 'missing.key');
  assert.equal(getTranslations('en').lockedMessage, 'Not released by the teacher yet');
  assert.equal(getTranslations('fr').lockedMessage, 'Vom Dozenten noch nicht freigeschaltet');
});
