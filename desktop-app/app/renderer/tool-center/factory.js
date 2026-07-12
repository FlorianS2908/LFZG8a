const desktop = window.lfzq8aDesktop;

const state = {
  containers: [],
  importBatches: [],
  referenceSources: [],
  curriculumDrafts: [],
  presets: [],
  storageUsage: null,
  targetAreas: [],
  targetAreaLabels: {},
  selectedBatchId: '',
  aiStatus: null,
  aiTestResult: null,
  aiImportResult: null,
  goldenPromptResult: null,
  wizard: {
    course: { courseName: '', courseId: '', department: '', description: '' },
    anchorType: 'course-plan',
    anchorFiles: [],
    rangesText: '',
    duration: { durationMode: 'days', numberOfDays: 5, hoursPerDay: 8, uePerDay: 9, ueMinutes: 45, totalHours: 40, totalUE: 45, pauseModel: 'default' },
    targetAudience: { ageRange: 'mixed', educationContext: 'umschulung', department: 'ALLGEMEIN', priorKnowledge: 'basic', learningLevel: 'basic', languageLevel: 'normal', practiceLevel: 'medium', difficultyMode: 'normal', needsStepByStep: true, examOrientation: false, projectOrientation: true },
    containerProfile: { courseType: 'theory', artifactMode: 'web-only', studentWorkspace: true, teacherSolutions: true, generateStarterFiles: true, generateSolutionFiles: true, generateReadme: true, generateSetupGuide: true, generateRunScripts: false, allowExecutableTools: false, allowDatabaseActions: false },
    courseGoal: '',
    expectedOutcome: 'grundlagenkurs',
    didacticStyle: 'guided',
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
    generatedDraft: null,
    selectedPresetId: '',
    preflight: null,
    testRun: null,
    promptQuality: null,
    costEstimate: null,
    promptRulesVisible: false,
    cleanupReport: null,
    status: ''
  }
};

const uploadAreas = [
  ['materials', 'Unterrichtsmaterialien', '.pptx,.pdf,.docx,.md,.html,.ipynb,.zip'],
  ['tasks', 'Aufgaben', '.html,.md,.pdf,.docx,.ipynb,.json,.zip'],
  ['solutions', 'Loesungen', '.html,.md,.pdf,.docx,.ipynb,.java,.cs,.sql,.zip'],
  ['quiz', 'Fragenpools / Quiz', '.json,.xml,.docx,.txt,.zip'],
  ['project', 'Projektmaterialien', '.zip,.html,.css,.js,.java,.cs,.php,.sql,.png,.jpg,.pdf,.docx'],
  ['source-code', 'Quellcode', '.html,.css,.js,.ts,.tsx,.jsx,.php,.java,.cs,.py,.zip'],
  ['database', 'Datenbank / SQL', '.sql,.csv,.zip'],
  ['assets', 'Assets / Medien', '.png,.jpg,.jpeg,.svg,.webp,.gif,.zip'],
  ['reference-literature', 'Referenzliteratur / Fachquellen', '.pdf,.epub,.docx,.txt,.md,.html,.zip'],
  ['other', 'Sonstige Dateien', ''],
  ['zip-package', 'ZIP-Gesamtpaket', '.zip']
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

function showPanel(panelName) {
  $all('[data-factory-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.factoryTab === panelName));
  $all('[data-factory-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.factoryPanel === panelName));
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
  $('[data-container-list]').innerHTML = state.containers.map((container) => {
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
          ${container.generated && manifest.status === 'draft' ? `<button class="primary-button" type="button" data-publish="${escapeHtml(manifest.id)}">Veroeffentlichen</button>` : ''}
          ${container.generated ? `<button class="secondary-button" type="button" data-disable="${escapeHtml(manifest.id)}">Deaktivieren</button><button class="secondary-button" type="button" data-archive="${escapeHtml(manifest.id)}">Archivieren</button>` : ''}
        </div>
      </article>
    `;
  }).join('');

  $('[data-duplicate-source]').innerHTML = state.containers.map((container) => (
    `<option value="${escapeHtml(container.manifest.id)}">${escapeHtml(container.manifest.name)} (${escapeHtml(container.manifest.id)})</option>`
  )).join('');

  $all('[data-publish]').forEach((button) => button.addEventListener('click', () => publishContainer(button.dataset.publish)));
  $all('[data-disable]').forEach((button) => button.addEventListener('click', () => updateContainerStatus(button.dataset.disable, 'disable')));
  $all('[data-archive]').forEach((button) => button.addEventListener('click', () => updateContainerStatus(button.dataset.archive, 'archive')));
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

function renderPlanWizard() {
  const root = $('[data-plan-wizard]');
  if (!root) return;
  const wizard = state.wizard;
  const gates = getWizardGates();
  const selectedDay = wizard.approvedCurriculumPlan?.days?.find((day) => day.dayNumber === Number(wizard.selectedDayNumber)) || wizard.approvedCurriculumPlan?.days?.[0];
  const anchorAccept = wizard.anchorType === 'course-plan' ? '.xlsx,.xlsm' : wizard.anchorType === 'book-or-presentation' ? '.pdf,.epub,.pptx' : '.docx,.txt,.md,.html';
  root.innerHTML = `
    <article class="tool-card">
      <h2>Plan -> KI/Fallback -> Container</h2>
      <div class="factory-meta wizard-steps">
        ${gates.map((gate) => `<div><dt>${escapeHtml(gate.label)}</dt><dd>${gate.done ? 'erfuellt' : gate.active ? 'aktiv' : 'gesperrt'}</dd></div>`).join('')}
      </div>
      ${wizard.status ? `<p class="status-line">${escapeHtml(wizard.status)}</p>` : ''}
    </article>

    <article class="tool-card">
      <h3>1. Kursdaten</h3>
      <div class="factory-form-grid">
        <label>Kursname<input data-wizard-course="courseName" value="${escapeHtml(wizard.course.courseName)}" placeholder="Kursname"></label>
        <label>Kurs-ID<input data-wizard-course="courseId" value="${escapeHtml(wizard.course.courseId)}" placeholder="kurs-id"></label>
        <label>Fachbereich<select data-wizard-course="department">${['', 'FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'].map((value) => `<option value="${value}" ${wizard.course.department === value ? 'selected' : ''}>${value || 'Bitte waehlen'}</option>`).join('')}</select></label>
      </div>
      <label>Beschreibung<textarea data-wizard-course="description">${escapeHtml(wizard.course.description)}</textarea></label>
    </article>

    <article class="tool-card">
      <h3>2. Thematische Hauptquelle waehlen</h3>
      <div class="factory-form-grid">
        <label>Curriculum Anchor<select data-wizard-anchor-type>
          <option value="course-plan" ${wizard.anchorType === 'course-plan' ? 'selected' : ''}>Unterrichtsplan Upload</option>
          <option value="book-or-presentation" ${wizard.anchorType === 'book-or-presentation' ? 'selected' : ''}>Buch / PDF / EPUB / PowerPoint</option>
          <option value="text-document" ${wizard.anchorType === 'text-document' ? 'selected' : ''}>Textdokument / Word / Markdown / HTML / TXT</option>
        </select></label>
        <label>Hauptquelle<input data-wizard-anchor-files type="file" multiple accept="${escapeHtml(anchorAccept)}"></label>
      </div>
      <small>${wizard.anchorFiles.length} Hauptquell-Datei(en) ausgewaehlt. Genau ein Anchor-Typ ist aktiv.</small>
      ${wizard.anchorType === 'book-or-presentation' ? `<label>Seiten-/Folienbereiche optional<textarea data-wizard-ranges placeholder="20-45; 80-120">${escapeHtml(wizard.rangesText)}</textarea></label>` : ''}
    </article>

    <article class="tool-card">
      <h3>3. Dauer, Zielgruppe & Kursziel</h3>
      <div class="factory-form-grid">
        <label>Dauermodus<select data-wizard-duration="durationMode"><option value="days" ${wizard.duration.durationMode === 'days' ? 'selected' : ''}>Tage</option><option value="hours" ${wizard.duration.durationMode === 'hours' ? 'selected' : ''}>Stunden</option><option value="ue" ${wizard.duration.durationMode === 'ue' ? 'selected' : ''}>UE</option></select></label>
        <label>Tage<input data-wizard-duration="numberOfDays" type="number" min="1" value="${escapeHtml(wizard.duration.numberOfDays)}"></label>
        <label>Stunden/Tag<input data-wizard-duration="hoursPerDay" type="number" min="1" value="${escapeHtml(wizard.duration.hoursPerDay)}"></label>
        <label>UE/Tag<input data-wizard-duration="uePerDay" type="number" min="1" value="${escapeHtml(wizard.duration.uePerDay)}"></label>
        <label>Gesamtstunden<input data-wizard-duration="totalHours" type="number" min="1" value="${escapeHtml(wizard.duration.totalHours)}"></label>
        <label>Gesamt-UE<input data-wizard-duration="totalUE" type="number" min="1" value="${escapeHtml(wizard.duration.totalUE)}"></label>
        <label>Zielgruppenalter<select data-wizard-audience="ageRange">${['mixed', '16-20', '20-30', '30+', 'unknown'].map((value) => `<option value="${value}" ${wizard.targetAudience.ageRange === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Vorkenntnisse<select data-wizard-audience="priorKnowledge">${['none', 'basic', 'intermediate', 'advanced'].map((value) => `<option value="${value}" ${wizard.targetAudience.priorKnowledge === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Niveau<select data-wizard-audience="learningLevel">${['intro', 'basic', 'exam-prep', 'professional', 'advanced'].map((value) => `<option value="${value}" ${wizard.targetAudience.learningLevel === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Schwierigkeit<select data-wizard-audience="difficultyMode">${['normal', 'normal-and-hard', 'easy-normal-hard'].map((value) => `<option value="${value}" ${wizard.targetAudience.difficultyMode === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Endprodukt<select data-wizard-outcome>${['webseite', 'datenbankmodell', 'java-programm', 'python-programm', 'projektmappe', 'pruefungsvorbereitung', 'grundlagenkurs', 'custom'].map((value) => `<option value="${value}" ${wizard.expectedOutcome === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Didaktik<select data-wizard-style>${['guided', 'project-based', 'exam-oriented', 'workshop', 'self-study', 'mixed'].map((value) => `<option value="${value}" ${wizard.didacticStyle === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      </div>
      <label>Kursziel<textarea data-wizard-goal>${escapeHtml(wizard.courseGoal)}</textarea></label>
      <label class="checkline"><input data-wizard-audience-check="needsStepByStep" type="checkbox" ${wizard.targetAudience.needsStepByStep ? 'checked' : ''}> Schritt fuer Schritt</label>
      <label class="checkline"><input data-wizard-audience-check="projectOrientation" type="checkbox" ${wizard.targetAudience.projectOrientation ? 'checked' : ''}> Projektorientierung</label>
      <label class="checkline"><input data-wizard-audience-check="examOrientation" type="checkbox" ${wizard.targetAudience.examOrientation ? 'checked' : ''}> Pruefungsorientierung</label>
    </article>

    ${renderContainerProfileStep(wizard)}

    <article class="tool-card">
      <h3>5. Analyse starten</h3>
      <p class="status-line">Die Container-Konfiguration steuert sichere Artefaktvorschlaege. Code, SQL und externe Tools werden nie automatisch ausgefuehrt.</p>
      <button class="primary-button" type="button" data-wizard-analyze ${wizard.anchorFiles.length ? '' : 'disabled'}>Curriculum analysieren</button>
    </article>

    ${wizard.curriculumDraft ? renderCurriculumReview(wizard.curriculumDraft) : ''}

    <article class="tool-card">
      <h3>8. Materialien ergaenzen</h3>
      <div class="factory-grid">
        ${uploadAreas.map(([area, label, accept]) => {
          const files = wizard.uploadFiles.filter((file) => file.uploadArea === area);
          return `<div class="factory-card"><strong>${escapeHtml(label)}</strong><small>${files.length} Datei(en), ${formatBytes(files.reduce((sum, file) => sum + Number(file.size || 0), 0))}</small><label class="drop-line">Dateien/ZIPs<input data-wizard-upload="${escapeHtml(area)}" type="file" multiple ${accept ? `accept="${escapeHtml(accept)}"` : ''}></label></div>`;
        }).join('')}
      </div>
      <button class="secondary-button" type="button" data-wizard-import ${wizard.uploadFiles.length ? '' : 'disabled'}>Uploads in Staging importieren</button>
      ${wizard.importBatch ? `<p class="status-line">Import-Batch: ${escapeHtml(wizard.importBatch.id)} (${wizard.importBatch.files.length} Datei(en))</p>` : ''}
    </article>

    <article class="tool-card">
      <h3>9. Referenzen & KI-Modus</h3>
      <label class="checkline"><input data-wizard-references type="checkbox" ${wizard.useReferences ? 'checked' : ''}> Lokale Referenzbibliothek fuer Kontext verwenden</label>
      <div class="factory-form-grid">
        <label>KI-Modus<select data-wizard-ai-mode>${['local', 'openai', 'openai-review', 'openai-review-repair'].map((mode) => `<option value="${mode}" ${wizard.aiMode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>
        <label>Tag<select data-wizard-day>${(wizard.approvedCurriculumPlan?.days || []).map((day) => `<option value="${day.dayNumber}" ${Number(wizard.selectedDayNumber) === day.dayNumber ? 'selected' : ''}>Tag ${day.dayNumber}: ${escapeHtml(day.title)}</option>`).join('')}</select></label>
      </div>
      <small>Provider: local ${state.aiStatus?.providers?.openai?.configured ? '| OpenAI konfiguriert' : '| OpenAI nicht konfiguriert, Fallback lokal'}</small>
      <button class="primary-button" type="button" data-wizard-generate-all ${selectedDay && wizard.approvedCurriculumPlan?.status === 'approved' ? '' : 'disabled'}>Alle Tage generieren</button>
      <button class="secondary-button" type="button" data-wizard-generate ${selectedDay && wizard.approvedCurriculumPlan?.status === 'approved' ? '' : 'disabled'}>Ausgewaehlten Tag neu generieren</button>
      ${!wizard.approvedCurriculumPlan ? '<p class="status-line status-warning">Tagesentwurf erst nach Curriculum-Freigabe moeglich.</p>' : ''}
    </article>

    ${renderAiSettings(wizard)}

    ${renderPromptQualityGate(wizard)}

    <article class="tool-card">
      <h3>10-12. Tagesentwurf, Korrektur & Draft</h3>
      ${wizard.dayResults.length ? `<p class="status-line">${wizard.dayResults.length} Tagesentwurf/Tagesentwuerfe erzeugt.</p>` : ''}
      ${wizard.dayResults.length ? renderDayResultList(wizard.dayResults) : ''}
      ${wizard.dayDraft ? renderDayDraftPreview(wizard.dayDraft) : '<p class="status-line">Noch kein Tagesentwurf erzeugt.</p>'}
      <label>Korrekturhinweis<textarea data-wizard-corrections>${escapeHtml(wizard.corrections)}</textarea></label>
      <button class="secondary-button" type="button" data-wizard-revise ${wizard.dayDraft ? '' : 'disabled'}>Tagesentwurf mit Korrektur neu erzeugen</button>
      <button class="primary-button" type="button" data-wizard-create-draft ${wizard.dayResults.length || wizard.dayDraft ? '' : 'disabled'}>Dual-Mode-Container-Draft erzeugen</button>
      ${wizard.generatedDraft ? renderGeneratedDraft(wizard.generatedDraft) : ''}
    </article>

    ${renderPreflightTestRun(wizard)}
  `;
  bindPlanWizardEvents();
}

function renderDayDraftPreview(draft) {
  return `
    <div class="validation-box">
      <strong>${escapeHtml(draft.title)}</strong>
      <h4>Teilnehmer-Vorschau</h4>
      ${(draft.webvariant?.participantHtmlSections || []).map((section) => `<section><strong>${escapeHtml(section.title)}</strong>${section.content}</section>`).join('')}
      <h4>Aufgaben</h4><ul>${(draft.tasks || []).map((task) => `<li>${escapeHtml(task.title)}: ${escapeHtml(task.text)}</li>`).join('')}</ul>
      <h4>Quiz</h4><ul>${(draft.quiz || []).map((quiz) => `<li>${escapeHtml(quiz.text)}</li>`).join('')}</ul>
      <details><summary>Dozentenloesungen</summary><ul>${(draft.solutions || []).map((solution) => `<li>${escapeHtml(solution.title)}: ${escapeHtml(solution.text)}</li>`).join('')}</ul></details>
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
      <h3>4. Container-Konfiguration</h3>
      <div class="factory-form-grid">
        <label>Preset<select data-wizard-preset><option value="">Kein Preset</option>${presets.map((preset) => `<option value="${escapeHtml(preset.id)}" ${wizard.selectedPresetId === preset.id ? 'selected' : ''}>${escapeHtml(preset.label || preset.id)}</option>`).join('')}</select></label>
        <label>Kurstyp<select data-container-profile="courseType">${types.map((value) => `<option value="${value}" ${profile.courseType === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label>Artefaktmodus<select data-container-profile="artifactMode">${modes.map((value) => `<option value="${value}" ${profile.artifactMode === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      </div>
      <button class="secondary-button" type="button" data-apply-preset ${wizard.selectedPresetId ? '' : 'disabled'}>Preset anwenden</button>
      <small>Preset setzt Vorschlaege; alle Werte bleiben manuell korrigierbar.</small>
      <div class="summary-grid">
        ${['studentWorkspace', 'teacherSolutions', 'generateStarterFiles', 'generateSolutionFiles', 'generateReadme', 'generateSetupGuide'].map((key) => `<label class="checkline"><input data-container-profile-check="${key}" type="checkbox" ${profile[key] ? 'checked' : ''}> ${escapeHtml(key)}</label>`).join('')}
        <label class="checkline"><input data-container-profile-check="generateRunScripts" type="checkbox" ${profile.generateRunScripts ? 'checked' : ''}> Run-Skripte erzeugen</label>
        <label class="checkline"><input data-container-profile-check="allowExecutableTools" type="checkbox" ${profile.allowExecutableTools ? 'checked' : ''}> externe Tools erlauben</label>
        <label class="checkline"><input data-container-profile-check="allowDatabaseActions" type="checkbox" ${profile.allowDatabaseActions ? 'checked' : ''}> DB-Aktionen erlauben</label>
      </div>
      <p class="status-line status-warning">EXE/BAT/CMD/PS1 werden nie exportiert oder ausgefuehrt. SQL wird nur als Datei erzeugt.</p>
      <div class="button-row">
        <button class="secondary-button" type="button" data-profile-preset="java-maven">Maven-Projekt erzwingen</button>
        <button class="secondary-button" type="button" data-profile-preset="java">nur einfache Java-Dateien</button>
        <button class="secondary-button" type="button" data-profile-preset="uml-pap">Diagramm hinzufuegen</button>
        <button class="secondary-button" type="button" data-profile-preset="sql">SQL-Skripte hinzufuegen</button>
        <button class="secondary-button" type="button" data-profile-preset="jupyter">Jupyter hinzufuegen</button>
      </div>
      ${wizard.curriculumDraft ? renderArtifactSuggestionPreview(wizard) : '<small>Artefakt-Vorschlaege erscheinen nach der Curriculum-Analyse.</small>'}
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
      ${preflight ? renderPreflightResult(preflight) : '<p class="status-line">Prueft Kursdaten, freigegebenes Curriculum, Profil, KI-Fallback und Export-Schutz.</p>'}
      ${testRun ? renderTestRunResult(testRun) : ''}
      ${wizard.cleanupReport ? `<p class="status-line">${escapeHtml(wizard.cleanupReport.action)}: ${(wizard.cleanupReport.deleted || []).length} geloescht.</p>` : ''}
      <div class="button-row">
        <button class="secondary-button" type="button" data-wizard-preflight ${canPreflight ? '' : 'disabled'}>Preflight pruefen</button>
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
      ${result.requiresConfirmation ? '<p class="status-line status-warning">Warnungen muessen fuer den Testlauf bestaetigt werden.</p>' : ''}
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
      <h3>Prompt-Praezision</h3>
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
        <button class="secondary-button" type="button" data-prompt-quality>Prompt pruefen</button>
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
        <span>Standardpfad: ${escapeHtml(openai.defaultPathStatus || adminStore.defaultPathStatus || 'unbekannt')}</span>
        <span>Verbindungstest: ${escapeHtml(openai.connectionTestStatus || adminStore.connectionTestStatus || 'unknown')}</span>
        <span>Timeout: ${escapeHtml(state.aiStatus?.timeoutMs || 30000)} ms</span>
        <span>Local/Fallback aktiv: ja</span>
        <span>Kostenwarnung: ${state.aiStatus?.costWarningUsd ? 'ja' : 'nein'}</span>
      </div>
      ${estimate ? `<p class="status-line ${estimate.warning ? 'status-warning' : ''}">Geschaetzte Kosten: ca. ${escapeHtml(estimate.estimatedCostUsd)} USD | Input ${escapeHtml(estimate.inputTokens)} Tokens | Output ${escapeHtml(estimate.outputTokens)} Tokens</p>` : ''}
      ${test ? `<p class="status-line ${test.status === 'failed' ? 'status-error' : test.status === 'warning' ? 'status-warning' : ''}">Testanfrage: ${escapeHtml(test.status)} - ${escapeHtml(test.message)}</p>` : ''}
      ${importResult ? `<p class="status-line ${importResult.success === false ? 'status-error' : ''}">${escapeHtml(importResult.message || importResult.status || '')}</p>` : ''}
      <div class="button-row">
        <button class="secondary-button" type="button" data-ai-status-check>KI-Status pruefen</button>
        <button class="secondary-button" type="button" data-ai-model-save>Modell speichern</button>
        <button class="secondary-button" type="button" data-ai-import-default>Standardpfad verwenden</button>
        <button class="secondary-button" type="button" data-ai-import-select>TXT-Datei auswaehlen</button>
        <button class="secondary-button" type="button" data-ai-test-request>OpenAI-Testanfrage senden</button>
        <button class="secondary-button" type="button" data-ai-clear-key>OpenAI-Key entfernen</button>
        <button class="secondary-button" type="button" data-ai-setup-guide>Setup-Anleitung oeffnen</button>
      </div>
    </article>
  `;
}

function renderArtifactSuggestionPreview(wizard) {
  const topics = (wizard.curriculumDraft?.days || []).flatMap((day) => (day.topics || []).slice(0, 2).map((topic) => ({ dayNumber: day.dayNumber, title: topic.title }))).slice(0, 8);
  return `<div class="validation-box"><strong>Artefakt-Vorschlaege pruefen</strong>${topics.map((topic) => `<p>Tag ${escapeHtml(topic.dayNumber)} - ${escapeHtml(topic.title)}: ${escapeHtml(wizard.containerProfile.courseType)} / ${escapeHtml(wizard.containerProfile.artifactMode)}</p>`).join('')}<small>Details, Zielpfade und Begruendungen werden im Analysebericht dokumentiert. Sichere Defaults werden verwendet, wenn nichts manuell geaendert wird.</small></div>`;
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
      <h3>6-7. Curriculum pruefen und freigeben</h3>
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
                <label>Difficulty<select data-topic-field="${escapeHtml(topic.id)}" data-topic-prop="difficulty">${['easy', 'normal', 'hard'].map((value) => `<option value="${value}" ${topic.difficulty === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
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
      <button class="secondary-button" type="button" data-day-add>Tag hinzufuegen</button>
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
        <div><dt>Validierung</dt><dd>${draft.validation?.isValid ? 'ok' : 'pruefen'}</dd></div>
        <div><dt>Testprotokoll</dt><dd>${escapeHtml(draft.testProtocol?.overallStatus || draft.analysisReport?.testProtocol?.overallStatus || 'offen')}</dd></div>
      </dl>
      ${renderTestProtocolSummary(draft.testProtocol || draft.analysisReport?.testProtocol)}
      ${renderDemoSummary(draft)}
      <div class="button-row">
        <button class="secondary-button" type="button" data-wizard-open="standalone">Standalone oeffnen</button>
        <button class="secondary-button" type="button" data-wizard-open="folder">Ordner oeffnen</button>
        <button class="secondary-button" type="button" data-wizard-open="report">Analysebericht oeffnen</button>
        <button class="secondary-button" type="button" data-wizard-open="test-protocol">Testprotokoll oeffnen</button>
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
  if (!protocol) return '<p class="status-line">Testprotokoll wird beim naechsten Draft/Testlauf erzeugt.</p>';
  return `<p class="status-line">Testprotokoll: ${escapeHtml(protocol.overallStatus || 'offen')} | passed ${escapeHtml(summary.passed || 0)} | warning ${escapeHtml(summary.warnings || 0)} | failed ${escapeHtml(summary.failed || 0)} | manuell ${escapeHtml(summary.manualChecks || 0)}</p>`;
}

function getWizardGates() {
  const wizard = state.wizard;
  const courseDone = Boolean(wizard.course.courseName && wizard.course.courseId && wizard.course.department);
  const anchorDone = Boolean(wizard.anchorFiles.length);
  const curriculumDone = Boolean(wizard.curriculumDraft?.days?.length);
  const approvedDone = wizard.approvedCurriculumPlan?.status === 'approved';
  const draftDone = Boolean(wizard.dayDraft);
  const containerDone = Boolean(wizard.generatedDraft);
  return [
    { label: 'Kursdaten', done: courseDone, active: !courseDone },
    { label: 'Hauptquelle', done: anchorDone, active: courseDone && !anchorDone },
    { label: 'Curriculum', done: curriculumDone, active: anchorDone && !curriculumDone },
    { label: 'Freigabe', done: approvedDone, active: curriculumDone && !approvedDone },
    { label: 'Uploads/Referenzen', done: Boolean(wizard.importBatch || wizard.uploadFiles.length || wizard.useReferences), active: approvedDone },
    { label: 'KI/Fallback', done: draftDone, active: approvedDone && !draftDone },
    { label: 'Draft/Standalone', done: containerDone, active: draftDone && !containerDone }
  ];
}

function bindPlanWizardEvents() {
  $all('[data-wizard-course]').forEach((field) => field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', () => {
    state.wizard.course[field.dataset.wizardCourse] = field.value;
    state.wizard.targetAudience.department = state.wizard.course.department || state.wizard.targetAudience.department;
    if (field.dataset.wizardCourse === 'courseName' && !state.wizard.course.courseId) {
      state.wizard.course.courseId = field.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (field.tagName === 'SELECT') renderPlanWizard();
  }));
  $('[data-wizard-anchor-type]')?.addEventListener('change', (event) => {
    state.wizard.anchorType = event.target.value;
    state.wizard.anchorFiles = [];
    state.wizard.curriculumDraft = null;
    state.wizard.approvedCurriculumPlan = null;
    renderPlanWizard();
  });
  $('[data-wizard-anchor-files]')?.addEventListener('change', (event) => {
    state.wizard.anchorFiles = Array.from(event.target.files || []).map((file) => ({ name: file.name, path: file.path || '', size: file.size, type: file.type }));
    renderPlanWizard();
  });
  $('[data-wizard-ranges]')?.addEventListener('input', (event) => {
    state.wizard.rangesText = event.target.value;
  });
  $all('[data-wizard-duration]').forEach((field) => field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', () => {
    state.wizard.duration[field.dataset.wizardDuration] = field.type === 'number' ? Number(field.value) : field.value;
  }));
  $all('[data-wizard-audience]').forEach((field) => field.addEventListener('change', () => {
    state.wizard.targetAudience[field.dataset.wizardAudience] = field.value;
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
    const area = input.dataset.wizardUpload;
    Array.from(input.files || []).forEach((file) => state.wizard.uploadFiles.push({
      name: file.name,
      path: file.path || '',
      size: file.size,
      type: file.type,
      uploadArea: area
    }));
    input.value = '';
    renderPlanWizard();
  }));
  $('[data-wizard-import]')?.addEventListener('click', importWizardUploads);
  $('[data-wizard-references]')?.addEventListener('change', (event) => {
    state.wizard.useReferences = event.target.checked;
    renderPlanWizard();
  });
  $('[data-wizard-ai-mode]')?.addEventListener('change', (event) => {
    state.wizard.aiMode = event.target.value;
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
  $('[data-ai-import-default]')?.addEventListener('click', importAiKeyFromDefaultPath);
  $('[data-ai-import-select]')?.addEventListener('click', importAiKeyFromSelectedTxt);
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
    state.wizard.status = result.message || 'Demo geprueft.';
    renderPlanWizard();
  }));
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
    state.wizard.status = error.message;
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

async function analyzeWizardCurriculum() {
  state.wizard.status = 'Curriculum wird analysiert ...';
  renderPlanWizard();
  try {
    const anchor = await desktop.factory.createCurriculumAnchor({
      type: state.wizard.anchorType,
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
      containerProfile: state.wizard.containerProfile,
      aiMode: state.wizard.aiMode
    });
    state.wizard.approvedCurriculumPlan = null;
    state.wizard.coursePlan = curriculumToCoursePlan(state.wizard.curriculumDraft);
    state.wizard.selectedDayNumber = state.wizard.curriculumDraft.days[0]?.dayNumber || 1;
    state.wizard.status = 'CurriculumPlanDraft erzeugt. Bitte pruefen und freigeben.';
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
    state.wizard.status = 'Curriculum freigegeben. Tagesentwuerfe sind jetzt moeglich.';
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
    difficulty: 'normal',
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
  state.wizard.status = 'Alle Tagesentwuerfe werden erzeugt ...';
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
      aiMode: state.wizard.aiMode
    });
    state.wizard.dayDraft = state.wizard.dayResults[0] || null;
    state.wizard.status = `${state.wizard.dayResults.length} Tagesentwuerfe erzeugt.`;
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
    selectedPresetId: state.wizard.selectedPresetId,
    dayResults,
    ...overrides
  };
}

async function runWizardPreflight() {
  state.wizard.status = 'Preflight wird geprueft ...';
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
  state.wizard.status = 'Prompt Quality Gate wird geprueft ...';
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
    if (state.wizard.costEstimate.warning && !confirmWarnings && !window.confirm(`Geschaetzte Kosten: ca. ${state.wizard.costEstimate.estimatedCostUsd} USD. Fortfahren?`)) {
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
    state.wizard.status = result.requiresConfirmation ? 'Preflight-Warnungen bestaetigen oder korrigieren.' : `Testlauf ${result.status}.`;
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

async function importAiKeyFromDefaultPath() {
  state.wizard.status = 'OpenAI-Key wird vom Standardpfad uebernommen ...';
  renderPlanWizard();
  try {
    state.aiImportResult = await desktop.factory.importOpenAiKeyFromDefaultPath();
    await refreshAiStatus();
  } catch (error) {
    state.aiImportResult = { success: false, message: error.message };
    renderPlanWizard();
  }
}

async function importAiKeyFromSelectedTxt() {
  state.wizard.status = 'TXT-Datei wird ausgewaehlt ...';
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
  state.wizard.status = 'Letzter Test-Draft wird geloescht ...';
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
      learnerTask: state.wizard.targetAudience.needsStepByStep ? `${topic.title} Schritt fuer Schritt bearbeiten.` : `${topic.title} anwenden.`,
      evaluation: `Ergebnis zu ${topic.title} pruefen.`,
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
      ${file.blocked ? '<p class="status-line status-error">Gesperrt: Datei wird nicht exportiert oder ausgefuehrt.</p>' : ''}
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
  state.presets = data.presets || [];
  state.storageUsage = data.storageUsage || state.storageUsage;
  state.targetAreas = data.targetAreas || [];
  state.targetAreaLabels = data.targetAreaLabels || {};
  renderContainers();
  renderBatches();
  renderReferences();
  renderPlanWizard();
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
    status.textContent = 'Bitte bestaetige zuerst die interne reference-only Nutzung.';
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
          <p>${escapeHtml(item.generatedSummary || 'Diese Quelle enthaelt wahrscheinlich passende Inhalte zum Suchthema.')}</p>
        </article>
      `).join('')
      : '<p class="status-line">Keine Treffer. Es werden keine vollstaendigen Chunks angezeigt.</p>';
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
  const files = Array.from($('[data-import-files]').files || []).map((file) => ({
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
    const confirmed = window.confirm(`Warnungen vorhanden:\n${firstResult.validation.warnings.join('\n')}\n\nTrotzdem veroeffentlichen?`);
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
    document.body.innerHTML = '<main class="tool-card"><h1>Factory API nicht verfuegbar</h1></main>';
    return;
  }
  $all('[data-factory-tab]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.factoryTab)));
  $all('[data-open-factory-section]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.openFactorySection)));
  $('[data-open-landing]').addEventListener('click', () => desktop.openLanding());
  $('[data-refresh]').addEventListener('click', loadState);
  $('[data-run-duplicate]').addEventListener('click', duplicateContainer);
  $('[data-run-import]').addEventListener('click', importRawFiles);
  $('[data-import-references]').addEventListener('click', importReferences);
  $('[data-search-references]').addEventListener('click', searchReferences);
  $('[data-validate-batch]').addEventListener('click', validateBatch);
  $('[data-create-from-batch]').addEventListener('click', createContainerFromBatch);
  await loadState();
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${escapeHtml(error.message)}</p>`);
});
