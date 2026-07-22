const desktop = window.lfzq8aDesktop;
const appNavigation = window.ContentFactoryAppNavigation;
const uploadUtils = window.ContentFactoryUploadUtils || {};
const workflowLayout = window.ContentFactoryWorkflowLayout || {};
const difficultyLevels = window.ContentFactoryDifficultyLevels || { levels: [{ value: 'easy', label: 'Einfach' }, { value: 'medium', label: 'Mittel' }, { value: 'hard', label: 'Schwer' }, { value: 'easy_medium', label: 'Einfach & Mittel' }, { value: 'medium_hard', label: 'Mittel & Schwer' }, { value: 'all', label: 'Alle 3' }], normalizeDifficulty: () => 'medium', difficultyLabel: () => 'Mittel' };
const workflowRegistry = window.ContentFactoryWorkflowRegistry || {};
const workflowStatus = window.ContentFactoryWorkflowStatus || {};
const visibleLabel = window.ContentFactoryWorkflowUtils?.visibleLabel || ((value) => String(value ?? ''));
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
    planningFrame: { targetGroup: '', priorKnowledge: '', totalDays: 5, unitsPerDay: 9, totalUnits: 45, unitDurationMinutes: 45, dailyStartTime: '08:30', dailyEndTime: '16:30', breaksText: '10:00-10:15\n11:45-12:15\n13:45-14:00\n15:30-15:45', repetitionUnits: 0, projectUnits: 0, assessmentUnits: 0, bufferUnits: 0, deliveryMode: 'presence' },
    structureFrame: { schemaVersion: 1, targetAudience: { value: '', label: '', customText: '' }, priorKnowledge: { value: '', label: '', customText: '' }, totalDays: 5, unitsPerDay: 9, totalUnits: 45, unitDurationMinutes: 45, confirmed: false },
    scopeErrors: {},
    rangesText: '',
    duration: { numberOfDays: 5, hoursPerDay: 8, uePerDay: 9, ueMinutes: 45, totalHours: 40, totalUE: 45, pauseModel: 'default' },
    targetAudience: { ageRange: 'mixed', educationContext: 'umschulung', department: 'ALLGEMEIN', priorKnowledge: 'basic', learningLevel: 'basic', languageLevel: 'normal', practiceLevel: 'medium', difficultyMode: 'medium', needsStepByStep: true, examOrientation: false, projectOrientation: true },
    containerProfile: { courseType: 'theory', artifactMode: 'web-only', studentWorkspace: true, teacherSolutions: true, generateStarterFiles: true, generateSolutionFiles: true, generateReadme: true, generateSetupGuide: true, generateRunScripts: false, allowExecutableTools: false, allowDatabaseActions: false },
    courseGoal: '',
    expectedOutcome: 'grundlagenkurs',
    didacticStyle: 'guided',
    didacticProfile: { id: 'explain-demo-practice' },
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
  { id: 'course-plan', label: 'Unterrichtsplan', formats: ['.xls', '.xlsx', '.xlsm'] },
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
  setFactoryStatus('');
  renderFactoryNavigationGates(panelName);
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
        title: 'ContentFactory Start',
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
  const nextGate = gates.slice(currentIndex + 1).find((gate) => gate.active);
  const activeStep = workflow.steps.find((step) => step.id === wizard.activeStep) || workflow.steps[0];
  const headerStatus = workflowStatus.getWorkflowStatus?.(gates) || 'active';
  const contentHtml = renderCurrentPlanWizardStep(wizard, activeGate);
  root.innerHTML = `
    ${workflowLayout.renderWorkflowHeader ? workflowLayout.renderWorkflowHeader(workflow, headerStatus) : ''}
    ${workflowLayout.renderWorkflowStepper ? workflowLayout.renderWorkflowStepper(workflow, wizard.activeStep, gates) : ''}
    ${wizard.status ? `<div class="workflow-transient-status"><p class="status-line" role="status" aria-live="polite">${escapeHtml(wizard.status)}</p></div>` : ''}
    ${wizard.uiError ? `<div class="modal-backdrop" role="presentation"><section class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="wizard-error-title"><h3 id="wizard-error-title">${escapeHtml(wizard.uiError.title)}</h3><p>${escapeHtml(wizard.uiError.message)}</p><div class="button-row">${wizard.uiError.retry ? '<button type="button" class="primary-button" data-retry-wizard-error>Erneut versuchen</button>' : ''}<button type="button" class="secondary-button" data-close-wizard-error>Schließen</button></div></section></div>` : ''}
    ${workflowLayout.renderWorkflowStepShell
      ? workflowLayout.renderWorkflowStepShell({
        workflow,
        step: activeStep,
        contentHtml,
        statusHtml: renderPlanWizardStepStatus(activeGate),
        actionsHtml: workflowLayout.renderWorkflowActionBar({
          canBack: Boolean(previousGate),
          canNext: Boolean(nextGate),
          canSkip: Boolean(activeGate.optional),
          canCheck: activeGate.id === 'analysis' || activeGate.id === 'preflight',
          nextLabel: nextGate ? `Weiter: ${nextGate.label}` : 'Weiter'
        })
      })
      : contentHtml}
  `;
  bindPlanWizardEvents();
  renderFactoryNavigationGates($('[data-factory-panel].is-active')?.dataset.factoryPanel || 'plan-wizard');
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
  const nextAction = getNextRecommendedAction();
  return workflowLayout.renderWorkflowResultCard
    ? workflowLayout.renderWorkflowResultCard({
      title: gate.done ? 'Schritt erledigt' : gate.active ? 'Aktueller Schritt' : 'Gesperrt',
      result: gate.done ? 'Die Voraussetzung ist erfüllt.' : gate.active ? 'Bearbeite diesen Schritt und nutze danach Weiter.' : gate.missing,
      warnings: gate.active || gate.done ? [] : [gate.missing],
      nextAction: nextAction.label
    })
    : '';
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
  return `
    <article class="tool-card" data-plan-step-content="course">
      <h3>Kursdaten</h3>
      <p id="course-required-help">Pflichtfelder sind mit „erforderlich“ gekennzeichnet. Diese Angaben erscheinen später in der Kursübersicht.</p>
      <fieldset>
      <legend>Allgemeine Kursangaben</legend>
      ${state.courseProjects.length ? `<label>Gespeichertes Kursprojekt öffnen<select data-open-course-project><option value="">Neues Projekt</option>${state.courseProjects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title || project.id)}${project.approved ? ' (freigegeben)' : ''}</option>`).join('')}</select></label>` : ''}
      <div class="factory-form-grid">
        <label>Kurstitel <span class="field-requirement">erforderlich</span><input data-wizard-course="courseName" value="${escapeHtml(wizard.course.courseName)}" aria-describedby="course-required-help" required></label>
        <label>Kurs-ID <span class="field-requirement">erforderlich</span><input data-wizard-course="courseId" value="${escapeHtml(wizard.course.courseId)}" aria-describedby="course-id-help" required><small id="course-id-help">Eine eindeutige Kurzbezeichnung, zum Beispiel „lf08-netzwerke“.</small></label>
        <label>Fachbereich <span class="field-requirement">erforderlich</span><select data-wizard-course="department" aria-describedby="course-required-help" required>${['', 'FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'].map((value) => `<option value="${value}" ${wizard.course.department === value ? 'selected' : ''}>${value || 'Bitte wählen'}</option>`).join('')}</select></label>
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
  return `
    <article class="tool-card" data-plan-step-content="durationAudience">
      <h3>Dauer & Zielgruppe</h3>
      <div class="duration-audience-layout">
        <section class="form-section" aria-labelledby="duration-heading"><h4 id="duration-heading">Dauer</h4><div class="factory-form-grid compact-form-grid">
        <label>Kurstage<input data-structure-frame="totalDays" type="number" min="1" step="1" value="${escapeHtml(scope.totalDays)}" aria-describedby="scope-days-error" required>${errors.totalDays ? `<small id="scope-days-error" class="field-error">${escapeHtml(errors.totalDays)}</small>` : ''}</label>
        <label>UE je Tag<input data-structure-frame="unitsPerDay" type="number" min="1" step="1" value="${escapeHtml(scope.unitsPerDay)}" aria-describedby="scope-units-error" required>${errors.unitsPerDay ? `<small id="scope-units-error" class="field-error">${escapeHtml(errors.unitsPerDay)}</small>` : ''}</label>
        <label>Dauer einer UE (Minuten)<input data-structure-frame="unitDurationMinutes" type="number" min="1" step="1" value="${escapeHtml(scope.unitDurationMinutes)}" aria-describedby="scope-duration-error" required>${errors.unitDurationMinutes ? `<small id="scope-duration-error" class="field-error">${escapeHtml(errors.unitDurationMinutes)}</small>` : ''}</label>
        <label>Gesamtzahl UE<input data-course-scope-total value="${escapeHtml(Number(scope.totalDays || 0) * Number(scope.unitsPerDay || 0))}" readonly aria-label="Automatisch berechnete Gesamtzahl der Unterrichtseinheiten"></label>
        </div></section>
        <section class="form-section" aria-labelledby="audience-heading"><h4 id="audience-heading">Zielgruppe</h4><div class="factory-form-grid compact-form-grid">
        <label class="form-field-wide">Zielgruppe<select data-course-scope-selection="targetAudience" aria-describedby="scope-audience-error" required><option value="">Bitte Zielgruppe auswählen</option>${targetAudienceOptions.map((option) => `<option value="${option.value}" ${scope.targetAudience?.value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>${errors.targetAudience ? `<small id="scope-audience-error" class="field-error">${escapeHtml(errors.targetAudience)}</small>` : ''}</label>
        ${scope.targetAudience?.value === 'other_audience' ? `<label class="form-field-wide">Zielgruppe beschreiben<input data-course-scope-custom="targetAudience" value="${escapeHtml(scope.targetAudience.customText)}" aria-describedby="scope-audience-custom-error" required>${errors.targetAudienceCustom ? `<small id="scope-audience-custom-error" class="field-error">${escapeHtml(errors.targetAudienceCustom)}</small>` : ''}</label>` : ''}
        <label class="form-field-wide">Vorkenntnisse<select data-course-scope-selection="priorKnowledge" aria-describedby="scope-knowledge-error" required><option value="">Bitte Vorkenntnisse auswählen</option>${priorKnowledgeOptions.map((option) => `<option value="${option.value}" ${scope.priorKnowledge?.value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>${errors.priorKnowledge ? `<small id="scope-knowledge-error" class="field-error">${escapeHtml(errors.priorKnowledge)}</small>` : ''}</label>
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
  const running = wizard.analysisProgress?.status === 'running';
  const documents = project?.uploadedDocuments?.length ? project.uploadedDocuments : wizard.anchorFiles;
  const analyses = project?.documentAnalyses || [];
  return `<article class="tool-card" data-plan-step-content="courseStructure">
    <h3>KI-Analyse und Kursplanung</h3>
    <p class="status-line">Die hochgeladenen Dokumente werden gemeinsam ausgewertet. Anschließend erstellt die KI einen Vorschlag für die Verteilung der Themen auf die vorhandenen Kurstage und Unterrichtseinheiten.</p>
    ${running ? `<div class="analysis-progress" role="status" aria-live="polite"><span class="indeterminate-spinner" aria-hidden="true"></span><strong>${escapeHtml(wizard.analysisProgress.step)}</strong><span>${escapeHtml(wizard.analysisProgress.currentDocument || '')}</span><small>wartend: ${escapeHtml(wizard.analysisProgress.queued || 0)} | erfolgreich: ${escapeHtml(wizard.analysisProgress.completed || 0)} | Warnungen: ${escapeHtml(wizard.analysisProgress.warningCount || 0)} | fehlgeschlagen: ${escapeHtml(wizard.analysisProgress.failed || 0)}</small></div>` : ''}
    <div class="mapping-list">${documents.map((document, index) => renderDocumentAnalysisCard(document, analyses, index)).join('')}</div>
    <div class="button-row"><button class="primary-button" type="button" data-document-analyze ${ready && !running ? '' : 'disabled'}>${running ? 'Analyse und Planung laufen …' : 'Dokumente analysieren und Themenstruktur erstellen'}</button>
    <button class="secondary-button" type="button" data-document-analysis-cancel ${running ? '' : 'disabled'}>Vorgang abbrechen</button></div>
    ${!ready ? '<p class="status-line status-warning">Die Analyse kann noch nicht gestartet werden. Erforderlich sind Kursbezeichnung, mindestens ein Dokument, Zielgruppe, Vorkenntnisse, Tage, UE-Angaben und eine konfigurierte OpenAI-Verbindung.</p>' : ''}
  </article>`;
}

function renderDocumentAnalysisCard(document, analyses, index) {
  const id = document.id || `document-${index}`;
  const analysis = [...analyses].reverse().find((item) => item.documentId === id);
  const category = analysis?.detectedCategory?.value || document.detectedCategory?.value || document.detectedCategory || '-';
  const confidence = Number(analysis?.confidence || analysis?.detectedCategory?.confidence || 0);
  const summary = analysis?.summary?.short || (typeof analysis?.summary === 'string' ? analysis.summary : 'Noch keine Analyse vorhanden.');
  const error = document.analysisError;
  return `<article class="mapping-item document-analysis-card">
    <strong>${escapeHtml(document.originalFileName || document.name)}</strong>
    <small>Kategorie: ${escapeHtml(document.declaredCategory || document.sourceType || '-')} | erkannt: ${escapeHtml(category)} | Confidence: ${escapeHtml(Math.round(confidence * 100))}%</small>
    <span class="status-badge">${escapeHtml(document.analysisStatus || 'queued')}</span><p>${escapeHtml(summary)}</p>
    ${analysis ? `<details><summary>Analysefelder anzeigen</summary>${renderAnalysisList('Themen', analysis.topics)}${renderAnalysisList('Lernziele', analysis.learningObjectives)}${renderAnalysisList('Kompetenzen', analysis.competencies)}${renderAnalysisList('Aufgaben', analysis.exercises)}${renderAnalysisList('Warnungen', analysis.warnings)}${renderAnalysisList('Konflikte', analysis.conflicts)}${renderAnalysisList('Quellen', analysis.sourceReferences)}${renderAnalysisList('Review-Punkte', analysis.reviewItems)}</details>` : ''}
    ${error ? `<p class="status-line status-error">${escapeHtml(error.message)}</p><details><summary>Technische Details</summary><dl><dt>Fehlercode</dt><dd>${escapeHtml(error.code)}</dd><dt>Schritt</dt><dd>${escapeHtml(error.step)}</dd><dt>Feld</dt><dd>${escapeHtml(error.field)}</dd><dt>Erwartet</dt><dd>${escapeHtml(error.expected)}</dd><dt>Empfangen</dt><dd>${escapeHtml(error.received)}</dd></dl></details><button class="secondary-button" type="button" data-retry-document="${escapeHtml(id)}">Dokument erneut analysieren</button>${document.bindingLevel === 'binding' && !document.failureAcknowledged ? `<button class="secondary-button" type="button" data-ack-document-failure="${escapeHtml(id)}">Als Ausnahme bestätigen</button>` : ''}` : ''}
  </article>`;
}

function renderAnalysisList(title, values) {
  const list = Array.isArray(values) ? values : [];
  if (!list.length) return `<section><strong>${escapeHtml(title)}</strong><p class="dropzone-empty">Keine Einträge erkannt.</p></section>`;
  return `<section><strong>${escapeHtml(title)}</strong><ul>${list.map((item) => `<li>${escapeHtml(formatAnalysisItem(item))}</li>`).join('')}</ul></section>`;
}

function formatAnalysisItem(item) {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item);
  return String(item.title || item.value || item.name || item.description || item.text || item.summary || item.message || item.fileName || item.documentId || 'Strukturierter Eintrag');
}

function renderStructureReviewStep(wizard) {
  const project = wizard.courseProject;
  const draft = project?.coursePlanDrafts?.find((item) => item.planningVersion === project.currentPlanningVersion);
  if (!draft) return '<article class="tool-card"><h3>Struktur-Review</h3><p class="status-line status-warning">Noch keine KI-Kursstruktur vorhanden.</p></article>';
  return `<article class="tool-card" data-plan-step-content="structureReview">
    <h3>Struktur-Review</h3>
    <div class="summary-grid"><span>Kurs: ${escapeHtml(project.title)}</span><span>Zielgruppe: ${escapeHtml(project.targetGroup)}</span><span>Tage: ${escapeHtml((draft.structureFrameSnapshot || draft.planningFrameSnapshot)?.totalDays)}</span><span>planbare UE: ${escapeHtml((draft.structureFrameSnapshot || draft.planningFrameSnapshot)?.actuallyPlannableUnits)}</span><span>Planungsversion: ${escapeHtml(draft.planningVersion)}</span><span>KI: ${escapeHtml(draft.provider)} / ${escapeHtml(draft.model)}</span><span>Validierung: ${escapeHtml(draft.validation?.status)}</span></div>
    ${(draft.validation?.errors || []).map((error) => `<p class="status-line status-error">${escapeHtml(error)}</p>`).join('')}
    <div class="course-plan-review-table" role="region" aria-label="Kursstruktur nach Tagen">${(draft.days || []).map((day) => `<details open><summary>Tag ${escapeHtml(day.dayNumber)}: ${escapeHtml(day.title)}</summary><div class="review-table-scroll"><table><thead><tr><th>UE</th><th>Zeit</th><th>Thema</th><th>Inhalt</th><th>Lernziel</th><th>Quelle</th><th>Herkunft</th><th>Confidence</th><th>Status</th></tr></thead><tbody>${(day.units || []).map((unit) => `<tr><td>${escapeHtml(unit.unitNumber)}</td><td>${escapeHtml(unit.startTime || '')}–${escapeHtml(unit.endTime || '')}</td><td><input data-structure-unit="${escapeHtml(unit.id)}" data-unit-field="topic" value="${escapeHtml(unit.topic)}"></td><td><textarea data-structure-unit="${escapeHtml(unit.id)}" data-unit-field="content">${escapeHtml(unit.content)}</textarea></td><td><textarea data-structure-unit="${escapeHtml(unit.id)}" data-unit-field="preliminaryLearningObjective">${escapeHtml(unit.preliminaryLearningObjective)}</textarea></td><td>${escapeHtml((unit.sourceReferences || []).map((ref) => ref.fileName || ref.documentId).join(', ') || '-')}</td><td><span class="status-badge origin-${escapeHtml(unit.originStatus)}">${escapeHtml(unit.originStatus)}</span></td><td>${escapeHtml(Math.round(Number(unit.confidence || 0) * 100))}%</td><td><select data-structure-unit="${escapeHtml(unit.id)}" data-unit-field="reviewStatus">${['open', 'reviewed', 'conflict'].map((value) => `<option value="${value}" ${unit.reviewStatus === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></td></tr><tr><td colspan="9"><details><summary>UE-Details und Materialbedarf</summary><p><strong>Voraussetzungen:</strong> ${escapeHtml((unit.prerequisites || []).map(formatAnalysisItem).join(', ') || 'keine angegeben')}</p><p><strong>Review-Hinweise:</strong> ${escapeHtml((unit.reviewItems || []).map(formatAnalysisItem).join(', ') || 'keine')}</p><label>Benutzerbemerkung<textarea data-structure-unit="${escapeHtml(unit.id)}" data-unit-field="notes">${escapeHtml(unit.notes || '')}</textarea></label>${renderAnalysisList('Vorgeschlagene Materialarten', unit.materialRequirements)}</details></td></tr>`).join('')}</tbody></table></div></details>`).join('')}</div>
    <div class="button-row"><button class="secondary-button" type="button" data-save-course-structure>Entwurf speichern</button><button class="primary-button" type="button" data-approve-course-structure ${draft.validation?.status === 'failed' ? 'disabled' : ''}>Kursstruktur freigeben und zur Didaktik wechseln</button></div>
  </article>`;
}

function normalizeDurationAndAudience(wizard) {
  const days = Math.max(1, Math.round(Number(wizard.duration.numberOfDays || 1)));
  const hoursPerDay = Math.max(0.5, Number(wizard.duration.hoursPerDay || 8));
  const uePerDay = Math.max(1, Math.round(Number(wizard.duration.uePerDay || 9)));
  wizard.duration = { ...wizard.duration, numberOfDays: days, hoursPerDay, uePerDay, totalHours: days * hoursPerDay, totalUE: days * uePerDay };
  delete wizard.duration.durationMode;
  wizard.targetAudience.difficultyMode = difficultyLevels.normalizeDifficulty(wizard.targetAudience.difficultyMode);
  return wizard;
}

function renderAnalysisStep(wizard) {
  return `
    <article class="tool-card" data-plan-step-content="analysis">
      <h3>Analyse</h3>
      <p class="status-line">Die Hauptquelle wird in einen Unterrichtsplan mit Tagen, Themen, Lernzielen und Quellenangaben übersetzt.</p>
      <p class="status-line">Die Container-Konfiguration steuert sichere Artefaktvorschlaege. Code, SQL und externe Tools werden nie automatisch ausgeführt.</p>
      <button class="primary-button" type="button" data-wizard-analyze ${wizard.anchorFiles.length ? '' : 'disabled'}>Curriculum analysieren</button>
      ${!wizard.anchorFiles.length ? '<p class="status-line status-warning">Analyse ist erst aktiv, wenn eine Hauptquelle vorhanden ist.</p>' : ''}
    </article>
  `;
}

function renderMaterialsStep(wizard) {
  return `
    <article class="tool-card" data-plan-step-content="materials">
      <h3>Materialien</h3>
      <p class="status-line">Optional: Ergaenze Aufgaben, Lösungen, Quiz, Projektdateien, Quellcode, SQL, Assets oder sonstige Dateien. ZIPs werden sicher gestaged.</p>
      <div class="factory-grid">
        ${uploadAreas.map(([area, label, accept, description]) => {
          const files = wizard.uploadFiles.filter((file) => file.uploadArea === area);
          return createDropZoneHtml({ id: area, title: label, description, accept, files, multiple: true, kind: 'upload' });
        }).join('')}
      </div>
      <button class="secondary-button" type="button" data-wizard-import ${wizard.uploadFiles.length ? '' : 'disabled'}>Uploads in Staging importieren</button>
      ${wizard.importBatch ? `<p class="status-line">Import-Batch: ${escapeHtml(wizard.importBatch.id)} (${wizard.importBatch.files.length} Datei(en))</p>` : ''}
    </article>
  `;
}

function renderAiModeStep(wizard) {
  return `
    <article class="tool-card" data-plan-step-content="aiMode">
      <h3>KI/Fallback</h3>
      <div class="factory-form-grid">
        <label>KI-Modus<select data-wizard-ai-mode>${['local', 'openai', 'openai-review', 'openai-review-repair'].map((mode) => `<option value="${mode}" ${wizard.aiMode === mode ? 'selected' : ''}>${escapeHtml(visibleLabel(mode))}</option>`).join('')}</select></label>
      </div>
      <div class="summary-grid">
        <span><strong>local</strong>: lokale heuristische Erstellung ohne API-Kosten</span>
        <span><strong>openai</strong>: OpenAI wird verwendet, wenn API-Key eingerichtet ist</span>
        <span><strong>openai-review</strong>: OpenAI plus interne Review-Prüfung</span>
        <span><strong>openai-review-repair</strong>: OpenAI plus Review und Reparaturversuch bei Schemafehlern</span>
      </div>
      <div class="summary-grid">
        <span>OpenAI konfiguriert: ${state.aiStatus?.providers?.openai?.configured ? 'ja' : 'nein'}</span>
        <span>Fallback aktiv: ja</span>
        <span>Auswahl: ${escapeHtml(wizard.aiMode || 'local')}</span>
        <span>Kostenabschaetzung: ${wizard.costEstimate ? `${escapeHtml(wizard.costEstimate.estimatedCostUsd)} USD` : '-'}</span>
      </div>
    </article>
    ${renderAiSettings(wizard)}
    ${renderPromptQualityGate(wizard)}
  `;
}

function renderGenerationStep(wizard) {
  const selectedDay = wizard.approvedCurriculumPlan?.days?.find((day) => day.dayNumber === Number(wizard.selectedDayNumber)) || wizard.approvedCurriculumPlan?.days?.[0];
  return `
    <article class="tool-card" data-plan-step-content="generation">
      <h3>Tagesentwürfe</h3>
      <div class="factory-form-grid">
        <label>Tag<select data-wizard-day>${(wizard.approvedCurriculumPlan?.days || []).map((day) => `<option value="${day.dayNumber}" ${Number(wizard.selectedDayNumber) === day.dayNumber ? 'selected' : ''}>Tag ${day.dayNumber}: ${escapeHtml(day.title)}</option>`).join('')}</select></label>
      </div>
      <button class="primary-button" type="button" data-wizard-generate-all ${selectedDay && wizard.approvedCurriculumPlan?.status === 'approved' ? '' : 'disabled'}>Alle Tage generieren</button>
      <button class="secondary-button" type="button" data-wizard-generate ${selectedDay && wizard.approvedCurriculumPlan?.status === 'approved' ? '' : 'disabled'}>Ausgewaehlten Tag neu generieren</button>
      ${!wizard.approvedCurriculumPlan ? '<p class="status-line status-warning">Tagesentwurf erst nach Freigabe des Unterrichtsplans möglich.</p>' : ''}
      ${wizard.dayResults.length ? `<p class="status-line">${wizard.dayResults.length} Tagesentwurf/Tagesentwürfe erzeugt.</p>` : ''}
      ${wizard.dayResults.length ? renderDayResultList(wizard.dayResults) : ''}
      ${wizard.dayDraft ? renderDayDraftPreview(wizard.dayDraft) : '<p class="status-line">Noch kein Tagesentwurf erzeugt.</p>'}
      <label>Korrekturhinweis<textarea data-wizard-corrections>${escapeHtml(wizard.corrections)}</textarea></label>
      <button class="secondary-button" type="button" data-wizard-revise ${wizard.dayDraft ? '' : 'disabled'}>Tagesentwurf mit Korrektur neu erzeugen</button>
      <button class="primary-button" type="button" data-wizard-create-draft ${wizard.dayResults.length || wizard.dayDraft ? '' : 'disabled'}>Dual-Mode-Container-Draft erzeugen</button>
      ${wizard.generatedDraft ? renderGeneratedDraft(wizard.generatedDraft) : ''}
    </article>
  `;
}

function renderContainerDraftStep(wizard) {
  return `
    <article class="tool-card" data-plan-step-content="containerDraft">
      <h3>Container-Draft</h3>
      <p class="status-line">Ein Kursentwurf kann lokal getestet und später veröffentlicht werden.</p>
      <button class="primary-button" type="button" data-wizard-create-draft ${wizard.dayResults.length || wizard.dayDraft ? '' : 'disabled'}>Dual-Mode-Container-Draft erzeugen</button>
      ${wizard.generatedDraft ? renderGeneratedDraft(wizard.generatedDraft) : '<p class="status-line">Noch kein Container-Draft erzeugt.</p>'}
    </article>
  `;
}

function renderDayDraftPreview(draft) {
  return `
    <div class="validation-box">
      <strong>${escapeHtml(draft.title)}</strong>
      <h4>Teilnehmer-Vorschau</h4>
      ${(draft.webvariant?.participantHtmlSections || []).map((section) => `<section><strong>${escapeHtml(section.title)}</strong>${section.content}</section>`).join('')}
      <h4>Aufgaben</h4><ul>${(draft.tasks || []).map((task) => `<li>${escapeHtml(task.title)}: ${escapeHtml(task.text)}</li>`).join('')}</ul>
      <h4>Quiz</h4><ul>${(draft.quiz || []).map((quiz) => `<li>${escapeHtml(quiz.text)}</li>`).join('')}</ul>
      <details><summary>Dozentenlösungen</summary><ul>${(draft.solutions || []).map((solution) => `<li>${escapeHtml(solution.title)}: ${escapeHtml(solution.text)}</li>`).join('')}</ul></details>
      ${(draft.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
    </div>
  `;
}

function renderContainerProfileStep(wizard) {
  const profile = wizard.containerProfile;
  const types = ['theory', 'html-css', 'java', 'java-maven', 'python', 'jupyter', 'sql', 'php-xampp', 'uml-pap', 'database-project', 'mixed-project'];
  const modes = ['web-only', 'files-only', 'web-and-files'];
  const presets = state.presets || [];
  return `
    <article class="tool-card">
      <h3>5. Container-Konfiguration</h3>
      <div class="factory-form-grid">
        <label>Preset<select data-wizard-preset><option value="">Kein Preset</option>${presets.map((preset) => `<option value="${escapeHtml(preset.id)}" ${wizard.selectedPresetId === preset.id ? 'selected' : ''}>${escapeHtml(preset.label || preset.id)}</option>`).join('')}</select></label>
        <label>Kurstyp<select data-container-profile="courseType">${types.map((value) => `<option value="${value}" ${profile.courseType === value ? 'selected' : ''}>${escapeHtml(visibleLabel(value))}</option>`).join('')}</select></label>
        <label>Art der Kursmaterialien<select data-container-profile="artifactMode">${modes.map((value) => `<option value="${value}" ${profile.artifactMode === value ? 'selected' : ''}>${escapeHtml(visibleLabel(value))}</option>`).join('')}</select></label>
      </div>
      <button class="secondary-button" type="button" data-apply-preset ${wizard.selectedPresetId ? '' : 'disabled'}>Preset anwenden</button>
      <small>Die Vorlage setzt Vorschläge; alle Werte bleiben manuell anpassbar.</small>
      <div class="summary-grid">
        ${Object.entries(containerProfileLabels).map(([key, label]) => `<label class="checkline"><input data-container-profile-check="${key}" type="checkbox" ${profile[key] ? 'checked' : ''}> <span>${escapeHtml(label)}</span></label>`).join('')}
        <label class="checkline"><input data-container-profile-check="generateRunScripts" type="checkbox" ${profile.generateRunScripts ? 'checked' : ''}> <span>Skripte zum Starten des Projekts erstellen</span></label>
        <label class="checkline"><input data-container-profile-check="allowExecutableTools" type="checkbox" ${profile.allowExecutableTools ? 'checked' : ''}> <span>Externe Werkzeuge für diesen Kurs erlauben</span></label>
        <label class="checkline"><input data-container-profile-check="allowDatabaseActions" type="checkbox" ${profile.allowDatabaseActions ? 'checked' : ''}> <span>Datenbankaktionen für diesen Kurs erlauben</span></label>
      </div>
      <p class="status-line status-warning">EXE/BAT/CMD/PS1 werden nie exportiert oder ausgeführt. SQL wird nur als Datei erzeugt.</p>
      <div class="button-row">
        <button class="secondary-button" type="button" data-profile-preset="java-maven">Maven-Projekt erzwingen</button>
        <button class="secondary-button" type="button" data-profile-preset="java">nur einfache Java-Dateien</button>
        <button class="secondary-button" type="button" data-profile-preset="uml-pap">Diagramm hinzufügen</button>
        <button class="secondary-button" type="button" data-profile-preset="sql">SQL-Skripte hinzufügen</button>
        <button class="secondary-button" type="button" data-profile-preset="jupyter">Jupyter hinzufügen</button>
      </div>
      ${wizard.curriculumDraft ? renderArtifactSuggestionPreview(wizard) : '<small>Vorschläge für Kursmaterialien erscheinen nach der Analyse des Unterrichtsplans.</small>'}
    </article>
  `;
}

function getSelectedDidacticProfile() {
  if (state.wizard.didacticProfile?.customized) return state.wizard.didacticProfile;
  const selectedId = state.wizard.didacticProfile?.id || 'explain-demo-practice';
  return (state.didacticProfiles || []).find((profile) => profile.id === selectedId)
    || (state.didacticProfiles || [])[0]
    || state.wizard.didacticProfile
    || { id: 'explain-demo-practice', label: 'Erklären, zeigen und üben', lessonFlow: [] };
}

function renderDidacticProfileStep(wizard) {
  const profiles = state.didacticProfiles || [];
  const selected = getSelectedDidacticProfile();
  const profile = selected || {};
  const recommendation = wizard.didacticRecommendation;
  const preview = wizard.didacticPreview;
  const fit = recommendation?.recommended?.fit;
  const scoreClass = fit?.level === 'weak' ? 'status-error' : fit?.level === 'usable' ? 'status-warning' : '';
  const options = {
    demoStrategy: ['none', 'teacher-demo', 'live-coding', 'error-demo', 'worked-example', 'before-after'],
    releaseStrategy: ['manual-by-teacher', 'after-quiz', 'after-analysis', 'after-previous-task', 'station-wise'],
    taskProgression: ['normal-to-hard', 'easy-normal-hard', 'worked-guided-faded-free', 'analysis-correction-transfer', 'stations-easy-to-challenge', 'timed-normal-to-hard', 'project-increment', 'code-along-extension'],
    supportLevel: ['step-by-step', 'guided', 'coaching', 'self-directed', 'exam-focused', 'high-to-low']
  };
  return `
    <article class="tool-card">
      <h3>4. Didaktisches Kursprofil</h3>
      ${fit ? `<p class="status-line ${scoreClass}">Empfohlen: ${escapeHtml(recommendation.recommended.profile?.label || '-')} | Fit Score ${escapeHtml(fit.score)} (${escapeHtml(fit.level)})</p>` : '<p class="status-line">Empfehlung wird nach Kursdaten berechnet.</p>'}
      <div class="factory-form-grid">
        <label>Profil<select data-wizard-didactic-profile>
          ${profiles.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === profile.id ? 'selected' : ''}>${escapeHtml(item.label || item.id)}</option>`).join('')}
        </select></label>
        <label>Unterrichtsmodell<input value="${escapeHtml(profile.teachingModel || '-')}" readonly></label>
        <label>Art der Demonstration<select data-didactic-field="demoStrategy">${options.demoStrategy.map((value) => `<option value="${value}" ${profile.demoStrategy === value ? 'selected' : ''}>${escapeHtml(visibleLabel(value))}</option>`).join('')}</select></label>
        <label>Freigabe<select data-didactic-field="releaseStrategy">${options.releaseStrategy.map((value) => `<option value="${value}" ${profile.releaseStrategy === value ? 'selected' : ''}>${escapeHtml(visibleLabel(value))}</option>`).join('')}</select></label>
        <label>Progression<select data-didactic-field="taskProgression">${options.taskProgression.map((value) => `<option value="${value}" ${profile.taskProgression === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Unterstützung<select data-didactic-field="supportLevel">${options.supportLevel.map((value) => `<option value="${value}" ${profile.supportLevel === value ? 'selected' : ''}>${escapeHtml(visibleLabel(value))}</option>`).join('')}</select></label>
        <label>Assessment<input data-didactic-field="assessmentMode" value="${escapeHtml(profile.assessmentMode || '')}"></label>
        <label>Reflexion<input data-didactic-field="reflectionMode" value="${escapeHtml(profile.reflectionMode || '')}"></label>
        <label>Sozialform<input data-didactic-field="socialForm" value="${escapeHtml(profile.socialForm || '')}"></label>
      </div>
      <label class="checkline"><input data-didactic-check="defaultDemoEnabled" type="checkbox" ${profile.defaultDemoEnabled !== false ? 'checked' : ''}> <span>Demonstrationen standardmäßig erstellen</span></label>
      <label class="checkline"><input data-didactic-check="defaultParticipantDemoVisible" type="checkbox" ${profile.defaultParticipantDemoVisible === true ? 'checked' : ''}> <span>Demonstrationen für Teilnehmende anzeigen</span></label>
      <label class="checkline"><input data-wizard-audience-check="needsStepByStep" type="checkbox" ${wizard.targetAudience.needsStepByStep ? 'checked' : ''}> <span>Schrittweise Unterstützung vorsehen</span></label>
      <label class="checkline"><input data-wizard-audience-check="examOrientation" type="checkbox" ${wizard.targetAudience.examOrientation ? 'checked' : ''}> <span>Prüfungsorientierung berücksichtigen</span></label>
      <label class="checkline"><input data-wizard-audience-check="projectOrientation" type="checkbox" ${wizard.targetAudience.projectOrientation ? 'checked' : ''}> <span>Projektorientierung berücksichtigen</span></label>
      <div class="validation-box">
        <strong>${escapeHtml(profile.label || profile.id)}</strong>
        <p>${escapeHtml(profile.description || '')}</p>
        <div class="summary-grid">
          <span>Progression: ${escapeHtml(profile.taskProgression || '-')}</span>
          <span>Support: ${escapeHtml(profile.supportLevel || '-')}</span>
          <span>Assessment: ${escapeHtml(profile.assessmentMode || '-')}</span>
          <span>Reflexion: ${escapeHtml(profile.reflectionMode || '-')}</span>
        </div>
        <small>Lesson Flow: ${(profile.lessonFlow || []).map((phase) => escapeHtml(phase)).join(' -> ') || '-'}</small>
      </div>
      ${recommendation ? `<div class="validation-box"><strong>Warum empfohlen?</strong>${(recommendation.recommended.fit?.reasons || []).slice(0, 4).map((item) => `<p>${escapeHtml(item)}</p>`).join('')}${(recommendation.warnings || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}<strong>Alternative Profile</strong><ul>${(recommendation.alternatives || []).slice(0, 4).map((item) => `<li>${escapeHtml(item.profile?.label || item.profile?.id)} (${escapeHtml(item.score)}): ${escapeHtml(item.reason)}</li>`).join('')}</ul></div>` : ''}
      ${preview ? `<div class="validation-box"><strong>Was wird dieses Profil erzeugen?</strong><p>Demo: ${escapeHtml(preview.demoType)} | Assessment: ${escapeHtml(preview.assessment)} | Reflexion: ${escapeHtml(preview.reflection?.mode || '-')}</p><p>Unterricht: ${(preview.expectedDayFlow || []).map((item) => escapeHtml(item.title)).join(' -> ')}</p><p>Aufgaben: ${(preview.taskTypes || []).map((item) => escapeHtml(item)).join(' | ')}</p><p>Freigabe: ${(preview.releasePlan || []).slice(0, 3).map((item) => escapeHtml(item.releaseHint)).join(' | ')}</p>${(preview.risks || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}</div>` : ''}
      <div class="button-row">
        <button class="secondary-button" type="button" data-didactic-refresh>Empfehlung neu berechnen</button>
        <button class="primary-button" type="button" data-didactic-apply-recommendation ${recommendation?.recommended?.profile?.id ? '' : 'disabled'}>Empfehlung übernehmen</button>
      </div>
      <p class="status-line">Das Profil steuert Tagesaufbau, Aufgabenfolge, Vorschläge für Demonstrationen, Dozentenhinweise und Freigaben.</p>
    </article>
  `;
}

function renderPreflightTestRun(wizard) {
  const preflight = wizard.preflight;
  const testRun = wizard.testRun;
  const storage = state.storageUsage || {};
  const canPreflight = Boolean(wizard.course.courseName && wizard.course.courseId && wizard.approvedCurriculumPlan?.status === 'approved');
  const canTest = canPreflight && (wizard.dayResults.length || wizard.dayDraft || wizard.approvedCurriculumPlan?.days?.length);
  return `
    <article class="tool-card">
      <h3>13. Testlauf / Preflight</h3>
      <div class="summary-grid">
        <span>Preflight: ${escapeHtml(preflight?.status || 'offen')}</span>
        <span>Score: ${escapeHtml(preflight?.score ?? '-')}</span>
        <span>Staging: ${formatBytes(storage.stagingBytes || 0)}</span>
        <span>Drafts: ${formatBytes(storage.draftsBytes || 0)}</span>
        <span>Referenzen: ${formatBytes(storage.referenceLibraryBytes || 0)}</span>
      </div>
      ${preflight ? renderPreflightResult(preflight) : '<p class="status-line">Prüft Kursdaten, freigegebenen Unterrichtsplan, Profil, lokalen Ersatzmodus und Exportschutz.</p>'}
      ${testRun ? renderTestRunResult(testRun) : ''}
      ${wizard.cleanupReport ? `<p class="status-line">${escapeHtml(wizard.cleanupReport.action)}: ${(wizard.cleanupReport.deleted || []).length} gelöscht.</p>` : ''}
      <div class="button-row">
        <button class="secondary-button" type="button" data-wizard-preflight ${canPreflight ? '' : 'disabled'}>Preflight prüfen</button>
        <button class="primary-button" type="button" data-wizard-test-run ${canTest ? '' : 'disabled'}>Testlauf erzeugen</button>
        <button class="secondary-button" type="button" data-wizard-test-run-confirm ${preflight?.status === 'yellow' && canTest ? '' : 'disabled'}>Testlauf trotz Warnungen</button>
        <button class="secondary-button" type="button" data-wizard-delete-last-test>Letzten Test-Draft loeschen</button>
        <button class="secondary-button" type="button" data-wizard-clear-staging>Staging leeren</button>
      </div>
    </article>
  `;
}

function renderPreflightResult(preflight) {
  const css = preflight.status === 'red' ? 'status-error' : preflight.status === 'yellow' ? 'status-warning' : '';
  return `
    <div class="validation-box">
      <strong class="${css}">Preflight ${escapeHtml(preflight.status)} (${escapeHtml(preflight.score)}/100)</strong>
      ${(preflight.errors || []).map((item) => `<p class="status-line status-error">${escapeHtml(item)}</p>`).join('')}
      ${(preflight.warnings || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}
      ${(preflight.recommendations || []).slice(0, 4).map((item) => `<p class="status-line">${escapeHtml(item)}</p>`).join('')}
    </div>
  `;
}

function renderTestRunResult(result) {
  const css = result.status === 'failed' ? 'status-error' : result.status === 'warning' ? 'status-warning' : '';
  return `
    <div class="validation-box">
      <strong class="${css}">Testlauf: ${escapeHtml(result.status)}</strong>
      ${result.requiresConfirmation ? '<p class="status-line status-warning">Warnungen müssen für den Testlauf bestätigt werden.</p>' : ''}
      ${result.containerId ? `<p>Container: ${escapeHtml(result.containerId)}</p><p>Pfad: ${escapeHtml(result.storagePath)}</p>` : ''}
      ${result.testProtocol ? renderTestProtocolSummary(result.testProtocol) : ''}
      ${(result.errors || []).map((item) => `<p class="status-line status-error">${escapeHtml(item)}</p>`).join('')}
      ${(result.warnings || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}
    </div>
  `;
}

function renderPromptQualityGate(wizard) {
  const quality = wizard.promptQuality;
  const golden = state.goldenPromptResult;
  return `
    <article class="tool-card">
      <h3>Prompt-Präzision</h3>
      <div class="summary-grid">
        <span>Zweck: ${escapeHtml(quality?.purpose || 'generateDayDraft')}</span>
        <span>Prompt: ${escapeHtml(quality?.promptId || '-')}</span>
        <span>Version: ${escapeHtml(quality?.promptVersion || '-')}</span>
        <span>Schema: ${escapeHtml(quality?.expectedSchema || 'DayGenerationResult')}</span>
        <span>Prompt Score: ${escapeHtml(quality?.totalScore ?? quality?.score ?? '-')}</span>
        <span>Safety Score: ${escapeHtml(quality?.safetyScore ?? '-')}</span>
        <span>Didaktik Score: ${escapeHtml(quality?.didacticScore ?? '-')}</span>
        <span>Artefakt Score: ${escapeHtml(quality?.artifactScore ?? '-')}</span>
        <span>Status: ${escapeHtml(quality?.status || 'offen')}</span>
        <span>Golden Tests: ${escapeHtml(golden ? `${golden.status} (${golden.passed}/${golden.total})` : '-')}</span>
        <span>Provider erlaubt: ${quality ? (quality.maySendToProvider ? 'ja' : 'nein') : '-'}</span>
      </div>
      ${(quality?.errors || []).map((item) => `<p class="status-line status-error">${escapeHtml(item)}</p>`).join('')}
      ${(quality?.warnings || []).map((item) => `<p class="status-line status-warning">${escapeHtml(item)}</p>`).join('')}
      ${wizard.promptRulesVisible && quality?.rules ? `<div class="validation-box"><strong>Prompt-Regeln</strong><ul>${quality.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul></div>` : ''}
      <div class="button-row">
        <button class="secondary-button" type="button" data-prompt-preview>Prompt-Vorschau anzeigen</button>
        <button class="secondary-button" type="button" data-prompt-quality>Prompt prüfen</button>
        <button class="secondary-button" type="button" data-prompt-golden>Golden Tests ausfuehren</button>
        <button class="secondary-button" type="button" data-prompt-rules>Prompt-Regeln anzeigen</button>
      </div>
    </article>
  `;
}

function renderAiSettings(wizard) {
  const openai = state.aiStatus?.providers?.openai || {};
  const estimate = wizard.costEstimate;
  const test = state.aiTestResult;
  const adminStore = state.aiStatus?.adminKeyStore || {};
  const importResult = state.aiImportResult;
  return `
    <article class="tool-card">
      <h3>KI-Einstellungen</h3>
      <div class="factory-form-grid">
        <label>Provider-Auswahl<select data-wizard-ai-mode-settings>${['local', 'openai', 'openai-review', 'openai-review-repair'].map((mode) => `<option value="${mode}" ${wizard.aiMode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>
        <label>Modellfeld<input data-ai-model value="${escapeHtml(openai.model || adminStore.model || 'gpt-5.4-mini')}"></label>
        <label>Kostenwarnung USD<input data-ai-cost-warning type="number" min="0" step="0.01" value="${escapeHtml(state.aiStatus?.costWarningUsd || 1)}" disabled></label>
      </div>
      <div class="summary-grid">
        <span>Provider: ${escapeHtml(state.aiStatus?.defaultProvider || wizard.aiMode || 'local')}</span>
        <span>OpenAI konfiguriert: ${openai.configured ? 'ja' : 'nein'}</span>
        <span>Modell: ${escapeHtml(openai.model || '-')}</span>
        <span>Key-Quelle: ${escapeHtml(openai.keySource || 'missing')}</span>
        <span>Verbindungstest: ${escapeHtml(openai.connectionTestStatus || adminStore.connectionTestStatus || 'unknown')}</span>
        <span>Windows-Verschlüsselung: ${adminStore.encryptionAvailable ? 'verfügbar' : 'nicht verfügbar'}</span>
        <span>Zuletzt erfolgreich getestet: ${escapeHtml(adminStore.lastSuccessfulTestAt || '-')}</span>
        <span>Timeout: ${escapeHtml(state.aiStatus?.timeoutMs || 30000)} ms</span>
        <span>Local/Fallback aktiv: ja</span>
        <span>Kostenwarnung: ${state.aiStatus?.costWarningUsd ? 'ja' : 'nein'}</span>
      </div>
      ${estimate ? `<p class="status-line ${estimate.warning ? 'status-warning' : ''}">Geschätzte Kosten: ca. ${escapeHtml(estimate.estimatedCostUsd)} USD | Eingabe ${escapeHtml(estimate.inputTokens)} Token | Ausgabe ${escapeHtml(estimate.outputTokens)} Token</p>` : ''}
      ${test ? `<p class="status-line ${test.status === 'failed' ? 'status-error' : test.status === 'warning' ? 'status-warning' : ''}">Testanfrage: ${escapeHtml(test.status)} - ${escapeHtml(test.message)}</p>` : ''}
      ${importResult ? `<p class="status-line ${importResult.success === false ? 'status-error' : ''}">${escapeHtml(importResult.message || importResult.status || '')}</p>` : ''}
      <div class="button-row">
        <button class="secondary-button" type="button" data-ai-status-check>KI-Status prüfen</button>
        <button class="secondary-button" type="button" data-ai-model-save>Modell speichern</button>
        <button class="secondary-button" type="button" data-ai-import-select>API-Schlüssel aus Datei importieren</button>
        <button class="secondary-button" type="button" data-ai-replace-key>API-Schlüssel eingeben/ersetzen</button>
        <button class="secondary-button" type="button" data-ai-test-request>Verbindung testen</button>
        <button class="secondary-button" type="button" data-ai-clear-key>Gespeicherten Schlüssel entfernen</button>
        <button class="secondary-button" type="button" data-ai-setup-guide>Setup-Anleitung öffnen</button>
      </div>
    </article>
  `;
}

function renderArtifactSuggestionPreview(wizard) {
  const topics = (wizard.curriculumDraft?.days || []).flatMap((day) => (day.topics || []).slice(0, 2).map((topic) => ({ dayNumber: day.dayNumber, title: topic.title }))).slice(0, 8);
  return `<div class="validation-box"><strong>Vorschläge für Kursmaterialien prüfen</strong>${topics.map((topic) => `<p>Tag ${escapeHtml(topic.dayNumber)} - ${escapeHtml(topic.title)}: ${escapeHtml(visibleLabel(wizard.containerProfile.courseType))} / ${escapeHtml(visibleLabel(wizard.containerProfile.artifactMode))}</p>`).join('')}<small>Details, Zielpfade und Begründungen werden im Analysebericht dokumentiert. Sichere Voreinstellungen werden verwendet, wenn nichts manuell geändert wird.</small></div>`;
}

function renderDayResultList(results) {
  return `
    <div class="summary-grid">
      ${results.map((result) => {
        const hasFallback = (result.warnings || []).some((warning) => /Fallback|nicht konfiguriert/i.test(warning));
        const status = hasFallback ? 'fallback' : (result.warnings || []).length ? 'warning' : 'generated';
        return `<button class="secondary-button" type="button" data-preview-day="${result.dayNumber}">Tag ${escapeHtml(result.dayNumber)}: ${escapeHtml(status)}</button>`;
      }).join('')}
    </div>
  `;
}

function renderCurriculumReview(draft) {
  const quality = draft.quality || { score: 0, level: 'weak', recommendations: [] };
  const totalTopics = (draft.days || []).reduce((sum, day) => sum + (day.topics || []).length, 0);
  const totalUE = (draft.days || []).reduce((sum, day) => sum + Number(day.estimatedUE || 0), 0);
  const sourceQualities = Array.from(new Map((draft.extractedSourceOutline || []).map((item) => [item.sourceFile || item.sourceRef, item.quality]).filter((item) => item[1])).entries());
  return `
    <article class="tool-card">
      <h3>6-7. Curriculum prüfen und freigeben</h3>
      <div class="summary-grid">
        <span>Status: ${escapeHtml(draft.status)}</span>
        <span>Tage: ${escapeHtml(draft.days?.length || 0)}</span>
        <span>Themen: ${escapeHtml(totalTopics)}</span>
        <span>Gesamt-UE: ${escapeHtml(totalUE)}</span>
        <span>Anchor: ${escapeHtml(draft.anchor?.type || '')}</span>
        <span>Dauer: ${escapeHtml(draft.duration?.totalUE || 0)} UE</span>
      </div>
      <div class="validation-box">
        <strong>Quality Score: ${escapeHtml(quality.score)} / 100 (${escapeHtml(quality.level)})</strong>
        ${(quality.recommendations || []).slice(0, 5).map((item) => `<p class="status-line ${quality.level === 'weak' ? 'status-error' : 'status-warning'}">${escapeHtml(item)}</p>`).join('')}
        ${sourceQualities.length ? `<small>Extraktion: ${sourceQualities.map(([file, item]) => `${escapeHtml(file)} ${escapeHtml(item.level)} (${escapeHtml(Math.round(item.score * 100))}%)`).join(' | ')}</small>` : ''}
      </div>
      ${(draft.validation?.errors || []).map((error) => `<p class="status-line status-error">${escapeHtml(error)}</p>`).join('')}
      ${(draft.validation?.warnings || draft.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
      <div class="factory-grid curriculum-board">
        ${(draft.days || []).map((day) => `
          <section class="factory-card curriculum-day" data-curriculum-day="${day.dayNumber}">
            <strong>Tag ${day.dayNumber}: ${escapeHtml(day.mainTopic || day.title)}</strong>
            <small>${escapeHtml(day.estimatedUE || 0)} UE | ${(day.topics || []).length} Thema/Themen</small>
            <label>Tagesname<input data-day-field="${day.dayNumber}" data-day-prop="title" value="${escapeHtml(day.title || '')}"></label>
            <label>Tagesziel<textarea data-day-field="${day.dayNumber}" data-day-prop="learningGoal">${escapeHtml((day.learningGoals || [])[0] || '')}</textarea></label>
            ${(day.warnings || []).map((warning) => `<p class="status-line status-warning">${escapeHtml(warning)}</p>`).join('')}
            ${(day.topics || []).map((topic) => `
              <article class="mapping-item curriculum-topic" draggable="true" data-topic-id="${escapeHtml(topic.id)}">
                <strong>${escapeHtml(topic.title)}</strong>
                <label>Titel<input data-topic-field="${escapeHtml(topic.id)}" data-topic-prop="title" value="${escapeHtml(topic.title)}"></label>
                <label>Summary<textarea data-topic-field="${escapeHtml(topic.id)}" data-topic-prop="summary">${escapeHtml(topic.summary)}</textarea></label>
                <label>UE<input data-topic-field="${escapeHtml(topic.id)}" data-topic-prop="estimatedUE" type="number" min="0" value="${escapeHtml(topic.estimatedUE)}"></label>
                <label>Schwierigkeit<select data-topic-field="${escapeHtml(topic.id)}" data-topic-prop="difficulty">${difficultyLevels.levels.map(({ value, label }) => `<option value="${value}" ${difficultyLevels.normalizeDifficulty(topic.difficulty) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
                <label class="checkline"><input data-topic-field="${escapeHtml(topic.id)}" data-topic-prop="active" type="checkbox" ${topic.active !== false ? 'checked' : ''}> aktiv</label>
                <small>${escapeHtml(topic.depth)} | ${escapeHtml(topic.practiceType)}</small>
                <div class="button-row">
                  <button class="secondary-button" type="button" data-topic-move="${escapeHtml(topic.id)}" data-target-day="${Math.max(1, day.dayNumber - 1)}">Tag -</button>
                  <button class="secondary-button" type="button" data-topic-move="${escapeHtml(topic.id)}" data-target-day="${day.dayNumber + 1}">Tag +</button>
                  <button class="secondary-button" type="button" data-topic-duplicate="${escapeHtml(topic.id)}">duplizieren</button>
                  <button class="secondary-button" type="button" data-topic-new-after="${escapeHtml(topic.id)}">neues Thema darunter</button>
                </div>
              </article>
            `).join('')}
            <button class="secondary-button" type="button" data-day-new-topic="${day.dayNumber}">Neues Thema</button>
          </section>
        `).join('')}
      </div>
      <button class="primary-button" type="button" data-wizard-approve ${draft.validation?.canApprove === false ? 'disabled' : ''}>Plan freigeben</button>
      <button class="secondary-button" type="button" data-day-add>Tag hinzufügen</button>
      <button class="secondary-button" type="button" data-day-remove ${draft.days?.length > 1 ? '' : 'disabled'}>Letzten Tag loeschen</button>
    </article>
  `;
}

function renderGeneratedDraft(draft) {
  return `
    <div class="validation-box">
      <strong>Draft erzeugt: ${escapeHtml(draft.containerId)}</strong>
      <p>Pfad: ${escapeHtml(draft.storagePath)}</p>
      <dl class="factory-meta">
        <div><dt>Tage</dt><dd>${escapeHtml(draft.analysisReport?.recognizedDays || 0)}</dd></div>
        <div><dt>Warnungen</dt><dd>${escapeHtml((draft.analysisReport?.warnings || []).length)}</dd></div>
        <div><dt>Validierung</dt><dd>${draft.validation?.isValid ? 'ok' : 'prüfen'}</dd></div>
        <div><dt>Testprotokoll</dt><dd>${escapeHtml(draft.testProtocol?.overallStatus || draft.analysisReport?.testProtocol?.overallStatus || 'offen')}</dd></div>
      </dl>
      ${renderTestProtocolSummary(draft.testProtocol || draft.analysisReport?.testProtocol)}
      ${renderDemoSummary(draft)}
      <div class="button-row">
        <button class="secondary-button" type="button" data-wizard-open="standalone">Standalone öffnen</button>
        <button class="secondary-button" type="button" data-wizard-open="folder">Ordner öffnen</button>
        <button class="secondary-button" type="button" data-wizard-open="report">Analysebericht öffnen</button>
        <button class="secondary-button" type="button" data-wizard-open="test-protocol">Testprotokoll öffnen</button>
      </div>
    </div>
  `;
}

function renderDemoSummary(draft) {
  const demos = draft.analysisReport?.demoTargets || [];
  if (!demos.length) return '<p class="status-line">Demo-Dateien: keine erzeugt.</p>';
  return `
    <section class="mapping-list">
      <strong>Demo-Dateien</strong>
      ${demos.map((demo) => `
        <article class="mapping-item">
          <span>${escapeHtml(demo.title)}</span>
          <small>${escapeHtml(demo.tool)} | ${escapeHtml(demo.filePath)} | Teilnehmer: ${demo.visibleForParticipants ? 'ja' : 'nein'}</small>
          <button class="secondary-button" type="button" data-demo-test="${escapeHtml(demo.id)}">Demo testen</button>
        </article>
      `).join('')}
    </section>
  `;
}

function renderTestProtocolSummary(protocol) {
  const summary = protocol?.summary || {};
  if (!protocol) return '<p class="status-line">Testprotokoll wird beim nächsten Draft/Testlauf erzeugt.</p>';
  return `<p class="status-line">Testprotokoll: ${escapeHtml(protocol.overallStatus || 'offen')} | passed ${escapeHtml(summary.passed || 0)} | warning ${escapeHtml(summary.warnings || 0)} | failed ${escapeHtml(summary.failed || 0)} | manuell ${escapeHtml(summary.manualChecks || 0)}</p>`;
}

function getPlanWizardStepGates() {
  const wizard = state.wizard;
  const courseDone = Boolean(wizard.course.courseName && wizard.course.courseId && wizard.course.department);
  const anchorDone = Boolean(wizard.anchorFiles.length);
  const documentAnalysisDone = Boolean(wizard.courseProject?.documentAnalyses?.length);
  const durationDone = Boolean(wizard.targetAudience.priorKnowledge && wizard.targetAudience.learningLevel && wizard.targetAudience.difficultyMode && Number(wizard.duration.numberOfDays) > 0 && Number(wizard.duration.hoursPerDay) > 0 && Number(wizard.duration.uePerDay) > 0);
  const didacticDone = Boolean(getSelectedDidacticProfile()?.id || wizard.didacticProfile?.id);
  const containerProfileDone = Boolean(wizard.containerProfile?.courseType && wizard.containerProfile?.artifactMode);
  const curriculumDone = Boolean(wizard.curriculumDraft?.days?.length);
  const structureDone = Boolean(wizard.courseProject?.coursePlanDrafts?.length);
  const approvedDone = wizard.courseProject?.approvedCoursePlan?.status === 'approved' || wizard.approvedCurriculumPlan?.status === 'approved';
  const materialsDone = Boolean(wizard.uploadFiles.length || wizard.skippedSteps?.materials);
  const aiDone = Boolean(wizard.aiMode);
  const generationDone = Boolean(wizard.dayResults.length || wizard.dayDraft);
  const preflightDone = Boolean(wizard.preflight || wizard.testRun);
  const draftDone = Boolean(wizard.generatedDraft);
  return planWizardSteps.map((step) => {
    const gate = { ...step, active: false, done: false, missing: '' };
    if (step.id === 'course') return { ...gate, active: true, done: courseDone, missing: 'Kursname, Kurs-ID und Fachbereich eintragen.' };
    if (step.id === 'anchor') return { ...gate, active: courseDone, done: anchorDone, missing: 'Bitte zuerst Kursdaten vervollständigen.' };
    if (step.id === 'durationAudience') return { ...gate, active: anchorDone, done: durationDone && wizard.courseProject?.structureFrame?.valid, missing: 'Bitte zuerst mindestens ein Dokument hochladen.' };
    if (step.id === 'courseStructure') return { ...gate, active: anchorDone && wizard.courseProject?.structureFrame?.valid, done: documentAnalysisDone && structureDone, missing: 'Bitte Dokumente hochladen sowie Dauer und Zielgruppe vollständig bestätigen.' };
    if (step.id === 'structureReview') return { ...gate, active: structureDone, done: approvedDone, missing: 'Bitte zuerst eine KI-Kursstruktur erstellen.' };
    if (step.id === 'didactics') return { ...gate, active: approvedDone, done: didacticDone, missing: 'Bitte zuerst die Kursstruktur prüfen und ausdrücklich freigeben.' };
    if (step.id === 'containerProfile') return { ...gate, active: didacticDone, done: containerProfileDone, missing: 'Bitte zuerst ein didaktisches Profil auswählen.' };
    if (step.id === 'materials') return { ...gate, active: approvedDone, done: materialsDone, missing: 'Bitte zuerst das Curriculum freigeben.' };
    if (step.id === 'aiMode') return { ...gate, active: approvedDone, done: aiDone, missing: 'Bitte zuerst das Curriculum freigeben.' };
    if (step.id === 'generation') return { ...gate, active: approvedDone, done: generationDone, missing: 'Bitte zuerst das Curriculum freigeben.' };
    if (step.id === 'preflight') return { ...gate, active: generationDone, done: preflightDone, missing: 'Bitte zuerst Tagesentwürfe erzeugen.' };
    if (step.id === 'containerDraft') return { ...gate, active: preflightDone || generationDone, done: draftDone, missing: 'Bitte zuerst Preflight/Testlauf oder Tagesentwurf erzeugen.' };
    return gate;
  });
}

function getWizardGates() {
  const wizard = state.wizard;
  const courseDone = Boolean(wizard.course.courseName && wizard.course.courseId && wizard.course.department);
  const anchorDone = Boolean(wizard.anchorFiles.length);
  const curriculumDone = Boolean(wizard.curriculumDraft?.days?.length);
  const approvedDone = wizard.approvedCurriculumPlan?.status === 'approved';
  const draftDone = Boolean(wizard.dayDraft || wizard.dayResults.length);
  const containerDone = Boolean(wizard.generatedDraft);
  const didacticDone = Boolean(getSelectedDidacticProfile()?.id);
  return [
    { label: 'Kursdaten', done: courseDone, active: !courseDone },
    { label: 'Hauptquelle', done: anchorDone, active: courseDone && !anchorDone },
    { label: 'Didaktik', done: didacticDone, active: courseDone },
    { label: 'Curriculum', done: curriculumDone, active: anchorDone && !curriculumDone },
    { label: 'Freigabe', done: approvedDone, active: curriculumDone && !approvedDone },
    { label: 'Uploads/Referenzen', done: Boolean(wizard.importBatch || wizard.uploadFiles.length || wizard.useReferences), active: approvedDone },
    { label: 'KI/Fallback', done: draftDone, active: approvedDone && !draftDone },
    { label: 'Draft/Standalone', done: containerDone, active: draftDone && !containerDone }
  ];
}

function bindPlanWizardEvents() {
  $all('[data-plan-step]').forEach((button) => button.addEventListener('click', () => {
    const gates = getPlanWizardStepGates();
    const gate = gates.find((item) => item.id === button.dataset.planStep);
    if (!gate?.active) {
      state.wizard.status = `Dieser Schritt ist noch gesperrt. Bitte zuerst: ${gate?.missing || 'vorherige Schritte abschließen.'}`;
      renderPlanWizard();
      return;
    }
    state.wizard.activeStep = gate.id;
    state.wizard.status = '';
    renderPlanWizard();
  }));
  $('[data-wizard-prev]')?.addEventListener('click', () => moveWizardStep(-1));
  $('[data-wizard-next]')?.addEventListener('click', () => moveWizardStep(1));
  $('[data-wizard-skip-step]')?.addEventListener('click', () => {
    state.wizard.skippedSteps[state.wizard.activeStep] = true;
    state.wizard.status = 'Optionaler Schritt uebersprungen.';
    moveWizardStep(1);
  });
  $all('[data-wizard-course]').forEach((field) => field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', () => {
    state.wizard.course[field.dataset.wizardCourse] = field.value;
    state.wizard.targetAudience.department = state.wizard.course.department || state.wizard.targetAudience.department;
    if (field.dataset.wizardCourse === 'courseName' && !state.wizard.course.courseId) {
      state.wizard.course.courseId = field.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (field.tagName === 'SELECT') renderPlanWizard();
  }));
  $('[data-open-course-project]')?.addEventListener('change', openSavedCourseProject);
  $all('[data-wizard-anchor-type]').forEach((field) => field.addEventListener('change', (event) => {
    const type = event.target.value;
    const selected = getAnchorTypes();
    if (!event.target.checked) {
      const related = state.wizard.anchorFiles.filter((file) => (file.sourceType || getSourceTypeForFile(file)) === type);
      if (related.length) {
        const remove = window.confirm(`${related.length} Datei(en) gehören zu dieser Quellenart. OK entfernt die Dateien; Abbrechen behält Auswahl und Dateien.`);
        if (!remove) { renderPlanWizard(); return; }
        state.wizard.anchorFiles = state.wizard.anchorFiles.filter((file) => (file.sourceType || getSourceTypeForFile(file)) !== type);
      }
    }
    const next = event.target.checked ? [...selected, type] : selected.filter((item) => item !== type);
    if (!next.length) {
      state.wizard.status = 'Bitte mindestens eine Art der Hauptquelle auswählen.';
      renderPlanWizard();
      return;
    }
    state.wizard.anchorTypes = normalizeAnchorTypes(next);
    state.wizard.curriculumDraft = null;
    state.wizard.approvedCurriculumPlan = null;
    renderPlanWizard();
  }));
  $('[data-wizard-anchor-files]')?.addEventListener('change', (event) => {
    handleDropZoneFiles('anchor', event.target.files, 'picker');
    event.target.value = '';
    renderPlanWizard();
  });
  $('[data-document-analyze]')?.addEventListener('click', analyzeWizardDocuments);
  $('[data-close-wizard-error]')?.addEventListener('click', () => { state.wizard.uiError = null; renderPlanWizard(); });
  $('[data-retry-wizard-error]')?.addEventListener('click', () => { const retry = state.wizard.uiError?.retry; state.wizard.uiError = null; if (retry) retry(); });
  $('[data-document-analysis-cancel]')?.addEventListener('click', cancelWizardDocumentAnalysis);
  $all('[data-structure-frame]').forEach((field) => field.addEventListener('input', () => {
    state.wizard.structureFrame[field.dataset.structureFrame] = field.type === 'number' ? Number(field.value) : field.value;
    state.wizard.structureFrame.totalUnits = Number(state.wizard.structureFrame.totalDays || 0) * Number(state.wizard.structureFrame.unitsPerDay || 0);
    const total = $('[data-course-scope-total]');
    if (total) total.value = state.wizard.structureFrame.totalUnits;
  }));
  $all('[data-course-scope-selection]').forEach((field) => field.addEventListener('change', () => {
    const key = field.dataset.courseScopeSelection;
    const options = key === 'targetAudience' ? targetAudienceOptions : priorKnowledgeOptions;
    const selected = options.find((option) => option.value === field.value);
    state.wizard.structureFrame[key] = selected ? { ...selected, customText: '' } : { value: '', label: '', customText: '' };
    state.wizard.scopeErrors = {};
    renderPlanWizard();
  }));
  $all('[data-course-scope-custom]').forEach((field) => field.addEventListener('input', () => {
    state.wizard.structureFrame[field.dataset.courseScopeCustom].customText = field.value;
  }));
  $('[data-save-course-scope]')?.addEventListener('click', saveWizardCourseScope);
  $all('[data-retry-document]').forEach((button) => button.addEventListener('click', () => analyzeWizardDocuments(button.dataset.retryDocument)));
  $all('[data-ack-document-failure]').forEach((button) => button.addEventListener('click', () => acknowledgeWizardDocumentFailure(button.dataset.ackDocumentFailure)));
  $all('[data-structure-unit]').forEach((field) => field.addEventListener('input', () => updateStructuredUnit(field.dataset.structureUnit, field.dataset.unitField, field.value)));
  $('[data-save-course-structure]')?.addEventListener('click', saveWizardCourseStructure);
  $('[data-approve-course-structure]')?.addEventListener('click', approveWizardCourseStructure);
  $('[data-wizard-ranges]')?.addEventListener('input', (event) => {
    state.wizard.rangesText = event.target.value;
  });
  $all('[data-wizard-duration]').forEach((field) => field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', () => {
    state.wizard.duration[field.dataset.wizardDuration] = field.type === 'number' ? Number(field.value) : field.value;
    normalizeDurationAndAudience(state.wizard);
    state.wizard.structureFrame.totalDays = state.wizard.duration.numberOfDays;
    state.wizard.structureFrame.unitsPerDay = state.wizard.duration.uePerDay;
    if (!state.wizard.structureFrame.unitsByDayText.trim()) state.wizard.structureFrame.totalUnits = state.wizard.duration.totalUE;
    const total = $('[data-duration-total-ue]');
    if (total) total.value = state.wizard.duration.totalUE;
  }));
  $all('[data-wizard-audience]').forEach((field) => field.addEventListener('change', () => {
    state.wizard.targetAudience[field.dataset.wizardAudience] = field.dataset.wizardAudience === 'difficultyMode' ? difficultyLevels.normalizeDifficulty(field.value) : field.value;
  }));
  $all('[data-wizard-audience-check]').forEach((field) => field.addEventListener('change', () => {
    state.wizard.targetAudience[field.dataset.wizardAudienceCheck] = field.checked;
  }));
  $('[data-wizard-goal]')?.addEventListener('input', (event) => {
    state.wizard.courseGoal = event.target.value;
  });
  $('[data-wizard-outcome]')?.addEventListener('change', (event) => {
    state.wizard.expectedOutcome = event.target.value;
  });
  $('[data-wizard-style]')?.addEventListener('change', (event) => {
    state.wizard.didacticStyle = event.target.value;
  });
  $('[data-wizard-didactic-profile]')?.addEventListener('change', (event) => {
    state.wizard.didacticProfile = (state.didacticProfiles || []).find((profile) => profile.id === event.target.value) || { id: event.target.value };
    state.wizard.curriculumDraft = null;
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Didaktik geaendert. Curriculum bitte neu analysieren.';
    refreshDidacticRecommendation().then(renderPlanWizard);
  });
  $('[data-didactic-refresh]')?.addEventListener('click', () => refreshDidacticRecommendation().then(renderPlanWizard));
  $('[data-didactic-apply-recommendation]')?.addEventListener('click', () => {
    const recommended = state.wizard.didacticRecommendation?.recommended?.profile;
    if (!recommended) return;
    state.wizard.didacticProfile = { ...recommended };
    state.wizard.curriculumDraft = null;
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Empfohlenes didaktisches Profil uebernommen. Curriculum bitte neu prüfen.';
    refreshDidacticRecommendation().then(renderPlanWizard);
  });
  $all('[data-didactic-field]').forEach((field) => field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', () => {
    const base = getSelectedDidacticProfile();
    state.wizard.didacticProfile = {
      ...base,
      [field.dataset.didacticField]: field.value,
      customized: true,
      baseProfileId: base.baseProfileId || base.id
    };
    state.wizard.curriculumDraft = null;
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Didaktisches Profil angepasst. Curriculum bitte neu prüfen.';
    refreshDidacticRecommendation().then(renderPlanWizard);
  }));
  $all('[data-didactic-check]').forEach((field) => field.addEventListener('change', () => {
    const base = getSelectedDidacticProfile();
    state.wizard.didacticProfile = {
      ...base,
      [field.dataset.didacticCheck]: field.checked,
      customized: true,
      baseProfileId: base.baseProfileId || base.id
    };
    state.wizard.curriculumDraft = null;
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.status = 'Didaktisches Profil angepasst. Curriculum bitte neu prüfen.';
    refreshDidacticRecommendation().then(renderPlanWizard);
  }));
  $all('[data-container-profile]').forEach((field) => field.addEventListener('change', () => {
    state.wizard.containerProfile[field.dataset.containerProfile] = field.value;
    renderPlanWizard();
  }));
  $('[data-wizard-preset]')?.addEventListener('change', (event) => {
    state.wizard.selectedPresetId = event.target.value;
    renderPlanWizard();
  });
  $('[data-apply-preset]')?.addEventListener('click', applyWizardPreset);
  $all('[data-container-profile-check]').forEach((field) => field.addEventListener('change', () => {
    state.wizard.containerProfile[field.dataset.containerProfileCheck] = field.checked;
  }));
  $all('[data-profile-preset]').forEach((button) => button.addEventListener('click', () => {
    state.wizard.containerProfile.courseType = button.dataset.profilePreset;
    state.wizard.containerProfile.artifactMode = button.dataset.profilePreset === 'theory' ? 'web-only' : 'web-and-files';
    renderPlanWizard();
  }));
  $('[data-wizard-analyze]')?.addEventListener('click', analyzeWizardCurriculum);
  $('[data-wizard-approve]')?.addEventListener('click', approveWizardCurriculum);
  $all('[data-topic-move]').forEach((button) => button.addEventListener('click', () => moveWizardTopic(button.dataset.topicMove, Number(button.dataset.targetDay), 1)));
  $all('[data-topic-field]').forEach((field) => field.addEventListener('change', () => {
    const value = field.type === 'checkbox' ? field.checked : field.type === 'number' ? Number(field.value) : field.value;
    updateWizardTopic(field.dataset.topicField, { [field.dataset.topicProp]: value });
  }));
  $all('[data-day-field]').forEach((field) => field.addEventListener('change', () => {
    updateWizardDay(Number(field.dataset.dayField), field.dataset.dayProp, field.value);
  }));
  $all('[data-topic-duplicate]').forEach((button) => button.addEventListener('click', () => duplicateWizardTopic(button.dataset.topicDuplicate)));
  $all('[data-topic-new-after]').forEach((button) => button.addEventListener('click', () => addWizardTopicAfter(button.dataset.topicNewAfter)));
  $all('[data-day-new-topic]').forEach((button) => button.addEventListener('click', () => addWizardTopicToDay(Number(button.dataset.dayNewTopic))));
  $('[data-day-add]')?.addEventListener('click', addWizardDay);
  $('[data-day-remove]')?.addEventListener('click', removeLastWizardDay);
  $all('[data-topic-id]').forEach((topic) => topic.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', topic.dataset.topicId);
  }));
  $all('[data-curriculum-day]').forEach((day) => {
    day.addEventListener('dragover', (event) => event.preventDefault());
    day.addEventListener('drop', (event) => {
      event.preventDefault();
      const topicId = event.dataTransfer.getData('text/plain');
      if (topicId) moveWizardTopic(topicId, Number(day.dataset.curriculumDay), 999);
    });
  });
  $('[data-wizard-plan]')?.addEventListener('change', parseWizardPlan);
  $('[data-wizard-sheet]')?.addEventListener('change', parseWizardPlanSheet);
  $all('[data-wizard-upload]').forEach((input) => input.addEventListener('change', () => {
    handleDropZoneFiles(input.dataset.wizardUpload, input.files, 'picker');
    input.value = '';
    renderPlanWizard();
  }));
  bindDropZoneEvents();
  $('[data-wizard-import]')?.addEventListener('click', importWizardUploads);
  $('[data-wizard-references]')?.addEventListener('change', (event) => {
    state.wizard.useReferences = event.target.checked;
    renderPlanWizard();
  });
  $('[data-wizard-ai-mode]')?.addEventListener('change', (event) => {
    state.wizard.aiMode = event.target.value;
    renderPlanWizard();
  });
  $('[data-wizard-day]')?.addEventListener('change', (event) => {
    state.wizard.selectedDayNumber = Number(event.target.value);
    state.wizard.dayDraft = state.wizard.dayResults.find((result) => result.dayNumber === state.wizard.selectedDayNumber) || state.wizard.dayDraft;
    renderPlanWizard();
  });
  $all('[data-preview-day]').forEach((button) => button.addEventListener('click', () => {
    state.wizard.selectedDayNumber = Number(button.dataset.previewDay);
    state.wizard.dayDraft = state.wizard.dayResults.find((result) => result.dayNumber === state.wizard.selectedDayNumber) || state.wizard.dayDraft;
    renderPlanWizard();
  }));
  $('[data-wizard-generate]')?.addEventListener('click', generateWizardDayDraft);
  $('[data-wizard-generate-all]')?.addEventListener('click', generateAllWizardDayDrafts);
  $('[data-wizard-corrections]')?.addEventListener('input', (event) => {
    state.wizard.corrections = event.target.value;
  });
  $('[data-wizard-create-draft]')?.addEventListener('click', createWizardDraft);
  $('[data-wizard-revise]')?.addEventListener('click', reviseWizardDayDraft);
  $('[data-prompt-preview]')?.addEventListener('click', previewWizardPromptQuality);
  $('[data-prompt-quality]')?.addEventListener('click', previewWizardPromptQuality);
  $('[data-prompt-golden]')?.addEventListener('click', runPromptGoldenTests);
  $('[data-prompt-rules]')?.addEventListener('click', () => {
    state.wizard.promptRulesVisible = !state.wizard.promptRulesVisible;
    renderPlanWizard();
  });
  $('[data-ai-status-check]')?.addEventListener('click', refreshAiStatus);
  $('[data-wizard-ai-mode-settings]')?.addEventListener('change', (event) => {
    state.wizard.aiMode = event.target.value;
    renderPlanWizard();
  });
  $('[data-ai-model-save]')?.addEventListener('click', updateAiModel);
  $('[data-ai-import-select]')?.addEventListener('click', importAiKeyFromSelectedTxt);
  $('[data-ai-replace-key]')?.addEventListener('click', replaceAiKey);
  $('[data-ai-test-request]')?.addEventListener('click', testAiConnection);
  $('[data-ai-clear-key]')?.addEventListener('click', clearAiKey);
  $('[data-ai-setup-guide]')?.addEventListener('click', () => desktop.factory.openOpenAiSetupGuide());
  $('[data-wizard-preflight]')?.addEventListener('click', runWizardPreflight);
  $('[data-wizard-test-run]')?.addEventListener('click', () => runWizardTestDraft(false));
  $('[data-wizard-test-run-confirm]')?.addEventListener('click', () => runWizardTestDraft(true));
  $('[data-wizard-delete-last-test]')?.addEventListener('click', deleteLastWizardTestDraft);
  $('[data-wizard-clear-staging]')?.addEventListener('click', clearWizardStaging);
  $all('[data-wizard-open]').forEach((button) => button.addEventListener('click', () => desktop.factory.openGeneratedDraft(state.wizard.generatedDraft.containerId, button.dataset.wizardOpen)));
  $all('[data-demo-test]').forEach((button) => button.addEventListener('click', async () => {
    if (!state.wizard.generatedDraft?.containerId || !desktop.demo?.openTarget) return;
    const result = await desktop.demo.openTarget(button.dataset.demoTest, state.wizard.generatedDraft.containerId);
    state.wizard.status = result.message || 'Demo geprüft.';
    renderPlanWizard();
  }));
}

function moveWizardStep(direction) {
  const gates = getPlanWizardStepGates();
  const currentIndex = gates.findIndex((gate) => gate.id === state.wizard.activeStep);
  const candidates = direction > 0 ? gates.slice(currentIndex + 1) : gates.slice(0, currentIndex).reverse();
  const target = candidates.find((gate) => gate.active);
  if (!target) {
    state.wizard.status = direction > 0 ? 'Der nächste Schritt ist noch gesperrt.' : 'Du bist bereits am ersten Schritt.';
    renderPlanWizard();
    return;
  }
  state.wizard.activeStep = target.id;
  state.wizard.status = '';
  renderPlanWizard();
}

function bindDropZoneEvents() {
  $all('[data-dropzone]').forEach((zone) => {
    zone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        zone.querySelector('input[type="file"]')?.click();
      }
    });
    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('dropzone-is-dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dropzone-is-dragover'));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('dropzone-is-dragover');
      handleDropZoneFiles(zone.dataset.dropzone, event.dataTransfer?.files || [], 'drop');
      renderPlanWizard();
    });
  });
  $all('[data-dropzone-remove]').forEach((button) => button.addEventListener('click', () => {
    const [zoneId, index] = String(button.dataset.dropzoneRemove || '').split(':');
    removeDropZoneFile(zoneId, Number(index));
    renderPlanWizard();
  }));
}

function bindRawImportDropzone() {
  const zone = $('[data-raw-import-dropzone]');
  if (!zone) return;
  const input = $('[data-import-files]');
  const status = $('[data-import-status]');
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input?.click();
    }
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('dropzone-is-dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dropzone-is-dragover'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('dropzone-is-dragover');
    state.rawImportFiles = Array.from(event.dataTransfer?.files || []);
    if (status) status.textContent = `${state.rawImportFiles.length} Datei(en) für Expertenimport vorgemerkt.`;
  });
  input?.addEventListener('change', () => {
    state.rawImportFiles = [];
    if (status && input.files?.length) status.textContent = `${input.files.length} Datei(en) ausgewählt.`;
  });
}

function handleDropZoneFiles(zoneId, fileList, source = 'picker') {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const config = getUploadAreaConfig(zoneId, source);
  const existing = zoneId === 'anchor'
    ? state.wizard.anchorFiles.map((file) => ({ ...file, uploadArea: 'anchor' }))
    : state.wizard.uploadFiles.filter((file) => file.uploadArea === zoneId);
  const result = uploadUtils.validateUploadSelection
    ? uploadUtils.validateUploadSelection(files, config, existing)
    : { files: files.map((file) => ({ name: file.name, path: file.path || '', size: file.size, type: file.type, lastModified: file.lastModified, uploadArea: zoneId, source, warnings: [] })), blockedFiles: [], warnings: [], errors: [] };
  if (zoneId === 'anchor') {
    state.wizard.anchorFiles = [
      ...state.wizard.anchorFiles,
      ...result.files.map((file) => ({ ...file, uploadArea: undefined, sourceType: getSourceTypeForFile(file) }))
    ];
  } else {
    state.wizard.uploadFiles = [...state.wizard.uploadFiles, ...result.files];
  }
  const messages = [
    result.files.length ? `${result.files.length} Datei(en) hinzugefuegt.` : '',
    result.blockedFiles?.length ? `${result.blockedFiles.length} Datei(en) blockiert.` : '',
    ...(result.errors || [])
  ].filter(Boolean);
  state.wizard.status = messages.join(' ');
}

function removeDropZoneFile(zoneId, index) {
  if (zoneId === 'anchor') {
    state.wizard.anchorFiles = state.wizard.anchorFiles.filter((_, fileIndex) => fileIndex !== Number(index));
    state.wizard.status = 'Hauptquell-Datei entfernt.';
    return;
  }
  state.wizard.uploadFiles = uploadUtils.removeDropZoneFile
    ? uploadUtils.removeDropZoneFile(state.wizard.uploadFiles, zoneId, index)
    : state.wizard.uploadFiles.filter((file, fileIndex) => !(file.uploadArea === zoneId && fileIndex === Number(index)));
  state.wizard.status = 'Upload-Datei entfernt.';
}

async function applyWizardPreset() {
  if (!state.wizard.selectedPresetId) return;
  try {
    const updated = await desktop.factory.applyPreset(state.wizard.selectedPresetId, {
      containerProfile: state.wizard.containerProfile,
      targetAudience: state.wizard.targetAudience
    });
    state.wizard.containerProfile = updated.containerProfile;
    state.wizard.targetAudience = updated.targetAudience;
    state.wizard.status = (updated.presetWarnings || []).join(' ');
  } catch (error) {
    state.wizard.status = error.message;
  }
  renderPlanWizard();
}

function buildDidacticRecommendationInput() {
  return {
    course: state.wizard.course,
    duration: state.wizard.duration,
    targetAudience: state.wizard.targetAudience,
    courseGoal: state.wizard.courseGoal,
    expectedOutcome: state.wizard.expectedOutcome,
    containerProfile: state.wizard.containerProfile,
    courseType: state.wizard.containerProfile?.courseType,
    didacticProfile: getSelectedDidacticProfile()
  };
}

async function refreshDidacticRecommendation() {
  if (!desktop?.factory?.recommendDidacticProfiles) return;
  try {
    const input = buildDidacticRecommendationInput();
    state.wizard.didacticRecommendation = await desktop.factory.recommendDidacticProfiles(input);
    state.wizard.didacticPreview = await desktop.factory.createDidacticPreview({
      didacticProfile: getSelectedDidacticProfile(),
      courseType: state.wizard.containerProfile?.courseType,
      targetAudience: state.wizard.targetAudience,
      duration: state.wizard.duration,
      courseGoal: state.wizard.courseGoal || state.wizard.course.courseName
    });
  } catch (error) {
    state.wizard.didacticRecommendation = null;
    state.wizard.didacticPreview = null;
  }
}

async function parseWizardPlan(event) {
  const file = Array.from(event.target.files || [])[0];
  if (!file) return;
  state.wizard.planFile = { name: file.name, path: file.path || '', size: file.size, type: file.type };
  state.wizard.status = 'Unterrichtsplan wird gelesen ...';
  renderPlanWizard();
  try {
    state.wizard.coursePlan = await desktop.factory.parseCoursePlan({
      files: [state.wizard.planFile],
      courseTitle: state.wizard.course.courseName
    });
    state.wizard.selectedDayNumber = state.wizard.coursePlan.days[0]?.dayNumber || 1;
    state.wizard.status = 'Unterrichtsplan erkannt.';
  } catch (error) {
    showWizardError('Dokumentanalyse fehlgeschlagen', error);
  }
  renderPlanWizard();
}

async function parseWizardPlanSheet(event) {
  if (!state.wizard.planFile) return;
  state.wizard.coursePlan = await desktop.factory.parseCoursePlan({
    files: [state.wizard.planFile],
    selectedSheet: event.target.value,
    courseTitle: state.wizard.course.courseName
  });
  renderPlanWizard();
}

async function importWizardUploads() {
  state.wizard.status = 'Uploads werden sicher in Staging importiert ...';
  renderPlanWizard();
  try {
    state.wizard.importBatch = await desktop.factory.importFiles({
      name: `${state.wizard.course.courseName || 'Plan'} Uploads`,
      files: state.wizard.uploadFiles
    });
    state.wizard.status = 'Uploads importiert und klassifiziert.';
    await loadState();
  } catch (error) {
    state.wizard.status = error.message;
    renderPlanWizard();
  }
}

function wizardProjectInput() {
  return {
    id: state.wizard.course.courseId,
    title: state.wizard.course.courseName,
    description: state.wizard.course.description,
    subjectArea: state.wizard.course.department,
    targetGroup: selectionText(state.wizard.structureFrame.targetAudience),
    priorKnowledge: selectionText(state.wizard.structureFrame.priorKnowledge),
    uploadedDocuments: state.wizard.anchorFiles.map((file) => ({
      ...file, originalFileName: file.name, storedFilePath: file.path, mimeType: file.type,
      fileSize: file.size, declaredCategory: file.sourceType, sourcePriority: file.sourcePriority || 'high', bindingLevel: file.bindingLevel || 'binding'
    }))
  };
}

async function openSavedCourseProject(event) {
  if (!event.target.value) return;
  try {
    const project = await desktop.factory.getCourseProject(event.target.value);
    state.wizard.courseProject = project;
    state.wizard.course = { ...state.wizard.course, courseName: project.title, courseId: project.id, description: project.description, department: project.subjectArea };
    state.wizard.anchorFiles = (project.uploadedDocuments || []).map((file) => ({ ...file, name: file.originalFileName, path: file.storedFilePath, type: file.mimeType, size: file.fileSize, sourceType: file.declaredCategory }));
    if (project.planningFrame) {
      state.wizard.planningFrame = { ...state.wizard.planningFrame, ...project.planningFrame, targetGroup: project.targetGroup || project.planningFrame.targetGroup || '', priorKnowledge: project.priorKnowledge || project.planningFrame.priorKnowledge || '', breaksText: (project.planningFrame.breaks || []).map((item) => `${item.start}-${item.end}`).join('\n') };
      state.wizard.duration = { ...state.wizard.duration, numberOfDays: project.planningFrame.totalDays, uePerDay: project.planningFrame.unitsPerDay, totalUE: project.planningFrame.totalUnits };
    }
    if (project.structureFrame) {
      state.wizard.structureFrame = { ...state.wizard.structureFrame, ...project.structureFrame };
      state.wizard.duration = { ...state.wizard.duration, numberOfDays: project.structureFrame.totalDays, uePerDay: project.structureFrame.unitsByDay?.[0] || project.structureFrame.unitsPerDay, totalUE: project.structureFrame.totalUnits };
    }
    state.wizard.targetAudience = { ...state.wizard.targetAudience, ageRange: project.targetGroup || state.wizard.targetAudience.ageRange, priorKnowledge: project.priorKnowledge || state.wizard.targetAudience.priorKnowledge };
    if (project.approvedCoursePlan) state.wizard.approvedCurriculumPlan = structuredPlanToCurriculum(project.approvedCoursePlan);
    state.wizard.status = 'Gespeichertes Kursprojekt geladen.';
  } catch (error) { state.wizard.status = error.message; }
  renderPlanWizard();
}

async function analyzeWizardDocuments(retryDocumentId = '') {
  if (state.wizard.analysisProgress?.status === 'running') return;
  state.wizard.analysisProgress = { status: 'running', step: 'Dokumente werden vorbereitet', currentDocument: '', queued: state.wizard.anchorFiles.length, completed: 0, warningCount: 0, failed: 0 };
  state.wizard.status = 'Echte KI-Analyse und UE-Planung wurden gestartet.';
  renderPlanWizard();
  try {
    const project = wizardProjectInput();
    const started = await desktop.factory.startDocumentAnalysis({ project: { ...project, structureFrame: state.wizard.courseProject?.structureFrame }, documents: project.uploadedDocuments, retryDocumentId });
    state.wizard.analysisProgress = started.progress;
    await pollAnalysisOperation(started.operationId);
  } catch (error) {
    state.wizard.analysisProgress = { status: 'failed', step: 'Analyse fehlgeschlagen', errors: [error.message] };
    showWizardError('Dokumentanalyse fehlgeschlagen', error);
  } finally {
    if (state.wizard.analysisProgress?.status === 'running') state.wizard.analysisProgress.status = 'failed';
    renderPlanWizard();
  }
}

async function pollAnalysisOperation(operationId) {
  while (state.wizard.analysisProgress?.status === 'running') {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const progress = await desktop.factory.getAnalysisProgress(operationId);
    state.wizard.analysisProgress = progress;
    if (progress.project) state.wizard.courseProject = progress.project;
    renderPlanWizard();
    if (progress.status !== 'running') {
      state.wizard.courseProject = await desktop.factory.getCourseProject(state.wizard.course.courseId);
      const failed = state.wizard.courseProject.uploadedDocuments.filter((document) => document.analysisStatus === 'failed').length;
      state.wizard.status = progress.status === 'completed' ? `Analyse und UE-Planung abgeschlossen.${failed ? ` ${failed} Dokument(e) sind fehlgeschlagen und können erneut analysiert werden.` : ''}` : progress.status === 'cancelled' ? 'Analyse wurde abgebrochen.' : formatProgressError(progress);
      if (progress.status === 'completed') state.wizard.activeStep = 'structureReview';
    }
  }
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
    const errors = validateWizardCourseScope(wizard.structureFrame);
    wizard.scopeErrors = errors;
    if (Object.keys(errors).length) { renderPlanWizard(); return; }
    const frame = { schemaVersion: 1, totalDays: wizard.structureFrame.totalDays, unitsPerDay: wizard.structureFrame.unitsPerDay, unitDurationMinutes: wizard.structureFrame.unitDurationMinutes, targetAudience: wizard.structureFrame.targetAudience, priorKnowledge: wizard.structureFrame.priorKnowledge };
    if (!wizard.courseProject) wizard.courseProject = await desktop.factory.upsertCourseProject(wizardProjectInput());
    wizard.courseProject = await desktop.factory.saveCourseScope(wizard.course.courseId, frame);
    wizard.structureFrame = { ...wizard.structureFrame, ...wizard.courseProject.structureFrame };
    wizard.scopeErrors = {};
    wizard.status = 'Dauer und Zielgruppe wurden gespeichert.';
  } catch (error) { showWizardError('Dauer und Zielgruppe konnten nicht gespeichert werden', 'Ihre Eingaben konnten nicht gespeichert werden. Die bereits eingegebenen Daten bleiben im Formular erhalten. Bitte prüfen Sie die Angaben und versuchen Sie es erneut.', saveWizardCourseScope); }
  renderPlanWizard();
}

function currentStructuredDraft() {
  const project = state.wizard.courseProject;
  return project?.coursePlanDrafts?.find((item) => item.planningVersion === project.currentPlanningVersion);
}

function updateStructuredUnit(unitId, field, value) {
  const draft = currentStructuredDraft();
  for (const day of draft?.days || []) {
    const unit = (day.units || []).find((item) => item.id === unitId);
    if (unit) { unit[field] = value; unit.reviewStatus = 'edited'; unit.userEdited = true; break; }
  }
}

async function saveWizardCourseStructure() {
  try {
    state.wizard.courseProject = await desktop.factory.saveStructuredCoursePlan(state.wizard.course.courseId, currentStructuredDraft());
    state.wizard.status = 'Kursstruktur-Entwurf gespeichert.';
  } catch (error) { state.wizard.status = error.message; }
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
    path: file.path || '',
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
  if (!desktop?.factory) {
    setFactoryStatus('Vorschau ohne Desktop-Daten. In der Electron-App werden Projekte und Status geladen.', 'status-warning');
    appNavigation.activatePanel('home', { focus: false });
    return;
  }
  $all('[data-factory-tab]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.factoryTab)));
  $all('[data-open-factory-section]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.openFactorySection)));
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
  await loadState();
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${escapeHtml(error.message)}</p>`);
});
