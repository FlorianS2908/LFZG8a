(function initContentFactoryReviewConfig(globalScope) {
  const phaseGroups = [
    { id: 'foundations', label: 'Grundlagen', steps: ['course', 'durationAudience', 'didactics', 'containerProfile'], criteria: ['Pflichtangaben vollständig', 'Kursname und Beschreibung verständlich', 'Dauerangaben plausibel', 'Zielgruppe, Vorkenntnisse, Niveau und Schwierigkeit konsistent', 'Endprodukt passend', 'Lernziele überprüfbar formuliert'] },
    { id: 'lesson-plan', label: 'Unterrichtsplan', steps: ['anchor', 'analysis'], criteria: ['Pflichtquelle vorhanden', 'Excel-/XLSM-Struktur lesbar', 'Tagesanzahl und Unterrichtseinheiten stimmen', 'Pausen konsistent', 'Themen und Lernziele sinnvoll verteilt', 'Quelle und Planungsdaten stimmen überein'] },
    { id: 'materials', label: 'Inhalte und Materialien', steps: ['materials', 'aiMode'], criteria: ['Materialien sinnvoll zugeordnet', 'Dateiformate korrekt erkannt', 'Aufgaben und Lösungen getrennt', 'Teilnehmermaterial ohne Lösungshinweise', 'Quellen nachvollziehbar', 'Duplikate und fehlende Materialien ausgewiesen'] },
    { id: 'course-structure', label: 'Kursstruktur', steps: ['curriculumReview'], criteria: ['Didaktisch sinnvolle Reihenfolge', 'Voraussetzungen vor Anwendung behandelt', 'Tagesstruktur entspricht dem Unterrichtsplan', 'Aufgaben passen zu Lernzielen', 'Schwierigkeitsstufen korrekt berücksichtigt', 'Zeit und Pausen beachtet'] },
    { id: 'generation', label: 'Generierung', steps: ['generation'], criteria: ['Inhalte entsprechen Quellen', 'Keine erfundenen fachlichen Angaben', 'Aufgaben und Lösungen getrennt', 'Zielformate gültig', 'Dateinamen und Ordnerstruktur konsistent', 'Artefakte passen zur Schwierigkeit'] },
    { id: 'export', label: 'Prüfen und Exportieren', steps: ['preflight', 'containerDraft'], criteria: ['Pflichtartefakte vorhanden', 'Keine offenen Blocker', 'Phasenübergreifend konsistent', 'Exporte technisch gültig', 'Navigation und Fragenpools valide', 'Teilnehmer- und Dozentenpakete getrennt', 'Keine temporären Dateien im Export'] }
  ];
  const definitions = phaseGroups.map((phase) => ({
    id: `contentfactory.${phase.id}`, version: '1.0.0', name: phase.label, description: `Versioniertes Review für ${phase.label}.`, phaseId: phase.id, scope: 'phase',
    inputSelectors: phase.steps, criteria: phase.criteria.map((title, index) => ({ id: `${phase.id}.${index + 1}`, title, description: title, weight: 1, blocking: index < 2, evidenceRequired: true })),
    passRules: { minimumScore: 80, noBlockingFindings: true, requireHumanApproval: true }, promptTemplateId: 'contentfactory-phase-review-v1', outputSchemaId: 'review-result-v1'
  }));
  function definitionForStep(stepId) { const group = phaseGroups.find((phase) => phase.steps.includes(stepId)); return definitions.find((definition) => definition.phaseId === group?.id) || null; }
  const api = { phaseGroups, definitions, definitionForStep };
  globalScope.ContentFactoryReviewConfig = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
