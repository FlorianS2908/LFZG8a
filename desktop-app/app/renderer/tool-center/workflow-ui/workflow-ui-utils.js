(function initWorkflowUiUtils(globalScope) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function asList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function statusLabel(status) {
    const labels = {
      open: 'Optional',
      active: 'Aktiv',
      ready: 'Aktiv',
      done: 'Erledigt',
      warning: 'Warnung',
      error: 'Fehler',
      locked: 'Gesperrt'
    };
    return labels[status] || labels.open;
  }

  const visibleLabels = {
    none: 'Keine', basic: 'Grundkenntnisse', intermediate: 'Fortgeschrittene Kenntnisse', advanced: 'Sehr gute Kenntnisse',
    mixed: 'Gemischt', guided: 'Geführter Unterricht', 'project-based': 'Projektorientierter Unterricht',
    'exam-oriented': 'Prüfungsvorbereitung', 'self-study': 'Selbstständiges Lernen', workshop: 'Workshop',
    'web-only': 'Nur Webinhalte', 'files-only': 'Nur Dateien', 'web-and-files': 'Webinhalte und Dateien',
    local: 'Lokale Erstellung', openai: 'OpenAI', 'openai-review': 'OpenAI mit Prüfung', 'openai-review-repair': 'OpenAI mit Prüfung und Korrektur',
    intro: 'Einstieg', 'exam-prep': 'Prüfungsvorbereitung', professional: 'Berufspraxis', unknown: 'Unbekannt',
    normal: 'Normal', 'normal-and-hard': 'Normal bis anspruchsvoll', 'easy-normal-hard': 'Einfach bis anspruchsvoll',
    theory: 'Theoriekurs', 'html-css': 'HTML und CSS', 'java-maven': 'Java mit Maven', jupyter: 'Jupyter-Notebook',
    'uml-pap': 'UML und Programmablaufplan', 'database-project': 'Datenbankprojekt', 'mixed-project': 'Gemischtes Projekt',
    'teacher-demo': 'Demonstration durch Dozenten', 'live-coding': 'Live-Coding', 'error-demo': 'Fehleranalyse',
    'worked-example': 'Ausgearbeitetes Beispiel', 'before-after': 'Vorher-Nachher-Vergleich',
    'manual-by-teacher': 'Manuell durch Dozenten', 'after-quiz': 'Nach der Lernstandskontrolle',
    'after-analysis': 'Nach der Analyse', 'after-previous-task': 'Nach der vorherigen Aufgabe', 'station-wise': 'Stationsweise',
    'step-by-step': 'Schrittweise Unterstützung', coaching: 'Lernbegleitung', 'self-directed': 'Selbstständiges Arbeiten',
    'exam-focused': 'Prüfungsorientierte Unterstützung', 'high-to-low': 'Abnehmende Unterstützung'
  };

  function visibleLabel(value) {
    return visibleLabels[value] || String(value ?? '');
  }

  const api = { escapeHtml, asList, statusLabel, visibleLabel, visibleLabels };
  globalScope.CourseForgeWorkflowUtils = api; globalScope.ContentFactoryWorkflowUtils = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
