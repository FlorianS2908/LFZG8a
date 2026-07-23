Warning: truncated output (original token count: 54529)
Total output lines: 3258

const desktop = window.courseForgeDesktop || window.lfzq8aDesktop;
const hasDesktopFactory = Boolean(desktop?.factory);
const appNavigation = window.CourseForgeAppNavigation || window.ContentFactoryAppNavigation;
const uploadUtils = window.CourseForgeUploadUtils || window.ContentFactoryUploadUtils || {};
const workflowLayout = window.CourseForgeWorkflowLayout || window.ContentFactoryWorkflowLayout || {};
const difficultyLevels = window.ContentFactoryDifficultyLevels || { levels: [{ value: 'easy', label: 'Einfach' }, { value: 'medium', label: 'Mittel' }, { value: 'hard', label: 'Schwer' }, { value: 'easy_medium', label: 'Einfach & Mittel' }, { value: 'medium_hard', label: 'Mittel & Schwer' }, { value: 'all', label: 'Alle 3' }], normalizeDifficulty: () => 'medium', difficultyLabel: () => 'Mittel' };
const workflowRegistry = window.CourseForgeWorkflowRegistry || window.ContentFactoryWorkflowRegistry || {};
const workflowStatus = window.CourseForgeWorkflowStatus || window.ContentFactoryWorkflowStatus || {};
const workflowProgress = window.CourseForgeWorkflowProgress || window.ContentFactoryWorkflowProgress || {};
const visibleLabel = (window.CourseForgeWorkflowUtils || window.ContentFactoryWorkflowUtils)?.visibleLabel || ((value) => String(value ?? ''));
const documentAnalysisWorkflow = window.CourseForgeDocumentAnalysisWorkflow || window.ContentFactoryDocumentAnalysisWorkflow || {};
const planningReviewView = window.CourseForgePlanningReview || window.ContentFactoryPlanningReview || { evidenceStatus: () => ({ label: 'Klärung empfohlen', supplementaryText: '' }), compactSource: (reference) => reference?.fileName || reference?.documentId || 'Quelle' };
const hasDocumentAnalysisWorkflow = typeof documentAnalysisWorkflow.createDocumentAnalysisPayload === 'function'
  && typeof documentAnalysisWorkflow.pollAnalysisUntilTerminal === 'function'
  && typeof documentAnalysisWorkflow.createSingleFlightAnalysisStarter === 'function';
const startWizardDocumentAnalysis = documentAnalysisWorkflow.createSingleFlightAnalysisStarter?.(analyzeWizardDocuments) || analyzeWizardDocuments;
let workflowElapsedTimer = null;
const targetAudienceOptions = [
  ['trainees', 'Auszubildende'], ['retrainees', 'Umschülerinnen und Umschüler'], ['career_starters', 'Berufseinsteigerinnen und Berufseinsteiger'], ['experienced_professionals', 'Berufserfahrene'],
  ['career_changers', 'Quereinsteigerinnen und Quereinsteiger'], ['students', 'Studierende'], ['school_students', 'Schülerinnen und Schüler'], ['managers', 'Führungskräfte'],
  ['company_employees', 'Mitarbeitende eines Unternehmens'], ['mixed_group', 'Gemischte Lerngruppe'], ['other_audience', 'Sonstige Zielgruppe']
].map(([value, label]) => ({ value, label }));
const priorKnowledgeOptions = [
  ['none', 'Keine Vorkenntnisse'], ['little', 'Geringe Vorkenntnisse'], ['basic', 'Grundkenntnisse'], ['extended_basic', 'Erweiterte Grundkenntnisse'],
  ['advanced', 'Fortgeschrittene Kenntnisse'], ['mixed', 'Sehr unterschiedliche Vorkenntnisse'], ['unknown', 'Nicht bekannt'], ['other_knowledge', 'Sonstige Vorkenntnisse']
].map(([value, label]) => ({ value, label }));

const containerProfileLabels = {
  studentWorkspace: 'Arbeitsbereich für Teilnehmende erstellen',
  teacherSolutions: 'Lösungen für Dozenten bereitstellen',
  generateStarterFiles: 'Startdateien erstellen',
  generateSolutionFiles: 'Lösungsdateien erstellen',
  generateReadme: 'Projektbeschreibung erstellen',
  generateSetupGuide: 'Einrichtungsanleitung erstellen'
};
const didacticCourseOptions = {
  technology: [['theory', 'Allgemeiner Theoriekurs'], ['html-css', 'HTML und CSS'], ['java', 'Java'], ['java-maven', 'Java mit Maven'], ['python', 'Python'], ['jupyter', 'Python mit Jupyter'], ['sql', 'SQL und Datenbanken'], ['php-xampp', 'PHP mit XAMPP'], ['uml-pap', 'UML und Modellierung'], ['mixed-project', 'Gemischter Technologiekurs'], ['custom', 'Benutzerdefiniert']],
  courseFormat: [['theory-exercises', 'Theorie mit Übungen'], ['practice', 'Praxisorientierter Kurs'], ['project', 'Projektkurs'], ['exam-preparation', 'Prüfungsvorbereitung'], ['workshop', 'Workshop'], ['blended-learning', 'Blended Learning'], ['custom', 'Individuell']],
  didacticProfile: [['balanced', 'Ausgewogen'], ['strongly-guided', 'Stark angeleitet'], ['practice-oriented', 'Praxisorientiert'], ['project-oriented', 'Projektorientiert'], ['exam-oriented', 'Prüfungsorientiert'], ['self-directed', 'Selbstgesteuert'], ['custom', 'Individuell']],
  audience: [['training-retraining', 'Ausbildung/Umschulung'], ['professional-development', 'Berufliche Weiterbildung'], ['school', 'Schule'], ['university', 'Studium'], ['experienced', 'Berufserfahrene'], ['mixed', 'Gemischte Gruppe'], ['custom', 'Benutzerdefiniert']],
  entryLevel: [['none', 'Keine Vorkenntnisse'], ['basic', 'Grundlagen vorhanden'], ['advanced', 'Fortgeschritten'], ['mixed', 'Gemischtes Niveau']],
  learningOrganization: [['balanced-mix', 'Ausgewogener Methodenmix'], ['individual', 'Einzelarbeit'], ['pair', 'Partnerarbeit'], ['group', 'Gruppenarbeit'], ['project-teams', 'Projektteams'], ['self-study', 'Selbstlernphase']],
  differentiationProfile: [['none', 'Keine zusätzliche Differenzierung'], ['basic-regular', 'Grundlagen + reguläre Aufgaben'], ['basic-regular-transfer', 'Grundlagen + regulär + Transfer'], ['full', 'Vollständig differenziert']]
};
const successCheckOptions = [['prior-check', 'Vorwissenscheck'], ['comprehension-questions', 'Verständnisfragen'], ['practice-tasks', 'Praxisaufgaben'], ['self-check', 'Selbstkontrolle'], ['day-review', 'Tagesabschluss'], ['quiz', 'Quiz'], ['competency-check', 'Kompetenzcheck'], ['next-day-review', 'Wiederholung am Folgetag'], ['spaced-review', 'Wiederholung nach zwei bis drei Tagen'], ['project-review', 'Wiederholung in späteren Projekten'], ['final-check', 'Abschlusscheck']];

const state = {
  uiMode: 'guided',
  containers: [],
  importBatches: [],
  referenceSources: [],
  curriculumDrafts: [],
  courseProjects: [],
  presets: [],
  didacticProfiles: [],
  storageUsage: null,
  targetAreas: [],
  targetAreaLabels: {},
  selectedBatchId: '',
  rawImportFiles: [],
  aiStatus: null,
  aiTestResult: null,
  aiImportResult: null,
  goldenPromptResult: null,
  wizard: {
    course: { courseName: '', courseId: '', department: '', description: '' },
    anchorTypes: ['course-plan'],
    anchorFiles: [],
    courseProject: null,
    analysisProgress: null,
    helpCollapsed: false,
    helpMobileOpen: false,
    planningFrame: { targetGroup: '', priorKnowledge: '', totalDays: 5, unitsPerDay: 9, totalUnits: 45, unitDurationMinutes: 45, dailyStartTime: '08:30', dailyEndTime: '16:30', breaksText: '10:00-10:15\n11:45-12:15\n13:45-14:00\n15:30-15:45', repetitionUnits: 0, projectUnits: 0, assessmentUnits: 0, bufferUnits: 0, deliveryMode: 'presence' },
    structureFrame: { schemaVersion: 1, targetAudience: { value: '', label: '', customText: '' }, priorKnowledge: { value: '', label: '', customText: '' }, totalDays: 5, unitsPerDay: 9, totalUnits: 45, unitDurationMinutes: 45, confirmed: false },
    courseErrors: {},
    scopeErrors: {},
    rangesText: '',
    duration: { numberOfDays: 5, hoursPerDay: 8, uePerDay: 9, ueMinutes: 45, totalHours: 40, totalUE: 45, pauseModel: 'default' },
    targetAudience: { ageRange: 'mixed', educationContext: 'umschulung', department: 'ALLGEMEIN', priorKnowledge: 'basic', learningLevel: 'basic', languageLevel: 'normal', practiceLevel: 'medium', difficultyMode: 'medium', needsStepByStep: true, examOrientation: false, projectOrientation: true },
    containerProfile: { courseType: 'theory', artifactMode: 'web-only', didacticCourse: { schemaVersion: 2, technology: 'theory', selectedTechnologies: ['theory'], courseFormat: 'theory-exercises', didacticProfile: 'balanced', audience: 'training-retraining', entryLevel: 'basic', learningOrganization: 'balanced-mix', differentiationProfile: 'basic-regular', successChecks: ['comprehension-questions', 'practice-tasks', 'day-review'], materialOutputs: ['web', 'handout', 'tasks', 'quiz'], technicalEnvironment: ['participant-workspace'] }, studentWorkspace: true, teacherSolutions: true, generateStarterFiles: true, generateSolutionFiles: true, generateReadme: true, generateSetupGuide: true, generateRunScripts: false, allowExecutableTools: false, allowDatabaseActions: false },
    courseGoal: '',
    expectedOutcome: 'grundlagenkurs',
    didacticStyle: 'guided',
    didacticProfile: { id: 'explain-demo-practice' },
    didacticConfirmed: false,
    curriculumDraft: null,
    approvedCurriculumPlan: null,
    coursePlan: null,
    planFile: null,
    uploadFiles: [],
    importBatch: null,
    useReferences: false,
    aiMode: 'local',
    selectedDayNumber: 1,
    dayDraft: null,
    dayResults: [],
    corrections: '',
    uiError: null,
    generatedDraft: null,
    selectedPresetId: '',
    preflight: null,
    testRun: null,
    promptQuality: null,
    costEstimate: null,
    didacticRecommendation: null,
    didacticPreview: null,
    didacticManualOpen: false,
    promptRulesVisible: false,
    cleanupReport: null,
    status: '',
    activeStep: 'course',
    expertMode: false,
    skippedSteps: {}
  }
};

const uploadAreas = [
  ['materials', 'Unterrichtsmaterialien', '.pptx,.pdf,.docx,.md,.html,.ipynb,.zip', 'Folien, Handouts und begleitende Materialien.'],
  ['tasks', 'Aufgaben', '.html,.md,.pdf,.docx,.ipynb,.json,.zip', 'Arbeitsauftraege und Uebungen.'],
  ['solutions', 'Lösungen', '.html,.md,.pdf,.docx,.ipynb,.java,.cs,.sql,.zip', 'Nur für den Dozentenbereich.'],
  ['quiz', 'Fragenpools / Quiz', '.json,.xml,.docx,.txt,.zip', 'Quiz, Fragenpools und Testfragen.'],
  ['project', 'Projektmaterialien', '.zip,.html,.css,.js,.java,.cs,.php,.sql,.png,.jpg,.pdf,.docx', 'Projektvorlagen und Begleitdateien.'],
  ['source-code', 'Quellcode', '.html,.css,.js,.ts,.tsx,.jsx,.php,.java,.cs,.py,.zip', 'Quellcode wird nie automatisch ausgeführt.'],
  ['database', 'Datenbank / SQL', '.sql,.csv,.zip', 'SQL bleibt Datei und wird nicht gestartet.'],
  ['assets', 'Assets / Medien', '.png,.jpg,.jpeg,.svg,.webp,.gif,.zip', 'Bilder, Medien und Assets.'],
  ['reference-literature', 'Referenzliteratur / Fachquellen', '.pdf,.epub,.docx,.txt,.md,.html,.zip', 'Reference-only, kein Export in Kurscontainer.'],
  ['other', 'Sonstige Dateien', '', 'Alles, was manuell geprüft werden soll.'],
  ['zip-package', 'ZIP-Gesamtpaket', '.zip', 'ZIP-Gesamtpakete werden sicher gestaged.']
];

const mainSourceOptions = [
  { id: 'course-plan', label: 'Unterrichtsplan', formats: ['.xls', '.xlsx', '.xlsm', '.csv'] },
  { id: 'book-or-presentation', label: 'Buch / PDF / PowerPoint', formats: ['.pdf', '.epub', '.ppt', '.pptx'] },
  { id: 'text-document', label: 'Textdokument', formats: ['.doc', '.docx', '.txt', '.md', '.html', '.htm'] }
];

function normalizeAnchorTypes(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const valid = values.filter((type, index) => mainSourceOptions.some((option) => option.id === type) && values.indexOf(type) === index);
  return valid.length ? valid : ['course-plan'];
}

function getAnchorTypes(wizard = state.wizard) {
  return normalizeAnchorTypes(wizard.anchorTypes || wizard.anchorType);
}

function getSourceTypeForFile(file) {
  const extension = uploadUtils.extensionOf ? uploadUtils.extensionOf(file.name) : String(file.name || '').toLowerCase().match(/\.[^.]+$/)?.[0];
  return mainSourceOptions.find((option) => option.formats.includes(extension))?.id || '';
}

const planWizardSteps = [
  { id: 'course', label: 'Kursdaten' },
  { id: 'anchor', label: 'Hauptquelle' },
  { id: 'durationAudience', label: 'Dauer & Zielgruppe' },
  { id: 'courseStructure', label: 'KI-Analyse & Kursplanung' },
  { id: 'structureReview', label: 'Analyse- & Struktur-Review' },
  { id: 'didactics', label: 'Didaktik' },
  { id: 'containerProfile', label: 'Container' },
  { id: 'materials', label: 'Materialien', optional: true },
  { id: 'aiMode', label: 'KI/Fallback' },
  { id: 'generation', label: 'Tagesentwürfe' },
  { id: 'preflight', label: 'Testlauf' },
  { id: 'containerDraft', label: 'Container-Draft', optional: true }
];

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function createDropZoneHtml({ id, title, description, accept, files = [], multiple = true, kind = 'upload' }) {
  if (uploadUtils.createDropZoneHtml) {
    return uploadUtils.createDropZoneHtml({ id, title, description, accept, files, multiple, kind });
  }
  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const warnings = files.flatMap((file) => file.warnings || []);
  const blocked = files.filter((file) => file.blocked).length;
  const inputAttr = kind === 'anchor' ? 'data-wizard-anchor-files' : `data-wizard-upload="${escapeHtml(id)}"`;
  return `
    <section class="dropzone-card ${files.length ? 'dropzone-has-files' : ''}" data-dropzone-card="${escapeHtml(id)}">
      <div class="factory-card-header">
        <strong>${escapeHtml(title)}</strong>
        <span class="status-badge">${escapeHtml(files.length)} Datei(en)</span>
      </div>
      <p>${escapeHtml(description || 'Dateien auswählen oder hier ablegen.')}</p>
      <label class="dropzone" data-dropzone="${escapeHtml(id)}" tabindex="0" aria-label="${escapeHtml(title)} Uploadzone">
        <span>Dateien hier ablegen oder durchsuchen</span>
        <small>${escapeHtml(accept || 'alle Dateitypen')} | ${multiple ? 'Mehrfachupload' : 'Einzeldatei'} | ${formatBytes(totalSize)}</small>
        <input ${inputAttr} type="file" ${multiple ? 'multiple' : ''} ${accept ? `accept="${escapeHtml(accept)}"` : ''}>
      </label>
      ${blocked ? `<p class="status-line status-error">${escapeHtml(blocked)} Datei(en) blockiert.</p>` : ''}
      ${(warnings || []).slice(0, 3).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
      ${uploadUtils.renderFileList ? uploadUtils.renderFileList(files, escapeHtml) : renderFileList(files)}
    </section>
  `;
}

function renderFileList(files = []) {
  if (!files.length) return '<p class="dropzone-empty">Noch keine Dateien ausgewählt.</p>';
  return `<ul class="dropzone-file-list">${files.map((file, index) => `
    <li class="dropzone-file-chip">
      <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <small>${formatBytes(file.size)}${file.duplicate ? ' | Duplikat' : ''}</small>
      <button class="secondary-button" type="button" data-dropzone-remove="${escapeHtml(file.uploadArea || 'anchor')}:${index}" aria-label="Datei entfernen">entfernen</button>
    </li>
  `).join('')}</ul>`;
}

function getUploadAreaConfig(area, source = 'picker') {
  if (area === 'anchor') {
    const selected = getAnchorTypes();
    const accept = mainSourceOptions.filter((option) => selected.includes(option.id)).flatMap((option) => option.formats).join(',');
    return { id: 'anchor', accept, source, strictMime: true };
  }
  const found = uploadAreas.find(([id]) => id === area);
  return { id: area, accept: found?.[2] || '', source };
}

function setFactoryStatus(message, cssClass = '') {
  const target = $('[data-factory-status]');
  if (!target) return;
  target.textContent = message || '';
  target.className = `status-line ${cssClass}`.trim();
  target.hidden = !String(message || '').trim();
}

function getFactoryTabGates() {
  const hasContainers = state.containers.length > 0;
  const hasBatches = state.importBatches.length > 0;
  const expertReady = state.uiMode === 'expert' || Boolean(
    state.wizard.course.courseName
    || state.wizard.anchorFiles.length
    || state.wizard.expertMode
  );
  return {
    home: { active: true },
    'plan-wizard': { active: true },
    overview: { active: hasContainers, message: 'Bitte zuerst einen Container erzeugen oder vorhandene Container laden.' },
    duplicate: { active: hasContainers, message: 'Duplizieren ist aktiv, sobald mindestens ein Container vorhanden ist.' },
    import: { active: expertReady, message: 'Bitte zuerst den Plan-Wizard abschließen oder den Expertenmodus aktivieren.' },
    references: { active: true, optional: true },
    batches: { active: state.uiMode === 'expert' || hasBatches, message: 'Import-Batches sind aktiv, sobald ein Batch vorhanden ist oder der Expertenmodus aktiv ist.' }
  };
}

function renderFactoryNavigationGates(activePanel = '') {
  const gates = getFactoryTabGates();
  $all('[data-factory-tab]').forEach((button) => {
    const gate = gates[button.dataset.factoryTab] || { active: true };
    button.classList.toggle('is-locked', !gate.active);
    button.toggleAttribute('aria-disabled', !gate.active);
    if (gate.optional) button.dataset.optional = 'true';
    if (!gate.active && gate.message) button.title = gate.message;
    button.classList.toggle('is-active', button.dataset.factoryTab === activePanel);
    if (button.dataset.factoryTab === activePanel) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $all('[data-open-factory-section]').forEach((button) => {
    const gate = gates[button.dataset.openFactorySection] || { active: true };
    button.disabled = !gate.active;
    button.classList.toggle('is-locked', !gate.active);
    button.title = !gate.active && gate.message ? gate.message : '';
  });
  const expertToggle = $('[data-expert-mode]');
  if (expertToggle) expertToggle.checked = state.uiMode === 'expert' || Boolean(state.wizard.expertMode);
  const modeToggle = $('[data-ui-mode-toggle]');
  if (modeToggle) modeToggle.checked = state.uiMode === 'expert';
}

function showPanel(panelName) {
  const gates = getFactoryTabGates();
  const gate = gates[panelName] || { active: true };
  const current = $('[data-factory-panel].is-active')?.dataset.factoryPanel || 'home';
  if (!gate.active) {
    const message = gate.message || 'Bitte zuerst den Plan-Wizard abschließen.';
    state.wizard.status = message;
    setFactoryStatus(message, 'status-warning');
    renderFactoryNavigationGates(current);
    if (current === 'plan-wizard') renderPlanWizard();
    return;
  }
  appNavigation.activatePanel(panelName);
  if (panelName === 'plan-wizard') renderPlanWizard();
  setFactoryStatus(hasDesktopFactory ? '' : browserPreviewMessage(), hasDesktopFactory ? '' : 'status-warning');
  renderFactoryNavigationGates(panelName);
  if (!hasDesktopFactory) disableDesktopOnlyControls();
}

const navigationBindings = new WeakSet();

function bindFactoryNavigation() {
  [...$all('[data-factory-tab]'), ...$all('[data-open-factory-section]')].forEach((button) => {
    if (navigationBindings.has(button)) return;
    navigationBindings.add(button);
    button.addEventListener('click', () => showPanel(button.dataset.factoryTab || button.dataset.openFactorySection));
  });
}

function browserPreviewMessage() {
  return 'Browser-Vorschau: Navigation und Formulare können geprüft werden. Speichern, Dateiverarbeitung und KI-Analyse stehen nur in der Electron-App zur Verfügung.';
}

function disableDesktopOnlyControls() {
  const selectors = [
    '[data-open-course-project]', '[data-wizard-anchor-files]', '[data-document-analyze]',
    '[data-retry-document]', '[data-save-course-scope]', '[data-wizard-plan]',
    '[data-wizard-upload]', '[data-wizard-import]', '[data-wizard-generate]',
    '[data-wizard-generate-all]', '[data-wizard-create-draft]', '[data-ai-status-check]',
    '[data-ai-model-save]', '[data-ai-import-select]', '[data-ai-replace-key]',
    '[data-ai-test-request]', '[data-ai-clear-key]', '[data-wizard-preflight]',
    '[data-wizard-test-run]', '[data-wizard-test-run-confirm]'
  ];
  $all(selectors.join(',')).forEach((control) => {
    control.disabled = true;
    control.setAttribute('aria-disabled', 'true');
    control.title = browserPreviewMessage();
  });
}

function getNextRecommendedAction(currentState = state) {
  const wizard = currentState.wizard;
  if (!wizard.course.courseName || !wizard.course.courseId || !wizard.course.department) {
    return {
      label: 'Kursdaten ausfüllen',
      description: 'Lege Kursname, Kurs-ID und Fachbereich fest, damit der Container eindeutig angelegt werden kann.',
      targetPanel: 'plan-wizard',
      targetStep: 'course',
      buttonLabel: 'Weiter zu Kursdaten'
    };
  }
  if (!wizard.anchorFiles.length) {
    return {
      label: 'Hauptquelle hochladen',
      description: 'Lade deinen Excel-Unterrichtsplan hoch, damit Themen und Unterrichtseinheiten erkannt werden können.',
      targetPanel: 'plan-wizard',
      targetStep: 'anchor',
      buttonLabel: 'Weiter zur Hauptquelle'
    };
  }
  if (!wizard.curriculumDraft) {
    return {
      label: 'Curriculum analysieren',
      description: 'Starte die Analyse, damit aus der Hauptquelle eine Tagesstruktur entsteht.',
      targetPanel: 'plan-wizard',
      targetStep: 'analysis',
      buttonLabel: 'Zur Analyse'
    };
  }
  if (wizard.approvedCurriculumPlan?.status !== 'approved') {
    return {
      label: 'Kursstruktur prüfen',
      description: 'Prüfe Tagesstruktur, Themen und UE-Verteilung und gib den Plan frei.',
      targetPanel: 'plan-wizard',
      targetStep: 'curriculumReview',
      buttonLabel: 'Kursstruktur prüfen'
    };
  }
  if (!wizard.dayResults.length && !wizard.dayDraft) {
    return {
      label: 'Tagesentwürfe erzeugen',
      description: 'Erzeuge Webvarianten, Aufgaben, Lösungen, Fragenpools und Dozentenleitfäden.',
      targetPanel: 'plan-wizard',
      targetStep: 'generation',
      buttonLabel: 'Tagesentwürfe erzeugen'
    };
  }
  if (!wizard.preflight && !wizard.testRun) {
    return {
      label: 'Kurs abschließend prüfen',
      description: 'Prüfe Sicherheit, Qualität, Didaktik und Lösungsschutz vor dem Kursentwurf.',
      targetPanel: 'plan-wizard',
      targetStep: 'preflight',
      buttonLabel: 'Abschlussprüfung starten'
    };
  }
  return {
    label: 'Kursentwurf prüfen oder veröffentlichen',
    description: 'Der Entwurf ist bereit für Kontrolle, Testprotokoll und spätere Freigabe.',
    targetPanel: 'overview',
    targetStep: '',
    buttonLabel: 'Container verwalten'
  };
}

function renderNextRecommendedAction() {
  const target = $('[data-next-action]');
  if (!target) return;
  const wizard = state.wizard;
  const hasProgress = Boolean(
    state.containers.length
    || state.importBatches.length
    || wizard.course.courseName
    || wizard.course.courseId
    || wizard.anchorFiles.length
    || wizard.curriculumDraft
    || wizard.dayDraft
    || wizard.dayResults.length
  );
  target.hidden = !hasProgress;
  if (!hasProgress) {
    target.replaceChildren();
    return;
  }
  const action = getNextRecommendedAction();
  target.innerHTML = `
    <strong>Empfohlene nächste Aktion: ${escapeHtml(action.label)}</strong>
    <p>${escapeHtml(action.description)}</p>
    <button class="primary-button" type="button" data-next-action-button>${escapeHtml(action.buttonLabel)}</button>
  `;
  $('[data-next-action-button]')?.addEventListener('click', () => {
    if (action.targetStep) state.wizard.activeStep = action.targetStep;
    showPanel(action.targetPanel);
  });
}

function renderValidation(target, validation) {
  if (!validation) {
    target.innerHTML = '';
    return;
  }
  target.innerHTML = `
    <strong>${validation.isValid ? 'Validierung bestanden' : 'Validierung mit Fehlern'}</strong>
    ${(validation.errors || []).map((item) => `<p class="status-line status-error">${escapeHtml(item)}</p>`).join('')}
    ${(validation.warnings || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}
    ${(validation.suggestions || []).map((item) => `<p class="status-line">${escapeHtml(item)}</p>`).join('')}
  `;
}

function renderContainers() {
  $('[data-container-list]').innerHTML = state.containers.length ? state.containers.map((container) => {
    const manifest = container.manifest;
    const counts = ['routes', 'materials', 'assets', 'tasks', 'solutions', 'quizzes']
      .map((key) => `${key}: ${(container[key] || []).length}`)
      .join(' | ');
    const generated = container.generated ? '' : 'Original / System';
    return `
      <article class="factory-card">
        <div class="factory-card-header">
          <strong>${escapeHtml(manifest.name)}</strong>
          <span class="status-badge status-${escapeHtml(manifest.status)}">${escapeHtml(manifest.status)}</span>
        </div>
        <p>${escapeHtml(manifest.description)}</p>
        <dl class="factory-meta">
          <div><dt>ID</dt><dd>${escapeHtml(manifest.id)}</dd></div>
          <div><dt>Kategorie</dt><dd>${escapeHtml(manifest.category)}</dd></div>
          <div><dt>Version</dt><dd>${escapeHtml(manifest.version)}</dd></div>
          <div><dt>Typ</dt><dd>${escapeHtml(manifest.containerType)}</dd></div>
          <div><dt>Landingpage</dt><dd>${manifest.visibleInLauncher ? 'ja' : 'nein'}</dd></div>
          <div><dt>Quelle</dt><dd>${escapeHtml(manifest.sourceContainerId || generated || '-')}</dd></div>
        </dl>
        <small>${escapeHtml((manifest.tags || []).join(', '))}</small>
        <small>${escapeHtml(counts)}</small>
        <div class="button-row">
          ${container.generated && manifest.status === 'draft' ? `<button class="primary-button" type="button" data-publish="${escapeHtml(manifest.id)}">Veröffentlichen</button>` : ''}
          ${container.generated ? `<button class="secondary-button" type="button" data-disable="${escapeHtml(manifest.id)}">Deaktivieren</button><button class="secondary-button" type="button" data-archive="${escapeHtml(manifest.id)}">Archivieren</button>` : ''}
        </div>
      </article>
    `;
  }).join('') : '<article class="empty-state"><strong>Noch keine Kurscontainer vorhanden.</strong><span>Erstelle deinen ersten Kurscontainer im geführten Ablauf.</span><button class="primary-button" type="button" data-empty-create>Neuen Kurs erstellen</button></article>';

  const recent = $('[data-recent-containers]');
  const recentSection = $('[data-recent-section]');
  if (recentSection) recentSection.hidden = !state.containers.length;
  if (recent) recent.innerHTML = state.containers.length
    ? state.containers.slice(0, 3).map((container) => `<article class="factory-card"><strong>${escapeHtml(container.manifest.name)}</strong><p>Status: ${escapeHtml(container.manifest.status)}</p><button class="secondary-button" type="button" data-open-factory-section="overview">Container öffnen</button></article>`).join('')
    : '';

  $('[data-duplicate-source]').innerHTML = state.containers.map((container) => (
    `<option value="${escapeHtml(container.manifest.id)}">${escapeHtml(container.manifest.name)} (${escapeHtml(container.manifest.id)})</option>`
  )).join('');

  $all('[data-publish]').forEach((button) => button.addEventListener('click', () => publishContainer(button.dataset.publish)));
  $all('[data-disable]').forEach((button) => button.addEventListener('click', () => updateContainerStatus(button.dataset.disable, 'disable')));
  $all('[data-archive]').forEach((button) => button.addEventListener('click', () => updateContainerStatus(button.dataset.archive, 'archive')));
  $('[data-empty-create]')?.addEventListener('click', () => showPanel('plan-wizard'));
  recent?.querySelectorAll('[data-open-factory-section]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.openFactorySection)));
}

function renderSettings() {
  const aiTarget = $('[data-settings-ai-status]');
  const storageTarget = $('[data-settings-storage]');
  const configured = Boolean(state.aiStatus?.providers?.openai?.configured);
  if (aiTarget) aiTarget.textContent = configured
    ? 'OpenAI ist eingerichtet. Externe Verarbeitung wird nur nach deiner Auswahl verwendet.'
    : 'Nicht eingerichtet. Die lokale Verarbeitung bleibt vollständig verfügbar.';
  if (storageTarget) storageTarget.textContent = state.storageUsage
    ? `Lokaler Speicher: ${formatBytes(state.storageUsage.totalBytes || 0)} belegt.`
    : 'Der lokale Speicher ist verfügbar.';
}

function renderBatches() {
  $('[data-batch-list]').innerHTML = state.importBatches.length
    ? state.importBatches.map((batch) => `
      <article class="factory-card">
        <div class="factory-card-header">
          <strong>${escapeHtml(batch.name)}</strong>
          <span class="status-badge status-${escapeHtml(batch.status)}">${escapeHtml(batch.status)}</span>
        </div>
        <p>${escapeHtml(batch.files.length)} Datei(en), erstellt ${escapeHtml(new Date(batch.createdAt).toLocaleString('de-DE'))}</p>
        <small>Speicher: ${formatBytes(batch.staging?.inputBytes || 0)} | ZIPs: ${batch.staging?.zipCount || 0}</small>
        ${(batch.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
        <button class="secondary-button" type="button" data-open-batch="${escapeHtml(batch.id)}">Zuordnung bearbeiten</button>
      </article>
    `).join('')
    : '<article class="empty-state"><strong>Noch keine Imports</strong><span>Importiere Rohdaten, um hier Batches zu sehen.</span></article>';

  $all('[data-open-batch]').forEach((button) => button.addEventListener('click', () => openBatch(button.dataset.openBatch)));
}

function renderReferences() {
  const list = $('[data-reference-list]');
  if (!list) return;
  list.innerHTML = state.referenceSources.length
    ? state.referenceSources.map((source) => `
      <article class="factory-card">
        <div class="factory-card-header">
          <strong>${escapeHtml(source.title)}</strong>
          <span class="status-badge">${escapeHtml(source.format)}</span>
        </div>
        <p>${escapeHtml(source.author || 'Autor unbekannt')}</p>
        <dl class="factory-meta">
          <div><dt>Nutzung</dt><dd>${escapeHtml(source.usageMode)}</dd></div>
          <div><dt>Export</dt><dd>${source.allowedForExport ? 'ja' : 'nein'}</dd></div>
          <div><dt>Teilnehmer</dt><dd>${source.allowedForParticipant ? 'ja' : 'nein'}</dd></div>
          <div><dt>Cloud</dt><dd>${source.allowedForCloud ? 'ja' : 'nein'}</dd></div>
          <div><dt>Suchbar</dt><dd>${source.searchable ? 'ja' : 'nein'}</dd></div>
        </dl>
        ${(source.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
        <button class="secondary-button" type="button" data-remove-reference="${escapeHtml(source.id)}">Entfernen</button>
      </article>
    `).join('')
    : '<article class="empty-state"><strong>Noch keine Referenzen</strong><span>Importiere eigene lizenzierte Quellen lokal.</span></article>';
  $all('[data-remove-reference]').forEach((button) => button.addEventListener('click', () => removeReference(button.dataset.removeReference)));
}

function renderWorkflowPanelIntros() {
  const configs = {
    home: {
      workflow: {
        id: 'content-factory-start',
        title: 'CourseForge Start',
        subtitle: 'Waehle den passenden Weg: geführter Assistent, Verwaltung, Referenzen oder Expertenbereich.',
        audience: 'Admin / Dozent',
        difficulty: state.uiMode === 'expert' ? 'expert' : 'geführt',
        primaryGoal: 'Den nächsten sinnvollen Workflow starten.',
        result: 'Du landest im passenden Arbeitsbereich.'
      },
      help: { id: 'start', goal: 'Starte mit dem Assistenten für neue Kurscontainer.', why: 'Rohdaten / Expertenimport ist nicht der Standardweg.', requiredInputs: [], optionalInputs: ['Expertenmodus'], typicalMistakes: ['Rohdaten als ersten Schritt nutzen'], result: 'Nächster Klick ist klar.' }
    },
    overview: { workflow: workflowRegistry.getWorkflow?.('manage-containers'), helpId: 'overview' },
    duplicate: { workflow: workflowRegistry.getWorkflow?.('duplicate-container'), helpId: 'duplicate' },
    references: { workflow: workflowRegistry.getWorkflow?.('reference-library'), helpId: 'references' },
    import: { workflow: workflowRegistry.getWorkflow?.('expert-import'), helpId: 'import' },
    batches: { workflow: workflowRegistry.getWorkflow?.('expert-import'), helpId: 'batches' }
  };
  Object.entries(configs).forEach(([panel, config]) => {
    const target = $(`[data-workflow-intro="${panel}"]`);
    const workflow = config.workflow;
    if (!target || !workflow || !workflowLayout.renderWorkflowHeader) return;
    const step = config.help || (workflow.steps || []).find((item) => item.id === config.helpId) || workflow.steps?.[0] || {};
    target.innerHTML = `
      ${workflowLayout.renderWorkflowHeader(workflow, panel === 'import' || panel === 'batches' ? (state.uiMode === 'expert' ? 'active' : 'warning') : 'open')}
      ${workflowLayout.renderWorkflowStepShell ? workflowLayout.renderWorkflowStepShell({
        workflow,
        step,
        contentHtml: workflowLayout.renderWorkflowResultCard ? workflowLayout.renderWorkflowResultCard({
          title: 'Was mache ich hier?',
          result: step.goal || workflow.primaryGoal,
          warnings: panel === 'import' ? ['Rohdaten / Expertenimport ist ein Expertenbereich und nicht der Standardweg für neue Kurscontainer.'] : [],
          nextAction: getNextRecommendedAction().label
        }) : '',
        helpHtml: workflowLayout.renderWorkflowHelp ? workflowLayout.renderWorkflowHelp(step) : '',
        actionsHtml: ''
      }) : ''}
    `;
  });
  renderNextRecommendedAction();
}

function renderPlanWizard() {
  const root = $('[data-plan-wizard]');
  if (!root) return;
  const wizard = state.wizard;
  const workflow = workflowRegistry.getWorkflow?.('create-course-container') || createFallbackPlanWorkflow();
  const gates = getPlanWizardStepGates();
  const activeGate = gates.find((gate) => gate.id === wizard.activeStep && gate.active) || gates.find((gate) => gate.active) || gates[0];
  wizard.activeStep = activeGate.id;
  const currentIndex = gates.findIndex((gate) => gate.id === wizard.activeStep);
  const previousGate = [...gates].slice(0, currentIndex).reverse().find((gate) => gate.active);
  const nextGate = gates[currentIndex + 1];
  const canContinue = activeGate.id === 'durationAudience' ? Boolean(state.wizard.anchorFiles.length) : Boolean(nextGate?.active);
  const activeStep = workflow.steps.find((step) => step.id === wizard.activeStep) || workflow.steps[0];
  const headerStatus = workflowStatus.getWorkflowStatus?.(gates) || 'active';
  const contentHtml = renderCurrentPlanWizardStep(wizard, activeGate);
  const analysisRunning = Boolean(wizard.analysisProgress?.status && !documentAnalysisWorkflow.isTerminalAnalysisStatus?.(wizard.analysisProgress.status));
  const progressVisible = Boolean(wizard.analysisProgress?.status && wizard.analysisProgress.status !== 'idle');
  root.innerHTML = `
    ${workflowLayout.renderWorkflowHeader ? workflowLayout.renderWorkflowHeader(workflow, headerStatus) : ''}
    ${workflowLayout.renderWorkflowStepper ? workflowLayout.renderWorkflowStepper(workflow, wizard.activeStep, gates) : ''}
    ${wizard.status ? `<div class="workflow-transient-status"><p class="status-line" role="status" aria-live="polite">${escapeHtml(wizard.status)}</p></div>` : ''}
    ${wizard.uiError ? `<div class="modal-backdrop" role="presentation"><section class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="wizard-error-title"><h3 id="wizard-error-title">${escapeHtml(wizard.uiError.title)}</h3><p>${escapeHtml(wizard.uiError.message)}</p><div class="button-row">${wizard.uiError.retry ? '<button type="button" class="primary-button" data-retry-wizard-error>Erneut versuchen</button>' : ''}<button type="button" class="secondary-button" data-close-wizard-error>Schließen</button></div></section></div>` : ''}
    ${progressVisible ? `<div class="analysis-lock-overlay" role="status" aria-live="polite">${workflowProgress.render ? workflowProgress.render(wizard.analysisProgress) : ''}</div>` : ''}
    ${workflowLayout.renderWorkflowStepShell
      ? workflowLayout.renderWorkflowStepShell({
        workflow,
        step: activeStep,
        contentHtml,
        statusHtml: renderPlanWizardStepStatus(activeGate),
        actionsHtml: activeGate.id === 'courseStructure' ? '' : workflowLayout.renderWorkflowActionBar({
          canBack: Boolean(previousGate),
          canNext: canContinue,
          canSkip: Boolean(activeGate.optional),
          canCheck: activeGate.id === 'analysis' || activeGate.id === 'preflight',
          nextLabel: nextGate ? `Weiter: ${nextGate.label}` : 'Weiter'
        })
      })
      : contentHtml}
  `;
  root.classList.toggle('help-collapsed', wizard.helpCollapsed);
  root.classList.toggle('help-mobile-open', wizard.helpMobileOpen);
  root.querySelector('[data-workflow-help-toggle]')?.setAttribute('aria-expanded', String(window.innerWidth < 1280 ? wizard.helpMobileOpen : !wizard.helpCollapsed));
  bindPlanWizardEvents();
  setAnalysisUiBusy(analysisRunning);
  updateWorkflowElapsedClock(wizard.analysisProgress, progressVisible);
  renderFactoryNavigationGates($('[data-factory-panel].is-active')?.dataset.factoryPanel || 'plan-wizard');
}

function updateWorkflowElapsedClock(progress, visible) {
  if (workflowElapsedTimer) clearInterval(workflowElapsedTimer);
  workflowElapsedTimer = null;
  if (!visible || !progress?.startedAt || documentAnalysisWorkflow.isTerminalAnalysisStatus?.(progress.status)) return;
  const tick = () => {
    const output = $('[data-plan-wizard] .workflow-elapsed');
    if (output) output.textContent = `Verstrichene Zeit: ${workflowProgress.formatElapsed({ ...progress, elapsedMs: Date.now() - Date.parse(progress.startedAt) })}`;
  };
  tick();
  workflowElapsedTimer = setInterval(tick, 1000);
}

function setAnalysisUiBusy(busy) {
  const root = $('[data-plan-wizard]');
  root?.setAttribute('aria-busy', String(busy));
  const controls = [...$all('[data-plan-wizard] button, [data-plan-wizard] input, [data-plan-wizard] select, [data-plan-wizard] textarea, [data-factory-tab], [data-open-factory-section]')];
  controls.forEach((control) => {
    if (control.matches('[data-document-analysis-cancel]')) return;
    if (busy) { control.dataset.analysisLocked = control.disabled ? 'already-disabled' : 'locked'; control.disabled = true; control.setAttribute('aria-disabled', 'true'); }
    else if (control.dataset.analysisLocked === 'locked') { control.disabled = false; control.removeAttribute('aria-disabled'); delete control.dataset.analysisLocked; }
  });
}

function createFallbackPlanWorkflow() {
  return {
    id: 'create-course-container',
    title: 'Neuen Kurscontainer erstellen',
    subtitle: 'Geführter Assistent für Kurscontainer.',
    audience: 'Admin / Dozent',
    difficulty: 'geführt',
    primaryGoal: 'Vom Plan zum Container-Draft.',
    result: 'Geprüfter Kurscontainer-Entwurf.',
    steps: planWizardSteps.map((step) => ({
      ...step,
      shortLabel: step.label,
      goal: step.label,
      why: 'Dieser Schritt fuehrt den Workflow weiter.',
      requiredInputs: [],
      optionalInputs: [],
      typicalMistakes: [],
      result: 'Nächster Schritt ist vorbereitet.'
    }))
  };
}

function renderPlanWizardStepStatus(gate) {
  const label = gate.done ? `✓ ${gate.label} vollständig` : gate.active ? `${gate.label} · Aktion erforderlich` : `${gate.label} · Noch nicht verfügbar`;
  return `<p class="workflow-step-summary ${gate.done ? 'is-complete' : ''}" role="status">${escapeHtml(label)}</p>`;
}

function renderCurrentPlanWizardStep(wizard, gate) {
  switch (gate.id) {
    case 'course':
      return renderCourseStep(wizard);
    case 'anchor':
      return renderAnchorStep(wizard);
    case 'durationAudience':
      return renderDurationAudienceStep(wizard);
    case 'didactics':
      return renderDidacticProfileStep(wizard);
    case 'courseStructure':
      return renderCourseStructureStep(wizard);
    case 'structureReview':
      return renderStructureReviewStep(wizard);
    case 'containerProfile':
      return renderContainerProfileStep(wizard);
    case 'analysis':
      return renderAnalysisStep(wizard);
    case 'curriculumReview':
      return wizard.curriculumDraft ? renderCurriculumReview(wizard.curriculumDraft) : '<article class="tool-card"><h3>Curriculum prüfen</h3><p class="status-line status-warning">Noch kein Curriculum vorhanden.</p></article>';
    case 'materials':
      return renderMaterialsStep(wizard);
    case 'aiMode':
      return renderAiModeStep(wizard);
    case 'generation':
      return renderGenerationStep(wizard);
    case 'preflight':
      return renderPreflightTestRun(wizard);
    case 'containerDraft':
      return renderContainerDraftStep(wizard);
    default:
      return renderCourseStep(wizard);
  }
}

function renderCourseStep(wizard) {
  const errors = wizard.courseErrors || {};
  const invalid = (name) => errors[name] ? `class="field-invalid" aria-invalid="true" aria-describedby="course-${name}-error"` : '';
  const error = (name) => errors[name] ? `<small id="course-${name}-error" class="field-error" role="alert">${escapeHtml(errors[name])}</small>` : '';
  return `
    <article class="tool-card" data-plan-step-content="course">
      <h3>Kursdaten</h3>
      <p id="course-required-help">Pflichtfelder sind mit „erforderlich“ gekennzeichnet. Diese Angaben erscheinen später in der Kursübersicht.</p>
      <fieldset>
      <legend>Allgemeine Kursangaben</legend>
      ${state.courseProjects.length ? `<label>Gespeichertes Kursprojekt öffnen<select data-open-course-project><option value="">Neues Projekt</option>${state.courseProjects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title || project.id)}${project.approved ? ' (freigegeben)' : ''}</option>`).join('')}</select></label>` : ''}
      <div class="factory-form-grid course-data-grid">
        <label>Kurstititel <span class="field-requirement">erforderlich</span><input data-wizard-course="courseName" value="${escapeHtml(wizard.course.courseName)}" ${invalid('courseName')} required>${error('courseName')}</label>
        <label>Kurs-ID <span class="field-requirement">erforderlich</span><input data-wizard-course="courseId" value="${escapeHtml(wizard.course.courseId)}" ${invalid('courseId')} required><small id="course-id-help">Eine eindeutige Kurzbezeichnung, zum Beispiel „lf08-netzwerke“.</small>${error('courseId')}</label>
        <label>Fachbereich <span class="field-requirement">erforderlich</span><select data-wizard-course="department" ${invalid('department')} required>${['', 'FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'].map((value) => `<option value="${value}" ${wizard.course.department === value ? 'selected' : ''}>${value || 'Bitte wählen'}</option>`).join('')}</select>${error('department')}</label>
      </div>
      <label>Beschreibung <span class="field-requirement">optional</span><textarea data-wizard-course="description">${escapeHtml(wizard.course.description)}</textarea></label>
      <label>Übergeordnetes Kursziel <span class="field-requirement">optional</span><textarea data-wizard-goal>${escapeHtml(wizard.courseGoal)}</textarea></label>
      </fieldset>
    </article>
  `;
}

function renderAnchorStep(wizard) {
  const selectedTypes = getAnchorTypes(wizard);
  const anchorAccept = mainSourceOptions.filter((option) => selectedTypes.includes(option.id)).flatMap((option) => option.formats).join(',');
  return `
    <article class="tool-card" data-plan-step-content="anchor">
      <h3>Hauptquelle</h3>
      <p class="status-line">Die Hauptquelle bestimmt die Themenstruktur. Daraus wird das Curriculum erzeugt.</p>
      <p class="status-line status-warning">Excel-Dateien werden nur gelesen. Makros werden niemals ausgeführt oder verändert.</p>
      <fieldset>
      <legend>Art der Hauptquelle</legend>
      <div class="wizard-source-options">
        ${mainSourceOptions.map(({ id, label, formats }) => `
          <label class="source-option choice-card ${selectedTypes.includes(id) ? 'is-active' : ''}" data-selected="${selectedTypes.includes(id) ? 'true' : 'false'}">
            <input type="checkbox" name="wizard-anchor-types" data-wizard-anchor-type value="${id}" ${selectedTypes.includes(id) ? 'checked' : ''}>
            <span class="choice-card-copy"><strong>${escapeHtml(label)}</strong><span class="file-format-list">${escapeHtml(formats.join(', '))}</span></span>
          </label>
        `).join('')}
      </div>
      </fieldset>
      ${createDropZoneHtml({ id: 'anchor', title: 'Thematische Hauptquelle', description: 'Dateien der ausgewählten Hauptquellenarten hier ablegen.', accept: anchorAccept, files: wizard.anchorFiles.map((file) => ({ ...file, uploadArea: 'anchor' })), multiple: true, kind: 'anchor' })}
      <p class="upload-summary"><span class="status-badge">${wizard.anchorFiles.length}</span> Hauptquell-Datei(en) ausgewählt.</p>
      ${selectedTypes.includes('book-or-presentation') ? `<label>Seiten-/Folienbereiche optional<textarea data-wizard-ranges placeholder="20-45; 80-120">${escapeHtml(wizard.rangesText)}</textarea></label>` : ''}
    </article>
  `;
}

function renderDurationAudienceStep(wizard) {
  normalizeDurationAndAudience(wizard);
  const scope = wizard.structureFrame;
  const errors = wizard.scopeErrors || {};
  const invalid = (name) => errors[name] ? 'class="field-invalid" aria-invalid="true"' : '';
  return `
    <article class="tool-card" data-plan-step-content="durationAudience">
      <h3>Dauer & Zielgruppe</h3>
      <div class="duration-audience-layout">
        <section class="form-section" aria-labelledby="duration-heading"><h4 id="duration-heading">Dauer</h4><div class="factory-form-grid compact-form-grid">
        <label>Kurstage<input data-structure-frame="totalDays" type="number" min="1" step="1" value="${escapeHtml(scope.totalDays)}" ${invalid('totalDays')} aria-describedby="scope-days-error" required>${errors.totalDays ? `<small id="scope-days-error" class="field-error">${escapeHtml(errors.totalDays)}</small>` : ''}</label>
        <label>UE je Tag<input data-structure-frame="unitsPerDay" type="number" min="1" step="1" value="${escapeHtml(scope.unitsPerDay)}" ${invalid('unitsPerDay')} aria-describedby="scope-units-error" required>${errors.unitsPerDay ? `<small id="scope-units-error" class="field-error">${escapeHtml(errors.unitsPerDay)}</small>` : ''}</label>
        <label>Dauer einer UE (Minuten)<input data-structure-frame="unitDurationMinutes" type="number" min="1" step="1" value="${escapeHtml(scope.unitDurationMinutes)}" ${invalid('unitDurationMinutes')} aria-describedby="scope-duration-error" required>${errors.unitDurationMinutes ? `<small id="scope-duration-error" class="field-error">${escapeHtml(errors.unitDurationMinutes)}</small>` : ''}</label>
        <label>Gesamtzahl UE<input data-course-scope-total value="${escapeHtml(Number(scope.totalDays || 0) * Number(scope.unitsPerDay || 0))}" readonly aria-label="Automatisch berechnete Gesamtzahl der Unterrichtseinheiten"></label>
        </div></section>
        <section class="form-section" aria-labelledby="audience-heading"><h4 id="audience-heading">Zielgruppe</h4><div class="factory-form-grid compact-form-grid">
        <label class="form-field-wide">Zielgruppe<select data-course-scope-selection="targetAudience" ${invalid('targetAudience')} aria-describedby="scope-audience-error" required><option value="">Bitte Zielgruppe auswählen</option>${targetAudienceOptions.map((option) => `<option value="${option.value}" ${scope.targetAudience?.value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>${errors.targetAudience ? `<small id="scope-audience-error" class="field-error">${escapeHtml(errors.targetAudience)}</small>` : ''}</label>
        ${scope.targetAudience?.value === 'other_audience' ? `<label class="form-field-wide">Zielgruppe beschreiben<input data-course-scope-custom="targetAudience" value="${escapeHtml(scope.targetAudience.customText)}" aria-describedby="scope-audience-custom-error" required>${errors.targetAudienceCustom ? `<small id="scope-audience-custom-error" class="field-error">${escapeHtml(errors.targetAudienceCustom)}</small>` : ''}</label>` : ''}
        <label class="form-field-wide">Vorkenntnisse<select data-course-scope-selection="priorKnowledge" ${invalid('priorKnowledge')} aria-describedby="scope-knowledge-error" required><option value="">Bitte Vorkenntnisse auswählen</option>${priorKnowledgeOptions.map((option) => `<option value="${option.value}" ${scope.priorKnowledge?.value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>${errors.priorKnowledge ? `<small id="scope-knowledge-error" class="field-error">${escapeHtml(errors.priorKnowledge)}</small>` : ''}</label>
        ${scope.priorKnowledge?.value === 'other_knowledge' ? `<label class="form-field-wide">Vorkenntnisse beschreiben<input data-course-scope-custom="priorKnowledge" value="${escapeHtml(scope.priorKnowledge.customText)}" aria-describedby="scope-knowledge-custom-error" required>${errors.priorKnowledgeCustom ? `<small id="scope-knowledge-custom-error" class="field-error">${escapeHtml(errors.priorKnowledgeCustom)}</small>` : ''}</label>` : ''}
        </div></section>
      </div>
      <button class="primary-button" type="button" data-save-course-scope>Dauer und Zielgruppe übernehmen</button>
    </article>
  `;
}

function renderCourseStructureStep(wizard) {
  const project = wizard.courseProject;
  const ready = Boolean(project?.structureFrame?.valid && project?.structureFrame?.confirmed && wizard.anchorFiles.length && state.aiStatus?.providers?.openai?.configured);
  const running = Boolean(wizard.analysisProgress?.status && !documentAnalysisWorkflow.isTerminalAnalysisStatus?.(wizard.analysisProgress.status));
  const documents = project?.uploadedDocuments?.length ? project.uploadedDocuments : wizard.anchorFiles;
  const analyses = project?.documentAnalyses || [];
  const analysisComplete = ['completed', 'completed_with_warnings'].includes(project?.pipelinePhases?.document_analysis?.status);
  const planningStatus = project?.planningOperation?.status || '';
  const planningRunning = ['planning', 'validating', 'preparing', 'running'].includes(planningStatus);
  const topicReviewConfirmed = project?.topicReview?.status === 'confirmed';
  const currentPlan = getCurrentValidCoursePlanDraft(project);
  const hasStalePlan = Boolean(project?.coursePlanDrafts?.some((draft) => draft.status === 'stale'));
  return `<article class="tool-card" data-plan-step-content="courseStructure">
    <h3>KI-Analyse und Kursplanung</h3>
    <p class="status-line">Die hochgeladenen Dokumente werden gemeinsam ausgewertet. Anschließend erstellt die KI einen Vorschlag für die Verteilung der Themen auf die vorhandenen Kurstage und Unterrichtseinheiten.</p>
    <div class="mapping-list">${documents.map((document, index) => renderDocumentAnalysisCard(document, analyses, index)).join('')}</div>
    ${analysisComplete ? `<p class="status-line status-success">Dokumentanalyse abgeschlossen. ${escapeHtml(project.topicCatalog?.topics?.length || 0)} konsolidierte Themen stehen für die Planung bereit.</p>` : ''}
    ${planningStatus === 'timed_out' ? '<p class="status-line status-warning">Die Planung hat ihr Phasenzeitlimit erreicht. Die Dokumentanalyse bleibt vollständig erhalten.</p>' : ''}
    ${analysisComplete ? renderAiUnderstanding(project) : ''}
    ${analysisComplete ? `<p class="status-line ${topicReviewConfirmed ? 'status-success' : 'status-warning'}">${topicReviewConfirmed ? 'Themenbasis bestätigt. Der Unterrichtsplan kann jetzt erstellt werden.' : 'Prüfe und bestätige zuerst die erkannten Themen und Analyseergebnisse.'}</p>` : ''}
    ${hasStalePlan ? '<p class="status-line status-warning">Die bestätigte Themenbasis wurde verändert. Der vorhandene Unterrichtsplan basiert auf einer älteren Version und muss neu erstellt werden.</p>' : ''}
    ${!ready ? '<p class="status-line status-warning">Die Analyse kann noch nicht gestartet werden. Erforderlich sind Kursbezeichnung, mindestens ein Dokument, Zielgruppe, Vorkenntnisse, Tage, UE-Angaben und eine konfigurierte OpenAI-Verbindung.</p>' : ''}
    ${renderCourseStructureActionBar({ ready, running, planningRunning, planningStatus, analysisComplete, topicReviewConfirmed, currentPlan })}
  </article>`;
}

function getCurrentValidCoursePlanDraft(project) {
  const draft = project?.coursePlanDrafts?.find((item) => Number(item.planningVersion) === Number(project.currentPlanningVersion));
  if (!draft || draft.status === 'stale' || draft.validation?.status === 'failed' || !(draft.days || []).length) return null;
  return draft;
}

function renderCourseStructureActionBar({ ready, running, planningRunning, planningStatus, analysisComplete, topicReviewConfirmed, currentPlan }) {
  let primary = `<button class="primary-button" type="button" data-document-analyze ${ready && !running ? '' : 'disabled'}>${running ? 'Dokumentanalyse läuft …' : 'Dokumente analysieren'}</button>`;
  if (analysisComplete && !topicReviewConfirmed) primary = '<button class="primary-button" type="button" data-topic-confirm>Themenbasis bestätigen</button>';
  if (analysisComplete && topicReviewConfirmed && !currentPlan) primary = `<button class="primary-button" type="button" data-course-plan-start ${planningRunning ? 'disabled' : ''}>${planningRunning ? 'Unterrichtsplan wird erstellt …' : ['failed', 'timed_out'].includes(planningStatus) ? 'Unterrichtsplan erneut erstellen' : 'Unterrichtsplan erstellen'}</button>`;
  if (currentPlan) primary = '<button class="primary-button" type="button" data-open-structure-review>Weiter zum Struktur-Review</button>';
  const secondary = [
    analysisComplete ? '<button class="secondary-button" type="button" data-document-analyze>Analyse erneut ausführen</button>' : '',
    analysisComplete && !topicReviewConfirmed ? '<button class="secondary-button" type="button" data-topic-add>Thema hinzufügen</button><button class="secondary-button" type="button" data-topic-save>Änderungen speichern</button>' : '',
    topicReviewConfirmed ? '<button class="secondary-button" type="button" data-topic-reopen>Bearbeitung wieder öffnen</button>' : '',
    currentPlan ? '<button class="secondary-button" type="button" data-course-plan-start>Unterrichtsplan neu erstellen</button>' : '',
    running || planningRunning ? '<button class="secondary-button" type="button" data-document-analysis-cancel>Vorgang abbrechen</button>' : ''
  ].join('');
  return `<div class="workflow-actionbar course-structure-actions" data-central-actionbar><button class="secondary-button" type="button" data-wizard-prev>Zurück</button><div class="secondary-actions">${secondary}</div>${primary}</div>`;
}

function renderAiUnderstanding(project) {
  const frame = project.structureFrame || {};
  const conflicts = (project.documentAnalyses || []).flatMap((item) => item.conflicts || []);
  const missing = (project.documentAnalyses || []).flatMap((item) => item.missingInformation || []);
  const review = project.topicReview || { status: 'pending', topics: project.topicCatalog?.topics || [] };
  const confirmed = review.status === 'confirmed';
  return `<details class="validation-box" data-ai-understanding open><summary>Erkannte Themen und Analyseergebnisse prüfen</summary>
    <p>Die KI hat aus den analysierten Dokumenten folgende Themenbasis ermittelt. Prüfe und bearbeite diese Angaben, bevor daraus der Unterrichtsplan erstellt wird.</p>
    <label>Zusammenarbeit mit der KI<select data-interaction-mode aria-label="Interaktionsmodus"><option value="automatic" ${project.interactionMode === 'automatic' ? 'selected' : ''}>Automatisch</option><option value="guided" ${!project.interactionMode || project.interactionMode === 'guided' ? 'selected' : ''}>Begleitet (empfohlen)</option><option value="strict" ${project.interactionMode === 'strict' ? 'selected' : ''}>Streng kontrolliert</option></select></label>
    <div class="summary-grid"><span>Kurstage: ${escapeHtml(frame.totalDays || 0)}</span><span>UE gesamt: ${escapeHtml(frame.totalUnits || 0)}</span><span>UE pro Tag: ${escapeHtml(frame.unitsPerDay || 0)}</span><span>UE-Dauer: ${escapeHtml(frame.unitDurationMinutes || 0)} Minuten</span><span>Dokumente: ${escapeHtml(project.uploadedDocuments?.length || 0)}</span><span>Leitquellen: ${escapeHtml((project.uploadedDocuments || []).filter((item) => item.bindingLevel === 'binding').length)}</span></div>
    <p class="compact-review-status ${confirmed ? 'status-confirmed' : ''}" role="status">${confirmed ? '✓ Themenbasis bestätigt' : 'Themenbasis zur Prüfung'} · Version ${escapeHtml(review.version || 1)}</p>
    <div class="topic-review-table review-table-scroll" role="region" aria-label="Erkannte Themen"><table><thead><tr><th scope="col">Nr.</th><th scope="col">Titel</th><th scope="col">Unterthemen/Inhalte</th><th scope="col">Lernziele</th><th scope="col">Kompetenzen</th><th scope="col">Niveau</th><th scope="col">Quellen</th><th scope="col">Prüfstatus</th><th scope="col">Aktionen</th></tr></thead><tbody>${(review.topics || []).map((topic, index) => renderTopicReviewItem(topic, index, review.topics.length, confirmed, conflicts)).join('')}</tbody></table></div>
    ${renderReviewHints(conflicts, missing)}
    <small>Begleitet fragt nur bei fachlich relevanten Alternativen nach. Unwesentliche Annahmen blockieren die Planung nicht.</small></details>`;
}

function renderTopicReviewItem(topic, index, count, readonly, conflicts = []) {
  const field = (name) => `data-topic-index="${index}" data-topic-field="${name}" ${readonly ? 'disabled' : ''}`;
  const related = conflicts.filter((item) => item.topicId === topic.id || item.affectedTopicIds?.includes(topic.id));
  const conflict = related.length > 0;
  return `<tr class="topic-review-item ${conflict ? 'topic-has-conflict' : ''}"><td data-label="Nr.">${index + 1}</td><td data-label="Titel"><input aria-label="Titel Thema ${index + 1}" ${field('title')} value="${escapeHtml(topic.title || '')}"></td><td data-label="Unterthemen/Inhalte"><textarea rows="4" ${field('subtopics')}>${escapeHtml((topic.subtopics || []).join('\n'))}</textarea></td><td data-label="Lernziele"><textarea rows="4" ${field('learningObjectives')}>${escapeHtml((topic.learningObjectives || []).map(formatAnalysisItem).join('\n'))}</textarea></td><td data-label="Kompetenzen"><textarea rows="4" ${field('competencies')}>${escapeHtml((topic.competencies || []).map(formatAnalysisItem).join('\n'))}</textarea></td><td data-label="Niveau"><select ${field('difficulty')}>${['introductory','basic','intermediate','advanced'].map((value) => `<option value="${value}" ${topic.difficulty === value ? 'selected' : ''}>${({ introductory: 'Einstieg', basic: 'Grundlagen', intermediate: 'Mittel', advanced: 'Fortgeschritten' })[value]}</option>`).join('')}</select></td><td data-label="Quellen"><div class="source-pill-list">${(topic.sourceReferences || []).map((source) => `<span class="source-pill">${escapeHtml(planningReviewView.compactSource(source))}</span>`).join('') || '–'}</div></td><td data-label="Prüfstatus"><span class="review-state ${conflict ? 'is-conflict' : readonly ? 'is-reviewed' : 'is-open'}">${conflict ? 'Widerspruch' : readonly ? 'Geprüft' : 'Offen'}</span>${related.map((item) => `<sm…24529 tokens truncated…Gespeichertes Kursprojekt geladen.';
    const activeOperation = [project.planningOperation, project.analysisOperation].find((operation) => operation?.operationId && !documentAnalysisWorkflow.isTerminalAnalysisStatus?.(operation.status));
    if (activeOperation) {
      state.wizard.analysisProgress = activeOperation;
      state.wizard.status = `Aktiver Vorgang ${activeOperation.operationId} wird wieder aufgenommen.`;
      void resumeWizardOperation(activeOperation);
    }
  } catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

async function resumeWizardOperation(operation) {
  try {
    const progress = await documentAnalysisWorkflow.pollAnalysisUntilTerminal({ operationId: operation.operationId, getProgress: desktop.factory.getOperationStatus, onProgress: (value) => { state.wizard.analysisProgress = value; renderPlanWizard(); } });
    state.wizard.analysisProgress = progress;
    state.wizard.courseProject = await desktop.factory.getCourseProject(state.wizard.course.courseId);
    if (operation.kind === 'planning' && ['completed', 'completed_with_warnings'].includes(progress.status)) {
      const result = await desktop.factory.getPlanningResult(operation.operationId); const current = currentStructuredDraft();
      if (!result.plan || !current || current.status === 'stale') throw new Error('Die Planung wurde abgeschlossen, aber der erzeugte Unterrichtsplan konnte nicht in das Kursprojekt übernommen werden.');
      state.wizard.activeStep = 'structureReview'; state.wizard.selectedPlanDay = 1; state.wizard.selectedPlanUnit = 1;
    }
  } catch (error) { state.wizard.status = `${error.message} Vorgangs-ID: ${operation.operationId}`; }
  renderPlanWizard();
}

async function analyzeWizardDocuments(retryDocumentId = '') {
  if (state.wizard.analysisProgress?.status && !documentAnalysisWorkflow.isTerminalAnalysisStatus?.(state.wizard.analysisProgress.status)) return;
  if (!hasDocumentAnalysisWorkflow) {
    showWizardError('Dokumentanalyse ist nicht verfügbar', 'Das erforderliche Analysemodul konnte nicht initialisiert werden. Bitte starten Sie die Anwendung neu.');
    renderPlanWizard();
    return;
  }
  const normalizedRetryDocumentId = documentAnalysisWorkflow.normalizeRetryDocumentId?.(retryDocumentId) || '';
  const documents = (state.wizard.anchorFiles || []).filter((document) => !document.excluded);
  if (!state.wizard.courseProject?.id) { showWizardError('Dokumentanalyse konnte nicht gestartet werden', 'Bitte speichern Sie zuerst Dauer und Zielgruppe.'); renderPlanWizard(); return; }
  if (!documents.length) { showWizardError('Dokumentanalyse konnte nicht gestartet werden', 'Es wurden keine analysierbaren Dokumente gefunden.'); renderPlanWizard(); return; }
  if (normalizedRetryDocumentId && !documents.some((document) => document.id === normalizedRetryDocumentId)) { showWizardError('Dokumentanalyse konnte nicht gestartet werden', `Das Dokument „${normalizedRetryDocumentId}“ wurde nicht gefunden oder ist ausgeschlossen.`); renderPlanWizard(); return; }
  if (!state.aiStatus?.providers?.openai?.configured) { showWizardError('Die KI-Analyse konnte nicht gestartet werden', 'Bitte prüfen Sie den OpenAI-Schlüssel, das ausgewählte Modell und den Verbindungstest in den KI-Einstellungen.'); renderPlanWizard(); return; }
  const selectedCount = normalizedRetryDocumentId ? 1 : documents.length;
  state.wizard.analysisProgress = { kind: 'analysis', status: 'queued', phase: 'source_validation', phaseLabel: 'Quellen prüfen', message: 'Dokumente werden vorbereitet', currentDocument: '', totalItems: selectedCount, total: selectedCount, queued: selectedCount, completed: 0, overallProgress: 0, warningCount: 0, failed: 0, errors: [] };
  state.wizard.status = 'Dokumentanalyse wurde gestartet.';
  renderPlanWizard();
  try {
    const project = wizardProjectInput();
    const payload = documentAnalysisWorkflow.createDocumentAnalysisPayload({ project: { ...project, structureFrame: state.wizard.courseProject.structureFrame }, documents: project.uploadedDocuments, retryDocumentId: normalizedRetryDocumentId });
    const started = await desktop.factory.startDocumentAnalysis(payload);
    if (!started?.operationId) throw new Error('Die Dokumentanalyse wurde ohne Vorgangs-ID gestartet und deshalb sicher abgebrochen.');
    state.wizard.analysisProgress = started.progress;
    await pollAnalysisOperation(started.operationId);
  } catch (error) {
    state.wizard.analysisProgress = { ...state.wizard.analysisProgress, status: 'failed', step: state.wizard.analysisProgress?.step || 'Analyse fehlgeschlagen', errors: [...(state.wizard.analysisProgress?.errors || []), error.message] };
    showWizardError('Dokumentanalyse fehlgeschlagen', error);
  } finally {
    if (!documentAnalysisWorkflow.isTerminalAnalysisStatus?.(state.wizard.analysisProgress?.status)) state.wizard.analysisProgress.status = 'failed';
    renderPlanWizard();
  }
}

async function pollAnalysisOperation(operationId) {
  const progress = await documentAnalysisWorkflow.pollAnalysisUntilTerminal({
    operationId,
    getProgress: desktop.factory.getAnalysisProgress,
    onProgress: (progress) => {
    state.wizard.analysisProgress = progress;
    if (progress.project) state.wizard.courseProject = progress.project;
    renderPlanWizard();
    }
  });
  state.wizard.courseProject = await desktop.factory.getCourseProject(state.wizard.course.courseId);
  const failed = state.wizard.courseProject.uploadedDocuments.filter((document) => document.analysisStatus === 'failed').length;
  const completed = progress.status === 'completed' || progress.status === 'completed_with_warnings';
  state.wizard.status = completed ? `Analyse und UE-Planung abgeschlossen.${failed ? ` ${failed} Dokument(e) sind fehlgeschlagen und können erneut analysiert werden.` : ''}` : progress.status === 'cancelled' ? 'Analyse wurde abgebrochen.' : formatProgressError(progress);
  if (completed) state.wizard.status = state.wizard.status.replace('Analyse und UE-Planung', 'Dokumentanalyse');
}

async function startWizardCoursePlanning() {
  if (!state.wizard.courseProject?.id || !['completed', 'completed_with_warnings'].includes(state.wizard.courseProject?.pipelinePhases?.document_analysis?.status) || state.wizard.planningBusy) return;
  state.wizard.planningBusy = true; state.wizard.status = 'Unterrichtsplanung wurde gestartet.'; renderPlanWizard();
  let operationId = '';
  try {
    const started = await desktop.factory.startCoursePlanning({ projectId: state.wizard.courseProject.id });
    operationId = started.operationId;
    state.wizard.analysisProgress = started.progress;
    const progress = await documentAnalysisWorkflow.pollAnalysisUntilTerminal({ operationId: started.operationId, getProgress: desktop.factory.getOperationStatus, onProgress: (value) => { state.wizard.analysisProgress = value; renderPlanWizard(); } });
    const result = await desktop.factory.getPlanningResult(started.operationId);
    state.wizard.courseProject = await desktop.factory.getCourseProject(state.wizard.courseProject.id);
    if (['completed', 'completed_with_warnings'].includes(progress.status) && result.plan) { state.wizard.courseProject = await desktop.factory.getCourseProject(state.wizard.course.courseId); const current = currentStructuredDraft(); if (!current || current.status === 'stale') throw new Error('Die Planung wurde abgeschlossen, aber der erzeugte Unterrichtsplan konnte nicht in das Kursprojekt übernommen werden.'); state.wizard.activeStep = 'structureReview'; state.wizard.selectedPlanDay = 1; state.wizard.selectedPlanUnit = 1; state.wizard.status = 'Unterrichtsplan erstellt und persistent gespeichert.'; }
    else state.wizard.status = formatProgressError(progress);
  } catch (error) { if (operationId) { try { const status = await desktop.factory.getOperationStatus(operationId); state.wizard.analysisProgress = status; if (!documentAnalysisWorkflow.isTerminalAnalysisStatus?.(status.status)) { state.wizard.status = 'Der Vorgangsstatus wird erneut geprüft. Die Verarbeitung kann weiterhin aktiv sein.'; void resumeWizardOperation(status); return; } } catch {} } showWizardError('Unterrichtsplanung fehlgeschlagen', error, startWizardCoursePlanning); state.wizard.status = `${error.message}${operationId ? ` Vorgangs-ID: ${operationId}` : ''}`; }
  finally { state.wizard.planningBusy = false; renderPlanWizard(); }
}

function updateTopicReviewField(field) { const topic = state.wizard.courseProject?.topicReview?.topics?.[Number(field.dataset.topicIndex)]; if (!topic) return; topic[field.dataset.topicField] = ['subtopics','learningObjectives','competencies'].includes(field.dataset.topicField) ? field.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) : field.value; topic.reviewStatus = 'edited'; state.wizard.courseProject.topicReview.status = 'edited'; }
function moveTopicReview(index, direction) { const topics = state.wizard.courseProject.topicReview.topics; const target = direction === 'up' ? index - 1 : index + 1; if (target < 0 || target >= topics.length) return; [topics[index], topics[target]] = [topics[target], topics[index]]; state.wizard.courseProject.topicReview.status = 'edited'; renderPlanWizard(); }
async function saveTopicReview(render = true) { try { state.wizard.courseProject = await desktop.factory.updateTopicReview(state.wizard.course.courseId, { topics: state.wizard.courseProject.topicReview.topics }); state.wizard.status = 'Themenbasis gespeichert.'; } catch (error) { state.wizard.status = error.message; } if (render) renderPlanWizard(); }
async function confirmTopicReview() {
  const scroller = $('.factory-layout');
  const scrollTop = scroller?.scrollTop || 0;
  try {
    if (state.wizard.courseProject.topicReview.status === 'edited') await saveTopicReview(false);
    state.wizard.courseProject = await desktop.factory.confirmTopicReview(state.wizard.course.courseId);
    state.wizard.status = `✓ Themenbasis bestätigt · Version ${state.wizard.courseProject.topicReview?.version || 1}`;
  } catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
  requestAnimationFrame(() => { if (scroller) scroller.scrollTop = scrollTop; $('[data-ai-understanding] summary')?.focus(); });
}

function retryCurrentOperation() {
  const kind = state.wizard.analysisProgress?.kind;
  state.wizard.analysisProgress = null;
  if (kind === 'planning') return startWizardCoursePlanning();
  if (kind === 'analysis') return startWizardDocumentAnalysis();
  showWizardError('Vorgang konnte nicht erneut gestartet werden', 'Der fehlgeschlagene Vorgang konnte nicht eindeutig bestimmt werden.');
  renderPlanWizard();
}

function formatProgressError(progress) {
  const error = (progress.errors || [])[0];
  return typeof error === 'string' ? error : error?.message || 'Analyse und Planung konnten nicht abgeschlossen werden.';
}

function showWizardError(title, error, retry = null) {
  const raw = typeof error === 'string' ? error : error?.message || 'Ein unbekannter Fehler ist aufgetreten.';
  const message = raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/i, '').replace(/^Error:\s*/i, '');
  state.wizard.uiError = { title, message, retry };
}

function selectionText(selection) { return selection?.customText || selection?.label || ''; }

function validateWizardCourseScope(scope) {
  const errors = {};
  if (!Number.isInteger(Number(scope.totalDays)) || Number(scope.totalDays) < 1) errors.totalDays = 'Bitte geben Sie die Kursdauer in ganzen Tagen an.';
  if (!Number.isInteger(Number(scope.unitsPerDay)) || Number(scope.unitsPerDay) < 1) errors.unitsPerDay = 'Bitte geben Sie die Anzahl der Unterrichtseinheiten je Tag an.';
  if (!Number.isInteger(Number(scope.unitDurationMinutes)) || Number(scope.unitDurationMinutes) < 1) errors.unitDurationMinutes = 'Bitte geben Sie eine gültige Dauer der Unterrichtseinheit an.';
  if (!targetAudienceOptions.some((option) => option.value === scope.targetAudience?.value)) errors.targetAudience = 'Bitte wählen Sie eine Zielgruppe aus.';
  else if (scope.targetAudience.value === 'other_audience' && !scope.targetAudience.customText?.trim()) errors.targetAudienceCustom = 'Bitte beschreiben Sie die sonstige Zielgruppe.';
  if (!priorKnowledgeOptions.some((option) => option.value === scope.priorKnowledge?.value)) errors.priorKnowledge = 'Bitte wählen Sie die vorhandenen Vorkenntnisse aus.';
  else if (scope.priorKnowledge.value === 'other_knowledge' && !scope.priorKnowledge.customText?.trim()) errors.priorKnowledgeCustom = 'Bitte beschreiben Sie die sonstigen Vorkenntnisse.';
  return errors;
}

async function cancelWizardDocumentAnalysis() {
  if (!window.confirm('Den laufenden Vorgang wirklich abbrechen? Bereits unvollständige Ergebnisse werden nicht als abgeschlossen gespeichert.')) return;
  const operationId = state.wizard.analysisProgress?.operationId;
  if (operationId) await desktop.factory.cancelAiOperation(operationId);
  state.wizard.analysisProgress = { ...state.wizard.analysisProgress, status: 'cancelled', step: 'Abgebrochen' };
  renderPlanWizard();
}

async function acknowledgeWizardDocumentFailure(documentId) {
  if (!window.confirm('Dieses verbindliche Dokument ist fehlgeschlagen. Ausnahme bewusst bestätigen und Planung mit den übrigen Quellen fortsetzen?')) return;
  try {
    state.wizard.courseProject = await desktop.factory.acknowledgeDocumentFailure(state.wizard.course.courseId, documentId);
    state.wizard.status = 'Dokumentfehler wurde als bewusste Ausnahme bestätigt.';
  } catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

async function saveWizardCourseScope() {
  try {
    const wizard = state.wizard;
    syncWizardCourseScopeFromDom();
    const errors = validateWizardCourseScope(wizard.structureFrame);
    wizard.scopeErrors = errors;
    if (Object.keys(errors).length) { renderPlanWizard(); return false; }
    const frame = {
      ...wizard.planningFrame,
      ...wizard.structureFrame,
      schemaVersion: 1,
      totalDays: Number(wizard.structureFrame.totalDays),
      unitsPerDay: Number(wizard.structureFrame.unitsPerDay),
      totalUnits: Number(wizard.structureFrame.totalDays) * Number(wizard.structureFrame.unitsPerDay),
      unitDurationMinutes: Number(wizard.structureFrame.unitDurationMinutes),
      targetAudience: { ...wizard.structureFrame.targetAudience },
      priorKnowledge: { ...wizard.structureFrame.priorKnowledge },
      audienceProfile: { ...wizard.targetAudience },
      courseGoal: wizard.courseGoal,
      expectedOutcome: wizard.expectedOutcome
    };
    wizard.courseProject = await desktop.factory.upsertCourseProject(wizardProjectInput());
    wizard.courseProject = await desktop.factory.saveCourseScope(wizard.course.courseId, frame);
    wizard.structureFrame = { ...wizard.structureFrame, ...wizard.courseProject.structureFrame };
    wizard.scopeErrors = {};
    wizard.status = 'Dauer und Zielgruppe wurden gespeichert.';
    renderPlanWizard();
    return true;
  } catch (error) {
    showWizardError('Dauer und Zielgruppe konnten nicht gespeichert werden', error, saveWizardCourseScope);
    renderPlanWizard();
    return false;
  }
}

function syncWizardCourseScopeFromDom() {
  $all('[data-structure-frame]').forEach((field) => {
    state.wizard.structureFrame[field.dataset.structureFrame] = field.type === 'number' ? Number(field.value) : field.value;
  });
  $all('[data-course-scope-custom]').forEach((field) => {
    const key = field.dataset.courseScopeCustom;
    state.wizard.structureFrame[key] = { ...(state.wizard.structureFrame[key] || {}), customText: field.value };
  });
  state.wizard.structureFrame.totalUnits = Number(state.wizard.structureFrame.totalDays || 0) * Number(state.wizard.structureFrame.unitsPerDay || 0);
}

const continueFromDurationAudienceToAiAnalysis = documentAnalysisWorkflow.createDurationAudienceContinuation?.({
  saveScope: async () => {
    state.wizard.status = 'Kursrahmen wird geprüft und gespeichert …';
    renderPlanWizard();
    return saveWizardCourseScope();
  },
  onSaved: async () => {
    state.wizard.activeStep = 'courseStructure';
    state.wizard.status = 'Kursrahmen gespeichert. KI-Analyse und Kursplanung werden gestartet …';
    renderPlanWizard();
  },
  startAnalysis: startWizardDocumentAnalysis,
  onError: async (error) => {
    showWizardError('KI-Analyse und Kursplanung konnten nicht gestartet werden', error, continueFromDurationAudienceToAiAnalysis);
    renderPlanWizard();
  },
  setBusy: (busy) => {
    const next = $('[data-wizard-next]');
    if (next) {
      next.disabled = busy;
      next.setAttribute('aria-busy', String(busy));
    }
  }
}) || (async () => {
  showWizardError('KI-Analyse und Kursplanung sind nicht verfügbar', 'Das erforderliche Analysemodul konnte nicht initialisiert werden.');
  renderPlanWizard();
  return false;
});

if (new URLSearchParams(window.location.search).get('coursePlanningSmoke') === '1') {
  window.CourseForgeCoursePlanningSmoke = window.ContentFactoryCoursePlanningSmoke = {
    async configure(sourcePath, sourceFileName = 'smoke-source.md', sourceMimeType = 'text/markdown') {
      state.aiStatus = { providers: { openai: { configured: true, status: 'configured', model: 'testdouble-v1' } } };
      state.wizard.course = { courseName: 'Electron Smoke Kurs', courseId: `electron-smoke-${Date.now()}`, department: 'FISI', description: 'Realitätsnaher Electron-Test' };
      state.wizard.courseGoal = 'Netzwerkgrundlagen sicher planen';
      state.wizard.expectedOutcome = 'Praxistauglicher Unterrichtsplan';
      const imported = await desktop.factory.importSourceFile({ projectId: state.wizard.course.courseId, documentId: 'smoke-source', sourcePath, originalFileName: sourceFileName, mimeType: sourceMimeType, sourceCategory: 'course-plan', sourcePriority: 'high', bindingLevel: 'binding' });
      state.wizard.anchorFiles = [{ ...imported, id: imported.documentId, name: imported.originalFileName, path: imported.storedFilePath, type: imported.mimeType, size: imported.fileSize, sourceType: 'course-plan', sourcePriority: 'high', bindingLevel: 'binding' }];
      state.wizard.structureFrame = { schemaVersion: 1, totalDays: 1, unitsPerDay: 2, totalUnits: 2, unitDurationMinutes: 45, targetAudience: { value: 'trainees', label: 'Auszubildende', customText: '' }, priorKnowledge: { value: 'basic', label: 'Grundkenntnisse', customText: '' }, confirmed: false };
      state.wizard.activeStep = 'durationAudience';
      state.wizard.courseProject = null;
      state.wizard.analysisProgress = null;
      showPanel('plan-wizard');
    },
    continueFromDurationAudience: () => continueFromDurationAudienceToAiAnalysis(),
    async plan() { state.wizard.courseProject = await desktop.factory.confirmTopicReview(state.wizard.course.courseId); return startWizardCoursePlanning(); },
    async approve() {
      const draft = currentStructuredDraft();
      state.wizard.courseProject = await desktop.factory.approveStructuredCoursePlan(state.wizard.course.courseId, draft.planningVersion);
      state.wizard.approvedCurriculumPlan = structuredPlanToCurriculum(state.wizard.courseProject.approvedCoursePlan);
      state.wizard.activeStep = 'didactics';
      renderPlanWizard();
    },
    confirmDidactics() {
      state.wizard.didacticConfirmed = true;
      renderPlanWizard();
    },
    snapshot() {
      const draft = currentStructuredDraft();
      const gates = getPlanWizardStepGates();
      const source = state.wizard.courseProject?.uploadedDocuments?.find((document) => document.id === 'smoke-source');
      return {
        activeStep: state.wizard.activeStep,
        operationId: state.wizard.analysisProgress?.operationId,
        analysisStatus: state.wizard.analysisProgress?.status,
        documentAnalysisStatus: state.wizard.courseProject?.pipelinePhases?.document_analysis?.status,
        selectedDay: state.wizard.selectedPlanDay || 1,
        selectedUnit: state.wizard.selectedPlanUnit || 1,
        totalDays: draft?.days?.length || 0,
        totalUnits: (draft?.days || []).reduce((sum, day) => sum + (day.units || []).length, 0),
        containerProfileActive: Boolean(gates.find((gate) => gate.id === 'containerProfile')?.active),
        didacticsActive: Boolean(gates.find((gate) => gate.id === 'didactics')?.active),
        sourceStrategy: source?.preparation?.strategy,
        sourceHasMacros: source?.preparation?.hasMacros,
        phaseTimings: Object.fromEntries(Object.entries(state.wizard.courseProject?.pipelinePhases || {}).map(([phase, value]) => [phase, value.runtimeMs || 0]))
      };
    }
  };
}

function currentStructuredDraft() {
  const project = state.wizard.courseProject;
  return getCurrentValidCoursePlanDraft(project);
}

function updateStructuredUnit(unitId, field, value) {
  const draft = currentStructuredDraft();
  for (const day of draft?.days || []) {
    const unit = (day.units || []).find((item) => item.id === unitId);
    if (unit) { if (field === 'workFormat.key') { const labels = { lecture: 'Lehrgespräch', demonstration: 'Demonstration', guided_practice: 'Geführte Übung', individual: 'Einzelarbeit', pair: 'Partnerarbeit', group: 'Gruppenarbeit', project: 'Projektarbeit', self_study: 'Selbstlernphase', assessment: 'Lernstandskontrolle' }; unit.workFormat = { key: value, label: labels[value] }; } else unit[field] = value; unit.reviewStatus = 'edited'; unit.userEdited = true; break; }
  }
}

function parseStructuredField(field, value) { if (['dayNumber','unitNumber','globalUnitNumber','durationMinutes'].includes(field)) return Number(value); if (['tasks','materials','assessments','differentiation','sourceReferences','warnings'].includes(field)) { try { const parsed = JSON.parse(value || '[]'); if (!Array.isArray(parsed)) throw new Error(); return parsed; } catch { throw new Error(`${fieldLabel(field)} muss ein gültiges JSON-Array sein.`); } } if (field === 'workFormat.key') { const labels = { lecture: 'Lehrgespräch', demonstration: 'Demonstration', guided_practice: 'Geführte Übung', individual: 'Einzelarbeit', pair: 'Partnerarbeit', group: 'Gruppenarbeit', project: 'Projektarbeit', self_study: 'Selbstlernphase', assessment: 'Lernstandskontrolle' }; return { key: value, label: labels[value] }; } return value; }
async function persistStructuredUnitField(field) { try { const draft = currentStructuredDraft(); const fieldName = field.dataset.unitField === 'workFormat.key' ? 'workFormat' : field.dataset.unitField; state.wizard.courseProject = await desktop.factory.editCoursePlanUnit(state.wizard.course.courseId, draft.planningVersion, { unitId: field.dataset.structureUnit, fieldName, newValue: parseStructuredField(field.dataset.unitField, field.value), changeOrigin: 'manual_edit' }); state.wizard.status = `${fieldLabel(fieldName)} gespeichert; die Planbestätigung wurde zurückgesetzt.`; } catch (error) { state.wizard.status = error.message; } renderPlanWizard(); }

async function decideWizardConflict(button) { try { const draft = currentStructuredDraft(); const status = button.dataset.conflictDecision; let resolvedValue; if (status === 'manually_resolved') { const conflict = (draft.conflicts || []).find((item) => item.conflictId === button.dataset.conflict); const entered = window.prompt('Endgültigen Wert eingeben', typeof conflict?.proposedValue === 'string' ? conflict.proposedValue : ''); if (entered === null) return; resolvedValue = entered; } state.wizard.courseProject = await desktop.factory.decideCoursePlanConflict(state.wizard.course.courseId, draft.planningVersion, { conflictId: button.dataset.conflict, resolutionStatus: status, resolvedValue }); state.wizard.status = 'Entscheidung gespeichert und Plan erneut validiert.'; } catch (error) { state.wizard.status = error.message; } renderPlanWizard(); }
async function confirmWizardCoursePlan() { try { const draft = currentStructuredDraft(); state.wizard.courseProject = await desktop.factory.confirmCoursePlanReview(state.wizard.course.courseId, draft.planningVersion); state.wizard.status = 'Unterrichtsplan bestätigt. Er kann jetzt angenommen werden.'; } catch (error) { state.wizard.status = error.message; } renderPlanWizard(); }
async function acceptWizardCoursePlan() { try { const draft = currentStructuredDraft(); state.wizard.courseProject = await desktop.factory.acceptCoursePlanReview(state.wizard.course.courseId, draft.planningVersion); state.wizard.approvedCurriculumPlan = structuredPlanToCurriculum(state.wizard.courseProject.approvedCoursePlan); state.wizard.status = 'Unterrichtsplan angenommen. Die nächste Phase ist freigeschaltet.'; state.wizard.activeStep = 'didactics'; } catch (error) { state.wizard.status = error.message; } renderPlanWizard(); }

async function saveWizardCourseStructure() {
  try {
    state.wizard.courseProject = await desktop.factory.saveStructuredCoursePlan(state.wizard.course.courseId, currentStructuredDraft());
    state.wizard.status = 'Kursstruktur-Entwurf gespeichert.';
  } catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

async function exportWizardCoursePlan() {
  try { const draft = currentStructuredDraft(); const result = await desktop.factory.exportCoursePlanXlsx(state.wizard.course.courseId, draft.planningVersion); state.wizard.status = result.canceled ? 'Export abgebrochen.' : `Unterrichtsplan mit ${result.rowCount} UE exportiert.`; }
  catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

async function applyWizardCoursePlanConfiguration() {
  try { state.wizard.courseProject = await desktop.factory.applyCoursePlanConfiguration(state.wizard.course.courseId, state.wizard.containerProfile); state.wizard.status = 'Container-Konfiguration wurde deterministisch auf den Unterrichtsplan angewendet.'; }
  catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

async function approveWizardCourseStructure() {
  const confirmed = window.confirm('Die fachliche und zeitliche Kursstruktur wird als versionierte Planungsgrundlage gespeichert. Das didaktische Kursprofil kann die Einheiten anschließend ausgestalten, darf die freigegebene Struktur jedoch nicht unbemerkt entfernen oder verschieben.');
  if (!confirmed) return;
  try {
    const draft = currentStructuredDraft();
    state.wizard.courseProject = await desktop.factory.approveStructuredCoursePlan(state.wizard.course.courseId, draft.planningVersion);
    state.wizard.approvedCurriculumPlan = structuredPlanToCurriculum(state.wizard.courseProject.approvedCoursePlan);
    state.wizard.status = 'Kursstruktur freigegeben. Didaktisches Kursprofil ist jetzt freigeschaltet.';
    state.wizard.activeStep = 'didactics';
  } catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

function structuredPlanToCurriculum(plan) {
  return { ...plan, status: 'approved', days: (plan.days || []).map((day) => ({ ...day, estimatedUE: (day.units || []).length, topics: (day.units || []).map((unit) => ({ id: unit.id, title: unit.topic, summary: unit.content, estimatedUE: 1, sourceRefs: unit.sourceReferences || [], active: true })) })) };
}

async function analyzeWizardCurriculum() {
  state.wizard.status = 'Curriculum wird analysiert ...';
  renderPlanWizard();
  try {
    const anchor = await desktop.factory.createCurriculumAnchor({
      types: getAnchorTypes(),
      type: getAnchorTypes()[0],
      title: state.wizard.course.courseName || 'Curriculum Anchor',
      sourceFiles: state.wizard.anchorFiles,
      ranges: state.wizard.rangesText
    });
    state.wizard.curriculumDraft = await desktop.factory.analyzeCurriculumAnchor({
      anchor,
      course: state.wizard.course,
      duration: state.wizard.duration,
      targetAudience: { ...state.wizard.targetAudience, department: state.wizard.course.department || state.wizard.targetAudience.department },
      courseGoal: state.wizard.courseGoal,
      expectedOutcome: state.wizard.expectedOutcome,
      didacticStyle: state.wizard.didacticStyle,
      didacticProfile: getSelectedDidacticProfile(),
      containerProfile: state.wizard.containerProfile,
      aiMode: state.wizard.aiMode
    });
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.coursePlan = curriculumToCoursePlan(state.wizard.curriculumDraft);
    state.wizard.selectedDayNumber = state.wizard.curriculumDraft.days[0]?.dayNumber || 1;
    state.wizard.status = 'CurriculumPlanDraft erzeugt. Bitte prüfen und freigeben.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function approveWizardCurriculum() {
  if (!state.wizard.curriculumDraft?.id) return;
  try {
    state.wizard.curriculumDraft = await desktop.factory.approveCurriculumDraft(state.wizard.curriculumDraft.id);
    state.wizard.approvedCurriculumPlan = state.wizard.curriculumDraft;
    state.wizard.coursePlan = curriculumToCoursePlan(state.wizard.curriculumDraft);
    state.wizard.status = 'Unterrichtsplan freigegeben. Tagesentwürfe sind jetzt möglich.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function moveWizardTopic(topicId, targetDayNumber, targetOrder) {
  if (!state.wizard.curriculumDraft?.id) return;
  try {
    state.wizard.curriculumDraft = await desktop.factory.moveCurriculumTopic(state.wizard.curriculumDraft.id, topicId, targetDayNumber, targetOrder);
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Curriculum geaendert. Bitte erneut freigeben.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function updateWizardTopic(topicId, patch) {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id) return;
  const days = (draft.days || []).map((day) => ({
    ...day,
    topics: (day.topics || []).map((topic) => topic.id === topicId ? { ...topic, ...patch } : topic)
  }));
  try {
    state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Curriculum geaendert. Bitte erneut freigeben.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function updateWizardDay(dayNumber, prop, value) {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id) return;
  const days = (draft.days || []).map((day) => {
    if (day.dayNumber !== dayNumber) return day;
    if (prop === 'learningGoal') return { ...day, learningGoals: [value].filter(Boolean) };
    return { ...day, [prop]: value };
  });
  try {
    state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Curriculum geaendert. Bitte erneut freigeben.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function duplicateWizardTopic(topicId) {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id) return;
  const days = (draft.days || []).map((day) => ({
    ...day,
    topics: (day.topics || []).flatMap((topic) => topic.id === topicId ? [topic, { ...topic, id: `${topic.id}-copy-${Date.now()}`, title: `${topic.title} Kopie` }] : [topic])
  }));
  state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
  state.wizard.approvedCurriculumPlan = null;
  state.wizard.status = 'Thema dupliziert. Bitte erneut freigeben.';
  renderPlanWizard();
}

async function addWizardTopicAfter(topicId) {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id) return;
  const days = (draft.days || []).map((day) => ({
    ...day,
    topics: (day.topics || []).flatMap((topic) => topic.id === topicId ? [topic, createUiTopic(day.dayNumber)] : [topic])
  }));
  state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
  state.wizard.approvedCurriculumPlan = null;
  renderPlanWizard();
}

async function addWizardTopicToDay(dayNumber) {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id) return;
  const days = (draft.days || []).map((day) => day.dayNumber === dayNumber ? { ...day, topics: [...(day.topics || []), createUiTopic(dayNumber)] } : day);
  state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
  state.wizard.approvedCurriculumPlan = null;
  renderPlanWizard();
}

async function addWizardDay() {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id) return;
  const next = Math.max(0, ...(draft.days || []).map((day) => day.dayNumber)) + 1;
  const days = [...(draft.days || []), { dayNumber: next, title: `Tag ${next} - Neues Thema`, mainTopic: 'Neues Thema', estimatedUE: 0, estimatedHours: draft.duration?.hoursPerDay || 8, learningGoals: [], topics: [], practiceBlocks: [], quizPlanned: true, projectContextPlanned: false, warnings: ['Tag ist noch leer.'] }];
  state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
  state.wizard.approvedCurriculumPlan = null;
  renderPlanWizard();
}

async function removeLastWizardDay() {
  const draft = state.wizard.curriculumDraft;
  if (!draft?.id || (draft.days || []).length <= 1) return;
  const days = draft.days.slice(0, -1);
  state.wizard.curriculumDraft = await desktop.factory.updateCurriculumDraft(draft.id, { days });
  state.wizard.approvedCurriculumPlan = null;
  renderPlanWizard();
}

function createUiTopic(dayNumber) {
  return {
    id: `topic-ui-${dayNumber}-${Date.now()}`,
    title: 'Neues Thema',
    summary: 'Eigene Kurzbeschreibung ergaenzen.',
    sourceRefs: ['manual-review'],
    estimatedUE: 1,
    difficulty: 'medium',
    depth: 'basic',
    practiceType: 'guided-task',
    active: true,
    warnings: []
  };
}

async function generateWizardDayDraft() {
  const curriculumDay = state.wizard.approvedCurriculumPlan?.days?.find((item) => item.dayNumber === Number(state.wizard.selectedDayNumber));
  const day = curriculumDayToCourseDay(curriculumDay);
  if (!day) return;
  state.wizard.status = 'Tagesentwurf wird erzeugt ...';
  renderPlanWizard();
  try {
    state.wizard.dayDraft = await desktop.factory.generateDayDraft({
      course: state.wizard.course,
      coursePlan: state.wizard.coursePlan,
      approvedCurriculumPlan: state.wizard.approvedCurriculumPlan,
      day,
      dayNumber: day.dayNumber,
      title: day.title,
      materials: state.wizard.importBatch?.files || [],
      useReferences: state.wizard.useReferences,
      targetAudience: state.wizard.targetAudience,
      containerProfile: state.wizard.containerProfile,
      didacticProfile: getSelectedDidacticProfile(),
      aiMode: state.wizard.aiMode
    });
    state.wizard.dayResults = [
      ...state.wizard.dayResults.filter((item) => item.dayNumber !== state.wizard.dayDraft.dayNumber),
      state.wizard.dayDraft
    ].sort((a, b) => a.dayNumber - b.dayNumber);
    state.wizard.status = 'Tagesentwurf erzeugt.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function generateAllWizardDayDrafts() {
  state.wizard.status = 'Alle Tagesentwürfe werden erzeugt ...';
  renderPlanWizard();
  try {
    state.wizard.dayResults = await desktop.factory.generateAllDayDrafts({
      course: state.wizard.course,
      coursePlan: state.wizard.coursePlan,
      approvedCurriculumPlan: state.wizard.approvedCurriculumPlan,
      materials: state.wizard.importBatch?.files || [],
      useReferences: state.wizard.useReferences,
      targetAudience: state.wizard.targetAudience,
      containerProfile: state.wizard.containerProfile,
      didacticProfile: getSelectedDidacticProfile(),
      aiMode: state.wizard.aiMode
    });
    state.wizard.dayDraft = state.wizard.dayResults[0] || null;
    state.wizard.status = `${state.wizard.dayResults.length} Tagesentwürfe erzeugt.`;
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function reviseWizardDayDraft() {
  if (!state.wizard.dayDraft) return;
  state.wizard.status = 'Tagesentwurf wird mit Korrektur ueberarbeitet ...';
  renderPlanWizard();
  try {
    state.wizard.dayDraft = await desktop.factory.reviseDayDraft({
      course: state.wizard.course,
      coursePlan: state.wizard.coursePlan,
      approvedCurriculumPlan: state.wizard.approvedCurriculumPlan,
      existingDraft: state.wizard.dayDraft,
      correctionPrompt: state.wizard.corrections,
      targetAudience: state.wizard.targetAudience,
      containerProfile: state.wizard.containerProfile,
      didacticProfile: getSelectedDidacticProfile(),
      aiMode: state.wizard.aiMode
    });
    state.wizard.dayResults = [
      ...state.wizard.dayResults.filter((item) => item.dayNumber !== state.wizard.dayDraft.dayNumber),
      state.wizard.dayDraft
    ].sort((a, b) => a.dayNumber - b.dayNumber);
    state.wizard.status = 'Tagesentwurf wurde ueberarbeitet.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function createWizardDraft() {
  state.wizard.status = 'Draft-Container wird geschrieben ...';
  renderPlanWizard();
  try {
    const dayResults = state.wizard.dayResults.length ? state.wizard.dayResults : [state.wizard.dayDraft];
    state.wizard.generatedDraft = await desktop.factory.createPlanContainerDraft({
      course: state.wizard.course,
      coursePlan: state.wizard.coursePlan,
      approvedCurriculumPlan: state.wizard.approvedCurriculumPlan,
      curriculumPlan: state.wizard.approvedCurriculumPlan,
      materials: state.wizard.importBatch?.files || [],
      references: [],
      aiMode: state.wizard.aiMode,
      corrections: state.wizard.corrections,
      targetAudience: state.wizard.targetAudience,
      containerProfile: state.wizard.containerProfile,
      didacticProfile: getSelectedDidacticProfile(),
      dayResults
    });
    state.wizard.status = 'Draft-Container erzeugt.';
    await loadState();
  } catch (error) {
    state.wizard.status = error.message;
    renderPlanWizard();
  }
}

function buildWizardTestInput(overrides = {}) {
  const dayResults = state.wizard.dayResults.length ? state.wizard.dayResults : [state.wizard.dayDraft].filter(Boolean);
  return {
    course: state.wizard.course,
    coursePlan: state.wizard.coursePlan,
    approvedCurriculumPlan: state.wizard.approvedCurriculumPlan,
    curriculumPlan: state.wizard.approvedCurriculumPlan,
    duration: state.wizard.duration,
    materials: state.wizard.importBatch?.files || [],
    uploads: state.wizard.importBatch?.files || state.wizard.uploadFiles || [],
    references: [],
    referenceUsage: { exportReferences: false, useReferences: state.wizard.useReferences },
    useReferences: state.wizard.useReferences,
    aiMode: state.wizard.aiMode || 'local',
    corrections: state.wizard.corrections,
    targetAudience: state.wizard.targetAudience,
    containerProfile: state.wizard.containerProfile,
    didacticProfile: getSelectedDidacticProfile(),
    selectedPresetId: state.wizard.selectedPresetId,
    dayResults,
    ...overrides
  };
}

async function runWizardPreflight() {
  state.wizard.status = 'Preflight wird geprüft ...';
  renderPlanWizard();
  try {
    state.wizard.preflight = await desktop.factory.runPreflight(buildWizardTestInput());
    state.wizard.status = `Preflight ${state.wizard.preflight.status}: ${state.wizard.preflight.score}/100.`;
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function previewWizardPromptQuality() {
  state.wizard.status = 'Prompt Quality Gate wird geprüft ...';
  renderPlanWizard();
  try {
    state.wizard.promptQuality = await desktop.factory.previewPromptQuality(buildWizardTestInput({ purpose: 'generateDayDraft' }));
    state.wizard.status = `Prompt Quality ${state.wizard.promptQuality.status}: ${state.wizard.promptQuality.score}/100.`;
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function runPromptGoldenTests() {
  state.wizard.status = 'Golden Prompt Tests laufen ...';
  renderPlanWizard();
  try {
    state.goldenPromptResult = await desktop.factory.runPromptGoldenTests();
    state.wizard.status = `Golden Prompt Tests ${state.goldenPromptResult.status}: ${state.goldenPromptResult.passed}/${state.goldenPromptResult.total}.`;
  } catch (error) {
    state.goldenPromptResult = { status: 'failed', passed: 0, total: 0, results: [], message: error.message };
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

async function runWizardTestDraft(confirmWarnings) {
  state.wizard.status = confirmWarnings ? 'Testlauf wird trotz Warnungen erzeugt ...' : 'Testlauf wird erzeugt ...';
  renderPlanWizard();
  try {
    const input = buildWizardTestInput({ confirmWarnings });
    state.wizard.costEstimate = await desktop.factory.estimateAiCost(input);
    if (state.wizard.costEstimate.warning && !confirmWarnings && !window.confirm(`Geschätzte Kosten: ca. ${state.wizard.costEstimate.estimatedCostUsd} USD. Fortfahren?`)) {
      state.wizard.status = 'Testlauf wegen Kostenwarnung abgebrochen.';
      renderPlanWizard();
      return;
    }
    const result = await desktop.factory.runTestDraft(input);
    state.wizard.testRun = result;
    state.wizard.preflight = result.preflight || state.wizard.preflight;
    if (result.containerId) {
      state.wizard.generatedDraft = result;
    }
    state.wizard.status = result.requiresConfirmation ? 'Preflight-Warnungen bestätigen oder korrigieren.' : `Testlauf ${result.status}.`;
    await loadState();
  } catch (error) {
    state.wizard.status = error.message;
    renderPlanWizard();
  }
}

async function refreshAiStatus() {
  state.aiStatus = await desktop.factory.getAiProviderStatus();
  state.wizard.costEstimate = await desktop.factory.estimateAiCost(buildWizardTestInput());
  renderPlanWizard();
}

async function updateAiModel() {
  const model = $('[data-ai-model]')?.value || 'gpt-5.4-mini';
  state.wizard.status = 'KI-Modell wird gespeichert ...';
  renderPlanWizard();
  try {
    await desktop.factory.updateAiModel(model);
    state.aiImportResult = { success: true, message: 'KI-Modell wurde gespeichert.' };
    await refreshAiStatus();
  } catch (error) {
    state.aiImportResult = { success: false, message: error.message };
    renderPlanWizard();
  }
}

async function importAiKeyFromSelectedTxt() {
  state.wizard.status = 'TXT-Datei wird ausgewählt ...';
  renderPlanWizard();
  try {
    const result = await desktop.factory.selectOpenAiKeyTxt();
    state.aiImportResult = result?.canceled ? { success: false, message: 'Dateiauswahl abgebrochen.' } : result;
    await refreshAiStatus();
  } catch (error) {
    state.aiImportResult = { success: false, message: error.message };
    renderPlanWizard();
  }
}

async function replaceAiKey() {
  const value = await requestSecretInput();
  if (!value) return;
  try {
    state.aiImportResult = await desktop.factory.replaceOpenAiKey(value);
    await refreshAiStatus();
  } catch {
    state.aiImportResult = { success: false, message: 'Der Schlüssel konnte nicht sicher gespeichert werden.' };
    renderPlanWizard();
  }
}

function requestSecretInput() {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    const form = document.createElement('form');
    form.method = 'dialog';
    const title = document.createElement('h3');
    title.textContent = 'OpenAI-API-Schlüssel eingeben/ersetzen';
    const input = document.createElement('input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'OpenAI-API-Schlüssel');
    const buttons = document.createElement('div');
    buttons.className = 'button-row';
    buttons.innerHTML = '<button type="submit" value="cancel" class="secondary-button">Abbrechen</button><button type="submit" value="save" class="primary-button">Sicher speichern</button>';
    form.append(title, input, buttons);
    dialog.append(form);
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
      const value = dialog.returnValue === 'save' ? input.value : '';
      input.value = '';
      dialog.remove();
      resolve(value);
    }, { once: true });
    dialog.showModal();
    input.focus();
  });
}

async function clearAiKey() {
  if (!window.confirm('OpenAI-Key aus der lokalen Admin-Konfiguration entfernen?')) return;
  state.wizard.status = 'OpenAI-Key wird entfernt ...';
  renderPlanWizard();
  try {
    state.aiImportResult = await desktop.factory.clearOpenAiKey();
    state.aiTestResult = null;
    await refreshAiStatus();
  } catch (error) {
    state.aiImportResult = { success: false, message: error.message };
    renderPlanWizard();
  }
}

async function testAiConnection() {
  state.wizard.status = 'KI-Testanfrage laeuft ...';
  renderPlanWizard();
  try {
    state.aiTestResult = await desktop.factory.testOpenAiConnection();
  } catch (error) {
    state.aiTestResult = { status: 'failed', message: error.message };
  }
  await refreshAiStatus();
}

async function deleteLastWizardTestDraft() {
  state.wizard.status = 'Letzter Testentwurf wird gelöscht ...';
  renderPlanWizard();
  try {
    state.wizard.cleanupReport = await desktop.factory.deleteLastTestDraft();
    state.wizard.generatedDraft = null;
    state.wizard.testRun = null;
    await loadState();
  } catch (error) {
    state.wizard.status = error.message;
    renderPlanWizard();
  }
}

async function clearWizardStaging() {
  state.wizard.status = 'Staging wird geleert ...';
  renderPlanWizard();
  try {
    state.wizard.cleanupReport = await desktop.factory.clearStaging();
    state.storageUsage = await desktop.factory.listStorageUsage();
    state.wizard.status = 'Staging geleert.';
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

function curriculumToCoursePlan(curriculum) {
  return {
    courseTitle: curriculum.course?.courseName || 'Kurs',
    courseId: curriculum.course?.courseId || '',
    department: curriculum.course?.department || 'ALLGEMEIN',
    selectedSheet: 'Curriculum Planner',
    availableSheets: ['Curriculum Planner'],
    totalDays: curriculum.days?.length || 0,
    totalUE: (curriculum.days || []).reduce((sum, day) => sum + Number(day.estimatedUE || 0), 0),
    sourceFile: curriculum.anchor?.title || '',
    days: (curriculum.days || []).map(curriculumDayToCourseDay),
    warnings: curriculum.warnings || [],
    unclearRows: []
  };
}

function curriculumDayToCourseDay(day) {
  if (!day) return null;
  return {
    dayNumber: day.dayNumber,
    title: day.title,
    mainTopic: day.mainTopic || day.title,
    subTopics: (day.topics || []).map((topic) => topic.title).slice(1),
    learningGoals: day.learningGoals || [],
    ueBlocks: (day.topics || []).filter((topic) => topic.active !== false).map((topic, index) => ({
      ue: Number(topic.estimatedUE || index + 1),
      time: '',
      learningFormat: topic.practiceType || 'guided-task',
      topic: topic.title,
      teacherTask: topic.summary,
      learnerTask: state.wizard.targetAudience.needsStepByStep ? `${topic.title} Schritt für Schritt bearbeiten.` : `${topic.title} anwenden.`,
      evaluation: `Ergebnis zu ${topic.title} prüfen.`,
      resources: (topic.sourceRefs || []).join(', '),
      notes: topic.difficulty,
      isBreak: false
    })),
    pauses: [],
    warnings: day.warnings || []
  };
}

function renderMapping(batch) {
  $('[data-batch-detail]').hidden = false;
  $('[data-batch-title]').textContent = batch.name;
  $('[data-batch-container-name]').value = batch.name.replace(/^Import\s*/i, '').trim() || 'Neuer Unterrichtscontainer';
  $('[data-batch-container-description]').value = 'Aus importierten Rohdaten erzeugter Unterrichtscontainer';
  $('[data-mapping-list]').innerHTML = batch.files.map((file) => `
    <article class="mapping-item" data-file-id="${escapeHtml(file.id)}">
      <strong>${escapeHtml(file.originalFilename)}</strong>
      <small>${escapeHtml(file.extension)} | ${escapeHtml(file.fileKind)} | ${escapeHtml(file.mappingSource === 'manual' ? 'manuell festgelegt' : 'automatisch vorgeschlagen')}</small>
      ${file.originalZipFilename ? `<details><summary>Aus ZIP: ${escapeHtml(file.originalZipFilename)}</summary><small>${escapeHtml(file.zipEntryPath || '')}</small></details>` : ''}
      ${file.sha256 ? `<small>SHA-256: ${escapeHtml(file.sha256.slice(0, 16))}...</small>` : ''}
      ${file.duplicate ? '<p class="status-line status-warning">Duplikat per Hash erkannt.</p>' : ''}
      ${file.blocked ? '<p class="status-line status-error">Gesperrt: Datei wird nicht exportiert oder ausgeführt.</p>' : ''}
      <div class="factory-form-grid">
        <label>Zielbereich<select data-map-target>${state.targetAreas.map((area) => `<option value="${escapeHtml(area)}" ${file.selectedTarget === area ? 'selected' : ''}>${escapeHtml(state.targetAreaLabels[area] || area)}</option>`).join('')}</select></label>
        <label>Tag<input data-map-day type="number" min="1" max="99" value="${escapeHtml(file.dayNumber ?? '')}"></label>
        <label>Titel<input data-map-title value="${escapeHtml(file.title || '')}"></label>
        <label>Schwierigkeit<select data-map-difficulty><option value="">-</option><option value="leicht" ${file.difficulty === 'leicht' ? 'selected' : ''}>leicht</option><option value="normal" ${file.difficulty === 'normal' ? 'selected' : ''}>normal</option><option value="schwer" ${file.difficulty === 'schwer' ? 'selected' : ''}>schwer</option></select></label>
      </div>
      <label>Notizen<input data-map-notes value="${escapeHtml(file.notes || '')}"></label>
      <button class="secondary-button" type="button" data-save-mapping>Mapping speichern</button>
      ${(file.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
      ${(file.errors || []).map((error) => `<p class="status-line status-error">${escapeHtml(error)}</p>`).join('')}
    </article>
  `).join('');
  renderValidation($('[data-batch-validation]'), batch.validation);
  $all('[data-save-mapping]').forEach((button) => button.addEventListener('click', () => saveMapping(button.closest('[data-file-id]'))));
}

async function loadState() {
  const data = await desktop.factory.getState();
  state.aiStatus = await desktop.factory.getAiProviderStatus();
  state.wizard.costEstimate = await desktop.factory.estimateAiCost(buildWizardTestInput()).catch(() => null);
  state.containers = data.containers || [];
  state.importBatches = data.importBatches || [];
  state.referenceSources = data.referenceSources || [];
  state.curriculumDrafts = data.curriculumDrafts || [];
  state.courseProjects = data.courseProjects || [];
  state.presets = data.presets || [];
  state.didacticProfiles = data.didacticProfiles || [];
  if (!state.wizard.didacticProfile?.label) state.wizard.didacticProfile = getSelectedDidacticProfile();
  await refreshDidacticRecommendation();
  state.storageUsage = data.storageUsage || state.storageUsage;
  state.targetAreas = data.targetAreas || [];
  state.targetAreaLabels = data.targetAreaLabels || {};
  renderContainers();
  renderBatches();
  renderReferences();
  renderSettings();
  renderWorkflowPanelIntros();
  renderPlanWizard();
  renderFactoryNavigationGates($('[data-factory-panel].is-active')?.dataset.factoryPanel || 'home');
  if (state.selectedBatchId) {
    const batch = state.importBatches.find((item) => item.id === state.selectedBatchId);
    if (batch) renderMapping(batch);
  }
}

async function importReferences() {
  const status = $('[data-reference-status]');
  const files = Array.from($('[data-reference-files]').files || []).map((file) => ({
    name: file.name,
    path: file.path || '',
    size: file.size,
    type: file.type,
    title: $('[data-reference-title]').value,
    author: $('[data-reference-author]').value,
    licenseNotes: $('[data-reference-license]').value
  }));
  if (!$('[data-reference-confirm]').checked) {
    status.textContent = 'Bitte bestätige zuerst, dass die Quelle nur intern verwendet wird.';
    return;
  }
  status.textContent = 'Referenzen werden lokal importiert ...';
  try {
    const result = await desktop.factory.importReferenceSources({
      files,
      confirmReferenceOnly: true
    });
    status.textContent = `Import abgeschlossen: ${result.length} Quelle(n).`;
    $('[data-reference-files]').value = '';
    await loadState();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function searchReferences() {
  const target = $('[data-reference-search-results]');
  target.innerHTML = '<p class="status-line">Suche laeuft lokal ...</p>';
  try {
    const result = await desktop.factory.searchReferences({
      query: $('[data-reference-query]').value,
      dayTopic: $('[data-reference-day-topic]').value,
      maxResults: 5
    });
    target.innerHTML = (result.results || []).length
      ? result.results.map((item) => `
        <article class="mapping-item">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.sourceRef)} | Score ${Math.round(item.relevanceScore * 100)}%</small>
          <p>${escapeHtml(item.generatedSummary || 'Diese Quelle enthält wahrscheinlich passende Inhalte zum Suchthema.')}</p>
        </article>
      `).join('')
      : '<p class="status-line">Keine Treffer. Es werden keine vollständigen Chunks angezeigt.</p>';
  } catch (error) {
    target.innerHTML = `<p class="status-line status-error">${escapeHtml(error.message)}</p>`;
  }
}

async function removeReference(referenceId) {
  if (!window.confirm('Referenzquelle lokal entfernen?')) return;
  await desktop.factory.removeReferenceSource(referenceId);
  await loadState();
}

async function duplicateContainer() {
  const status = $('[data-duplicate-status]');
  status.textContent = 'Entwurf wird erzeugt ...';
  try {
    const saved = await desktop.factory.duplicateContainer({
      sourceContainerId: $('[data-duplicate-source]').value,
      newName: $('[data-duplicate-name]').value,
      newDescription: $('[data-duplicate-description]').value,
      newId: $('[data-duplicate-id]').value,
      copyMode: $('[data-duplicate-copy-mode]').value,
      tags: $('[data-duplicate-tags]').value.split(',').map((item) => item.trim()).filter(Boolean),
      includeRoutes: $('[data-include-routes]').checked,
      includeMaterials: $('[data-include-materials]').checked,
      includeAssets: $('[data-include-assets]').checked,
      includeTasks: $('[data-include-tasks]').checked,
      includeSolutions: $('[data-include-solutions]').checked,
      includeQuizzes: $('[data-include-quizzes]').checked,
      visibleInLauncher: $('[data-duplicate-visible]').checked
    });
    status.textContent = `Draft erzeugt: ${saved.manifest.id}`;
    await loadState();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function importRawFiles() {
  const status = $('[data-import-status]');
  const selectedFiles = state.rawImportFiles.length ? state.rawImportFiles : Array.from($('[data-import-files]').files || []);
  const files = selectedFiles.map((file) => ({
    name: file.name,
    sourcePath: desktop.factory.getPathForFile(file),
    size: file.size,
    type: file.type
  }));
  status.textContent = 'Dateien werden importiert ...';
  try {
    const batch = await desktop.factory.importFiles({
      name: $('[data-import-name]').value,
      files
    });
    status.textContent = `Import-Batch erstellt: ${batch.files.length} Datei(en).`;
    state.selectedBatchId = batch.id;
    await loadState();
    showPanel('batches');
  } catch (error) {
    status.textContent = error.message;
  }
}

function openBatch(batchId) {
  state.selectedBatchId = batchId;
  const batch = state.importBatches.find((item) => item.id === batchId);
  if (batch) renderMapping(batch);
}

async function saveMapping(item) {
  const fileId = item.dataset.fileId;
  await desktop.factory.updateMapping(state.selectedBatchId, fileId, {
    selectedTarget: item.querySelector('[data-map-target]').value,
    dayNumber: item.querySelector('[data-map-day]').value,
    title: item.querySelector('[data-map-title]').value,
    difficulty: item.querySelector('[data-map-difficulty]').value,
    notes: item.querySelector('[data-map-notes]').value,
    mappingLocked: true
  });
  await loadState();
}

async function validateBatch() {
  const batch = await desktop.factory.validateBatch(state.selectedBatchId);
  renderMapping(batch);
  await loadState();
}

async function createContainerFromBatch() {
  const options = {
    name: $('[data-batch-container-name]').value,
    id: $('[data-batch-container-id]').value,
    description: $('[data-batch-container-description]').value,
    category: 'Unterricht',
    tags: $('[data-batch-container-tags]').value.split(',').map((item) => item.trim()).filter(Boolean),
    visibleInLauncher: false
  };
  try {
    await desktop.factory.createContainerFromBatch(state.selectedBatchId, options);
    await loadState();
    showPanel('overview');
  } catch (error) {
    $('[data-batch-validation]').innerHTML = `<p class="status-line status-error">${escapeHtml(error.message)}</p>`;
  }
}

async function publishContainer(containerId) {
  const firstResult = await desktop.factory.publishContainer(containerId, {});
  if (firstResult.requiresConfirmation) {
    const confirmed = window.confirm(`Warnungen vorhanden:\n${firstResult.validation.warnings.join('\n')}\n\nTrotzdem veröffentlichen?`);
    if (!confirmed) return;
    await desktop.factory.publishContainer(containerId, { confirmWarnings: true });
  }
  await loadState();
}

async function updateContainerStatus(containerId, action) {
  if (action === 'disable') {
    await desktop.factory.disableContainer(containerId);
  } else {
    await desktop.factory.archiveContainer(containerId);
  }
  await loadState();
}

async function init() {
  bindFactoryNavigation();
  if (!hasDocumentAnalysisWorkflow) {
    setFactoryStatus('Das Modul für Dokumentanalyse und Kursplanung konnte nicht initialisiert werden. Analysefunktionen bleiben deaktiviert.', 'status-error');
  }
  if (!hasDesktopFactory) {
    setFactoryStatus(browserPreviewMessage(), 'status-warning');
    appNavigation.activatePanel('home', { focus: false });
    disableDesktopOnlyControls();
    return;
  }
  $('[data-ui-mode-toggle]')?.addEventListener('change', (event) => {
    state.uiMode = event.target.checked ? 'expert' : 'guided';
    state.wizard.expertMode = state.uiMode === 'expert';
    renderWorkflowPanelIntros();
    renderFactoryNavigationGates($('[data-factory-panel].is-active')?.dataset.factoryPanel || 'home');
    setFactoryStatus(event.target.checked ? 'Expertenmodus ist aktiviert.' : 'Geführter Modus ist aktiv.', event.target.checked ? '' : 'status-warning');
  });
  $('[data-open-landing]')?.addEventListener('click', () => desktop.openLanding?.());
  $('[data-refresh]').addEventListener('click', loadState);
  $('[data-run-duplicate]').addEventListener('click', duplicateContainer);
  $('[data-run-import]').addEventListener('click', importRawFiles);
  bindRawImportDropzone();
  $('[data-import-references]').addEventListener('click', importReferences);
  $('[data-search-references]').addEventListener('click', searchReferences);
  $('[data-validate-batch]').addEventListener('click', validateBatch);
  $('[data-create-from-batch]').addEventListener('click', createContainerFromBatch);
  try {
    await loadState();
  } catch (error) {
    setFactoryStatus(`Desktop-Daten konnten nicht geladen werden: ${error.message}`, 'status-error');
  }
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${escapeHtml(error.message)}</p>`);
});
