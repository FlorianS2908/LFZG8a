const STATUS = {
  PASSED: 'passed',
  WARNING: 'warning',
  FAILED: 'failed'
};

const MANUAL_CHECKS = [
  'Fachliche Richtigkeit der Aufgaben pruefen',
  'Fachliche Richtigkeit der Loesungen pruefen',
  'Standalone oeffnen und Rollenumschalter testen',
  'Teilnehmeransicht pruefen',
  'Dozentenloesung pruefen',
  'SQL-Skripte manuell pruefen',
  'Draw.io-Dateien oeffnen',
  'Maven/Python/Jupyter-Projekte manuell oeffnen'
];

module.exports = {
  STATUS,
  MANUAL_CHECKS
};
