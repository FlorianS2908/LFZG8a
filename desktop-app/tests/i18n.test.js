const assert = require('node:assert/strict');
const {
  getTranslations,
  normalizeLanguage,
  supportedLanguages,
  translate
} = require('../app/lib/i18n');

test('i18n exposes the supported workshop languages', () => {
  assert.deepEqual(supportedLanguages.map((language) => language.code), ['de', 'en', 'tr', 'uk', 'ru']);
});

test('i18n normalizes unknown languages to german', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('tr'), 'tr');
  assert.equal(normalizeLanguage('uk'), 'uk');
  assert.equal(normalizeLanguage('ru'), 'ru');
  assert.equal(normalizeLanguage('fr'), 'de');
  assert.equal(normalizeLanguage(null), 'de');
});

test('i18n translates labels and replaces placeholders with german fallback', () => {
  assert.equal(translate('en', 'saveConfig'), 'Save configuration');
  assert.equal(translate('tr', 'participantAddress', { url: 'http://localhost:3000/teilnehmer' }), 'Katilimci adresi: http://localhost:3000/teilnehmer');
  assert.equal(translate('uk', 'saveConfig'), 'Зберегти конфігурацію');
  assert.equal(translate('ru', 'participantAddress', { url: 'http://localhost:3000/teilnehmer' }), 'Адрес участника: http://localhost:3000/teilnehmer');
  assert.equal(translate('en', 'missing.key'), 'missing.key');
  assert.equal(getTranslations('en').lockedMessage, 'Not released by the teacher yet');
  assert.equal(getTranslations('uk').lockedMessage, 'Викладач ще не відкрив доступ');
  assert.equal(getTranslations('ru').lockedMessage, 'Преподаватель еще не открыл доступ');
  assert.equal(getTranslations('fr').lockedMessage, 'Vom Dozenten noch nicht freigeschaltet');
});
