const storageKey = 'ploglan-content-factory-lab-wizard-v1';

const departments = [
  ['FIAE', 'FIAE'],
  ['FISI', 'FISI'],
  ['KABUE', 'KABUE'],
  ['KITS', 'KiTS'],
  ['ALLGEMEIN', 'Allgemein']
];

const steps = [
  ['course-data', 'Kursdaten', 'Kursdaten'],
  ['course-plan', 'Unterrichtsplan', 'Unterrichtsplan'],
  ['uploads', 'Uploads', 'Materialien hochladen'],
  ['review', 'Pruefung', 'Uploads pruefen'],
  ['day-mapping', 'Zuordnung', 'Tageszuordnung'],
  ['gap-analysis', 'Luecken', 'Lueckenanalyse'],
  ['day-preview', 'Vorschau', 'Tagesvorschau'],
  ['approval', 'Freigabe', 'Korrektur & Freigabe'],
  ['export', 'Export', 'Export / Draft erzeugen']
];

const uploadCategories = [
  {
    area: 'ai-materials',
    title: 'Materialien mittels KI generieren',
    description: 'Nutzen Sie diese Option, wenn keine fertigen Materialien vorhanden sind. Die ContentFactory erzeugt spaeter Basisentwuerfe aus Unterrichtsplan, Kursdaten und offenen Lernzielen.',
    examples: ['Webvarianten aus Unterrichtsplan', 'Basisaufgaben je Tag', 'Quizideen', 'Projektkontext als Entwurf'],
    accept: '',
    safety: 'Es muss nichts anderes hochgeladen werden. Der Export bleibt ein Draft und sollte fachlich geprueft werden.',
    actionOnly: true
  },
  {
    area: 'zip-package',
    title: 'Komplettes Materialpaket als ZIP hochladen',
    description: 'Nutzen Sie diesen Bereich, wenn alle Kursdateien bereits in einem Ordner gesammelt wurden. Der Unterrichtsplan muss trotzdem separat im vorherigen Schritt hochgeladen werden.',
    examples: ['gesammelter Kursordner', 'Altsystem-Export', 'Materialpaket pro Lernfeld'],
    accept: '.zip',
    safety: '.git wird ignoriert, node_modules wird ignoriert, ausfuehrbare Dateien werden blockiert, .env-Dateien werden nicht exportiert, Quellcode und SQL werden nicht ausgefuehrt.'
  },
  {
    area: 'materials',
    title: 'Unterrichtsmaterialien',
    description: 'Hier gehoeren Materialien hinein, mit denen Inhalte erklaert werden.',
    examples: ['Praesentationen', 'Handouts', 'Webvarianten', 'zentrale Wissensvermittlung', 'Notebooks mit Theorie'],
    accept: '.pptx,.pdf,.docx,.md,.html,.ipynb,.zip'
  },
  {
    area: 'tasks',
    title: 'Aufgaben',
    description: 'Hier gehoeren Aufgaben hinein, die Teilnehmer bearbeiten sollen.',
    examples: ['Aufgabenblaetter', 'Notebook-Aufgaben', 'HTML-Aufgaben', 'Uebungsdateien'],
    accept: '.html,.md,.pdf,.docx,.ipynb,.json,.zip'
  },
  {
    area: 'solutions',
    title: 'Loesungen',
    description: 'Hier gehoeren Loesungsvorschlaege oder Dozentenfassungen hinein.',
    examples: ['Musterloesungen', 'Dozenten-Notebooks', 'Loesungs-PDFs', 'Loesungscode'],
    accept: '.html,.md,.pdf,.docx,.ipynb,.java,.cs,.sql,.zip',
    safety: 'Loesungen werden spaeter automatisch vom Teilnehmerbereich getrennt.'
  },
  {
    area: 'quiz',
    title: 'Fragenpools / Quiz',
    description: 'Hier gehoeren vorhandene Fragenpools hinein.',
    examples: ['JSON-Fragenpool', 'XML-Fragenpool', 'Word-Fragenkatalog', 'TXT-Fragensammlung'],
    accept: '.json,.xml,.docx,.txt,.zip'
  },
  {
    area: 'project',
    title: 'Projektmaterialien',
    description: 'Materialien fuer ein durchgehendes Projekt oder Szenario.',
    examples: ['Projektszenario', 'Ausgangssituation', 'Startercode', 'Bilder', 'Loesungsversion'],
    accept: '.zip,.html,.css,.js,.java,.cs,.php,.sql,.png,.jpg,.pdf,.docx'
  },
  {
    area: 'source-code',
    title: 'Quellcode',
    description: 'Technische Dateien als Beispiel, Startercode oder Loesungscode.',
    examples: ['HTML/CSS/JavaScript', 'Java', 'C#', 'PHP', 'Python', 'TypeScript'],
    accept: '.html,.css,.js,.ts,.tsx,.jsx,.php,.java,.cs,.py,.zip',
    safety: 'Quellcode wird analysiert, aber nicht ausgefuehrt.'
  },
  {
    area: 'database',
    title: 'Datenbank / SQL',
    description: 'SQL-Dateien und Datenbankmaterialien. Die ContentFactory erkennt DDL, DML, SELECT, Views, Trigger und Prozeduren.',
    examples: ['CREATE TABLE', 'INSERT-Testdaten', 'SELECT-Aufgaben', 'JOIN-Abfragen', 'Stored Procedures'],
    accept: '.sql,.csv,.zip',
    safety: 'SQL wird aus Sicherheitsgruenden nicht automatisch ausgefuehrt.'
  },
  {
    area: 'assets',
    title: 'Assets / Medien',
    description: 'Bilder, Icons oder Begleitdateien fuer Aufgaben, Projekte oder Webvarianten.',
    examples: ['Screenshots', 'Bilder', 'Icons', 'SVGs', 'Projektgrafiken'],
    accept: '.png,.jpg,.jpeg,.svg,.webp,.gif,.zip'
  },
  {
    area: 'reference-literature',
    title: 'Referenzliteratur / Fachquellen',
    description: 'Eigene lizenzierte Fachquellen nur als lokale interne Referenz fuer Analyse und KI-Kontext.',
    examples: ['PDF-Fachbuch', 'EPUB', 'eigene Dokumentation', 'Fachartikel'],
    accept: '.pdf,.epub,.docx,.txt,.md,.html,.zip',
    safety: 'Referenzliteratur bleibt reference-only, wird nicht in Kurscontainer kopiert und nicht an Teilnehmer exportiert.'
  },
  {
    area: 'other',
    title: 'Sonstige Dateien',
    description: 'Dateien, die nicht eindeutig erkannt werden. Sie koennen spaeter manuell zugeordnet, ignoriert oder als Begleitmaterial uebernommen werden.',
    examples: ['unbekannte Dateitypen', 'alte Exportdateien', 'zusaetzliche Materialien'],
    accept: ''
  }
];

let state = loadState();
let lockedMessage = '';

function defaultState() {
  return {
    activeStep: 'course-data',
    course: { courseName: '', courseId: '', department: '', mode: 'daily', description: '' },
    coursePlan: null,
    coursePlanConfirmed: false,
    aiMode: 'local',
    aiStatusMessages: [],
    aiMaterialsEnabled: false,
    files: [],
    analysisCompleted: false,
    reviewStates: {},
    mappings: [],
    gaps: [],
    gapStates: {},
    dayDrafts: [],
    previews: [],
    dayApproval: {},
    allowDraftWithOpenWarnings: false,
    draft: null
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (parsed?.course && Array.isArray(parsed.files)) return parsed;
  } catch {}
  return defaultState();
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function render() {
  document.querySelector('#app').innerHTML = `
    <div class="lab-shell">
      <header class="lab-header">
        <div>
          <p class="eyebrow">ContentFactory Standalone Lab</p>
          <h1>Plan &rarr; KI/Fallback &rarr; Container</h1>
          <p>Dieser Assistent erstellt aus Kursdaten, Unterrichtsplan und optionalen Rohmaterialien einen KI-/Fallback-gestuetzten Dual-Mode-Kurscontainer-Draft.</p>
        </div>
        <div class="header-actions">
          <button data-action="reset" class="secondary-button">Lab zuruecksetzen</button>
          <button data-action="export-state" class="primary-button">Lab-Stand speichern</button>
        </div>
      </header>
      ${renderProgress()}
      <div class="wizard-layout">
        <aside class="missing-panel">${renderMissingPanel()}</aside>
        <main>${renderActiveStep()}</main>
      </div>
    </div>
  `;
  bindEvents();
}

function renderProgress() {
  return `
    <nav class="steps" aria-label="Wizard Fortschritt">
      ${steps.map(([id, shortLabel, title]) => {
        const gate = getGate(id);
        return `<button class="step-button status-${gate.status} ${state.activeStep === id ? 'is-active' : ''}" data-step="${id}" data-locked="${gate.accessible ? 'false' : 'true'}">
          <span>${shortLabel}</span><small>${gate.status}</small>
        </button>`;
      }).join('')}
    </nav>
    ${lockedMessage ? `<p class="locked-notice">${escapeHtml(lockedMessage)}</p>` : ''}
  `;
}

function renderMissingPanel() {
  const missing = steps.flatMap(([id]) => getGate(id).missing).filter(uniqueFilter);
  return `
    <h2>Was fehlt noch?</h2>
    ${missing.length ? `<ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>Alle Voraussetzungen fuer den aktuellen Stand sind erfuellt.</p>'}
    <div class="context-box">
      <strong>Was wird gespeichert?</strong>
      <p>Nur Lab-Daten im Browser und exportierte Draft-Dateien. Es wird nichts automatisch veroeffentlicht.</p>
    </div>
  `;
}

function renderActiveStep() {
  const renderers = {
    'course-data': renderCourseDataStep,
    'course-plan': renderCoursePlanStep,
    uploads: renderUploadStep,
    review: renderReviewStep,
    'day-mapping': renderDayMappingStep,
    'gap-analysis': renderGapAnalysisStep,
    'day-preview': renderDayPreviewStep,
    approval: renderApprovalStep,
    export: renderExportStep
  };
  return renderers[state.activeStep]();
}

function stepShell(id, title, intro, why, content, nextLabel = 'Weiter') {
  const gate = getGate(id);
  const next = getNextStep(id);
  const nextGate = next ? getGate(next) : null;
  return `
    <section class="panel">
      <div class="section-heading">
        <div><p class="eyebrow">Schritt ${steps.findIndex(([step]) => step === id) + 1}</p><h2>${title}</h2></div>
        <span class="status-badge status-${gate.status}">${gate.status}</span>
      </div>
      <div class="help-grid">
        <article class="context-box"><strong>Was passiert hier?</strong><p>${intro}</p></article>
        <article class="context-box"><strong>Warum ist das wichtig?</strong><p>${why}</p></article>
      </div>
      ${content}
      <div class="button-row">
        ${next ? `<button class="primary-button" data-action="next" data-next="${next}" data-next-button ${nextGate.accessible ? '' : 'disabled'}>${nextLabel}</button>` : ''}
        ${nextGate ? `<span class="status warning" data-next-warning ${nextGate.accessible ? 'hidden' : ''}>${escapeHtml(nextGate.missing[0] || '')}</span>` : ''}
      </div>
    </section>
  `;
}

function renderCourseDataStep() {
  const suggestion = createCourseIdSuggestion(state.course.courseName);
  return stepShell(
    'course-data',
    'Kursdaten',
    'Sie legen Name, stabile Kurs-ID, Fachbereich und Zielmodus fuer den spaeteren Container fest.',
    'Die Kurs-ID wird fuer Speicherung, Freigabe und Zuordnung genutzt und sollte dauerhaft stabil bleiben.',
    `
      <div class="form-grid">
        <label>Kursname<input data-field="courseName" value="${escapeAttribute(state.course.courseName)}" placeholder="Kursname"></label>
        <label>Kurs-ID<input data-field="courseId" value="${escapeAttribute(state.course.courseId)}" placeholder="Kurs-ID"></label>
        <label>Fachbereich<select data-field="department"><option value="">Bitte waehlen</option>${departments.map(([value, label]) => `<option value="${value}" ${state.course.department === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label>Zielmodus<select data-field="mode"><option value="daily" ${state.course.mode === 'daily' ? 'selected' : ''}>Tagesweise ohne Projekt</option><option value="project" ${state.course.mode === 'project' ? 'selected' : ''}>Kurs als durchgehendes Projekt</option></select></label>
      </div>
      <label>Beschreibung optional<textarea data-field="description">${escapeHtml(state.course.description)}</textarea></label>
      <div data-course-id-suggestion>${renderCourseIdSuggestion(suggestion)}</div>
      <div data-course-errors>${renderMessages(validateCourseData(), 'error')}</div>
    `
  );
}

function renderCourseIdSuggestion(suggestion) {
  if (!state.course.courseName || state.course.courseId === suggestion || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.course.courseId)) {
    return '';
  }
  return `<p class="warning">Vorschlag Kurs-ID: <button class="link-button" data-action="use-suggestion" data-suggestion="${escapeAttribute(suggestion)}">${escapeHtml(suggestion)}</button></p>`;
}

function renderCoursePlanStep() {
  return stepShell(
    'course-plan',
    'Unterrichtsplan',
    'Der Unterrichtsplan wird hochgeladen und als Chronologie fuer Tage, Themen und Lernziele bestaetigt.',
    'Ohne verlaessliche Chronologie kann die ContentFactory nicht erkennen, welche Materialien zu welchem Tag gehoeren.',
    `
      <label class="upload-drop" data-plan-drop>
        <span>Unterrichtsplan hier ablegen</span>
        <small>oder Datei auswaehlen (.xlsx, .xlsm, .docx, .pdf)</small>
        <input type="file" multiple data-plan-upload accept=".xlsx,.xlsm,.docx,.pdf,.zip">
      </label>
      ${state.coursePlan ? renderPlanSummary() : '<p class="warning">Der Unterrichtsplan ist verpflichtend.</p>'}
      <button class="primary-button" data-action="confirm-plan" ${state.coursePlan ? '' : 'disabled'}>Unterrichtsplan bestaetigen</button>
    `
  );
}

function renderPlanSummary() {
  return `
    <div class="summary-grid">
      <span>Datei erkannt: ${escapeHtml(state.coursePlan.sourceFile || state.coursePlan.courseTitle)}</span>
      <span>Anzahl Tabellenblaetter: ${(state.coursePlan.availableSheets || ['Tabelle1']).length}</span>
      <span>Erkannte Kurstage: ${state.coursePlan.days.length}</span>
      <span>Ausgewaehltes Sheet: ${escapeHtml(state.coursePlan.selectedSheet || 'Tabelle1')}</span>
      <span>Erkannte Themen: ${state.coursePlan.days.filter((day) => day.mainTopic).length}</span>
      <span>Erkannte Lernziele: ${state.coursePlan.days.reduce((sum, day) => sum + day.learningGoals.length, 0)}</span>
      <span>Status: ${state.coursePlanConfirmed ? 'bestaetigt' : 'noch nicht bestaetigt'}</span>
    </div>
    <label>Planvariante / Sheet<select data-plan-sheet>${(state.coursePlan.availableSheets || ['Tabelle1']).map((sheet) => `<option value="${escapeAttribute(sheet)}" ${state.coursePlan.selectedSheet === sheet ? 'selected' : ''}>${escapeHtml(sheet)}</option>`).join('')}</select></label>
    <div class="day-grid">${state.coursePlan.days.map((day) => `<article class="day-card"><div class="day-card-head"><h3>Tag ${day.dayNumber}: ${escapeHtml(day.title)}</h3><span>${(day.ueBlocks || []).length} UE</span></div><p>${escapeHtml(day.mainTopic)}</p>${bucket('Lernziele', (day.learningGoals || []).map((item) => ({ fileName: item })))}${bucket('Ressourcen', (day.requiredOutputs || []).map((item) => ({ fileName: item })))}</article>`).join('')}</div>
    ${renderMessages(state.coursePlan.warnings || [], 'warning')}
  `;
}

function renderUploadStep() {
  return stepShell(
    'uploads',
    'Materialien hochladen',
    'Sie koennen Materialien optional ergaenzen. Fuer den Minimal-MVP reicht der bestaetigte Unterrichtsplan.',
    'Die klare Trennung verhindert spaeter, dass Loesungen, Quellcode, SQL oder Assets falsch einsortiert werden.',
    `<div class="upload-grid">${uploadCategories.map(renderUploadCard).join('')}</div><p class="status">${state.files.length} Datei(en) im Lab-State.</p>`,
    'Uploads pruefen'
  );
}

function renderUploadCard(category) {
  const files = state.files.filter((file) => file.uploadArea === category.area);
  const count = files.length;
  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const zipCount = files.filter((file) => file.extension === '.zip').length;
  const warnings = files.flatMap((file) => file.warnings || []).filter(uniqueFilter);
  return `
    <article class="upload-card">
      <div class="upload-card-header"><strong>${category.title}</strong><span>${count} Datei(en)</span></div>
      <p>${category.description}</p>
      <small>Speicher: ${formatBytes(totalSize)} | ZIPs: ${zipCount}</small>
      <small>Beispiele: ${category.examples.join(', ')}</small>
      <small>${category.actionOnly ? 'Dateitypen: keine Datei notwendig' : `Dateitypen: ${category.accept || 'sonstige'}`}</small>
      ${category.safety ? `<p class="safety">${category.safety}</p>` : ''}
      ${warnings.map((warning) => `<p class="warning">${escapeHtml(warning)}</p>`).join('')}
      ${category.actionOnly ? `<button class="file-button ai-generate-button" type="button" data-action="enable-ai-materials"><span>KI-Materialien nutzen</span><small>${state.aiMaterialsEnabled ? 'aktiviert' : 'statt Uploads verwenden'}</small></button>` : `<label class="file-button" data-drop-area="${category.area}">
        <span>Dateien hier ablegen</span>
        <small>oder Dateien hinzufuegen</small>
        <input type="file" multiple data-upload-area="${category.area}" ${category.accept ? `accept="${category.accept}"` : ''}>
      </label>`}
    </article>
  `;
}

function renderReviewStep() {
  const grouped = groupBy(state.files, (file) => reviewGroup(file));
  const groups = ['Unterrichtsmaterialien', 'Aufgaben', 'Loesungen', 'Quizdateien', 'Projektmaterialien', 'Quellcode', 'SQL-Dateien', 'Assets', 'Unklare Dateien', 'Blockierte Dateien'];
  return stepShell(
    'review',
    'Uploads pruefen',
    'Die ContentFactory zeigt erkannte Kategorien, Tag-Vermutung, Confidence, Warnungen und notwendige Aktionen.',
    'Unklare oder blockierte Dateien muessen bewusst bestaetigt, korrigiert oder ignoriert werden, bevor es weitergeht.',
    `
      <button class="primary-button" data-action="run-analysis" ${state.coursePlanConfirmed ? '' : 'disabled'}>Plan analysieren und Kurstage erzeugen</button>
      ${renderAnalysisSummary()}
      ${groups.map((group) => renderFileReviewTable(group, grouped[group] || [])).join('')}
    `,
    'Tageszuordnung'
  );
}

function renderAnalysisSummary() {
  if (!state.analysisCompleted) {
    return '<p class="status">Noch keine Dateianalyse ausgefuehrt.</p>';
  }
  const blocked = state.files.filter((file) => file.blocked).length;
  const review = openReviewFiles().length;
  const mappedDays = state.mappings.filter((mapping) => mapping.files.length).length;
  const gaps = state.gaps.filter((gap) => gap.state === 'open').length;
  return `
    <div class="analysis-summary">
      <strong>Dateianalyse abgeschlossen</strong>
      <span>${state.files.length} Datei(en) analysiert</span>
      <span>${mappedDays} Tag(e) mit Zuordnung</span>
      <span>${review} Datei(en) noch zu pruefen</span>
      <span>${blocked} blockierte Datei(en)</span>
      <span>${gaps} offene Hinweis(e)</span>
    </div>
  `;
}

function renderFileReviewTable(group, files) {
  if (!files.length) return '';
  return `
    <article class="review-group">
      <h3>${group}</h3>
      <div class="file-table-wrap">
        <table class="file-table">
          <colgroup>
            <col class="col-file">
            <col class="col-type">
            <col class="col-category">
            <col class="col-day">
            <col class="col-confidence">
            <col class="col-action">
          </colgroup>
          <thead>
            <tr>
              <th>Datei</th>
              <th>Typ</th>
              <th>Kategorie</th>
              <th>Tag</th>
              <th>Confidence</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
        ${files.map((file) => `
          <tr class="${reviewRowClass(file)}">
            <td><span class="file-name" title="${escapeAttribute(file.fileName)}">${escapeHtml(file.fileName)}</span></td>
            <td><span class="type-cell">${escapeHtml(technicalTypeLabel(file.technicalType))}</span></td>
            <td><select data-review-category="${file.fileId}">${categoryOptions(file.contentCategory)}</select></td>
            <td><input type="number" min="1" max="99" data-review-day="${file.fileId}" value="${file.detectedDay || ''}"></td>
            <td>${Math.round(file.confidence * 100)}%</td>
            <td><span class="row-actions">
              <button data-action="confirm-file" data-file="${file.fileId}" ${state.reviewStates[file.fileId] === 'confirmed' ? 'disabled' : ''}>${state.reviewStates[file.fileId] === 'confirmed' ? 'bestaetigt' : 'bestaetigen'}</button>
              <button data-action="ignore-file" data-file="${file.fileId}" ${state.reviewStates[file.fileId] === 'ignored' ? 'disabled' : ''}>${state.reviewStates[file.fileId] === 'ignored' ? 'ignoriert' : 'ignorieren'}</button>
            </span></td>
          </tr>
          ${renderFileWarningRow(file)}
        `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function reviewRowClass(file) {
  const stateValue = state.reviewStates[file.fileId];
  if (stateValue === 'confirmed') return 'is-confirmed';
  if (stateValue === 'ignored' || file.ignored) return 'is-ignored';
  if (file.blocked) return 'is-blocked';
  if (file.needsReview) return 'needs-review';
  return '';
}

function renderFileWarningRow(file) {
  if (state.reviewStates[file.fileId] === 'confirmed') {
    return `<tr class="file-review-status"><td colspan="6"><strong>Bestaetigt:</strong> Diese Datei ist geprueft und wird fuer die Zuordnung verwendet.</td></tr>`;
  }
  if (state.reviewStates[file.fileId] === 'ignored' || file.ignored) {
    return `<tr class="file-review-status is-ignored"><td colspan="6"><strong>Ignoriert:</strong> Diese Datei wird nicht fuer den Draft verwendet.</td></tr>`;
  }
  const text = (file.warnings || []).join(' | ') || (file.needsReview ? 'Bitte pruefen' : '');
  if (!text) return '';
  return `
    <tr class="file-warning-row">
      <td colspan="6">
        <strong>Warnung:</strong> ${escapeHtml(text)}
      </td>
    </tr>
  `;
}

function renderDayMappingStep() {
  return stepShell(
    'day-mapping',
    'Tageszuordnung',
    'Alle Kurstage werden als Matrix angezeigt: Themen, Materialien, Aufgaben, Loesungen, Quiz, Projekt, Quellcode und SQL.',
    'Sie sehen sofort, welche Tage vollstaendig sind und wo die ContentFactory nur einen Basisentwurf aus dem Unterrichtsplan erzeugen kann.',
    `
      <div class="day-grid">${state.mappings.map(renderDayMappingCard).join('') || '<p class="warning">Bitte zuerst Dateianalyse ausfuehren.</p>'}</div>
    `,
    'Lueckenanalyse'
  );
}

function renderDayMappingCard(mapping) {
  const count = mapping.files.length;
  const status = state.dayApproval[mapping.dayNumber] || (count ? 'warning' : 'empty');
  return `
    <article class="day-card status-${status}">
      <div class="day-card-head"><h3>Tag ${mapping.dayNumber}: ${escapeHtml(mapping.planDay.title)}</h3><span>${status}</span></div>
      <p>${escapeHtml(mapping.planDay.mainTopic)}</p>
      ${bucket('Materialien', mapping.files)}
      ${bucket('Aufgaben', mapping.tasks)}
      ${bucket('Loesungen', mapping.solutions)}
      ${bucket('Quiz', mapping.quizzes)}
      ${bucket('Projektmaterial', mapping.projectFiles)}
      ${bucket('Quellcode', mapping.sourceCode)}
      ${bucket('SQL', mapping.databaseFiles)}
      ${!count ? '<p class="warning">Fuer diesen Tag wurden keine passenden Materialien gefunden. Die ContentFactory kann einen Basisentwurf aus dem Unterrichtsplan erzeugen.</p>' : ''}
      <div class="button-row">
        <button data-action="confirm-day" data-day="${mapping.dayNumber}">Zuordnung bestaetigen</button>
        <button data-action="skip-day" data-day="${mapping.dayNumber}">Tag spaeter pruefen</button>
      </div>
    </article>
  `;
}

function renderGapAnalysisStep() {
  const groups = ['critical', 'important', 'info', 'auto', 'review'];
  return stepShell(
    'gap-analysis',
    'Lueckenanalyse',
    'Offene Probleme werden in normaler Sprache gruppiert und koennen einzeln behandelt werden.',
    'Kritische Luecken blockieren die Tagesvorschau, damit kein unbrauchbarer Draft entsteht.',
    `${renderGapSummary()}${groups.map((severity) => renderGapGroup(severity)).join('') || '<p class="status">Keine Luecken gefunden. Sie koennen mit der Tagesvorschau fortfahren.</p>'}`,
    'Tagesvorschau'
  );
}

function renderGapSummary() {
  const openCritical = state.gaps.filter((gap) => gap.severity === 'critical' && gap.state === 'open').length;
  const openTotal = state.gaps.filter((gap) => gap.state === 'open').length;
  const handled = state.gaps.filter((gap) => gap.state !== 'open').length;
  const canContinue = openCritical === 0;
  return `
    <div class="gap-summary ${canContinue ? 'can-continue' : 'is-blocked'}" data-gap-summary>
      <strong>${canContinue ? 'Tagesvorschau moeglich' : 'Tagesvorschau noch gesperrt'}</strong>
      <span>${openCritical} kritische Luecke(n) offen</span>
      <span>${openTotal} offene Luecke(n) gesamt</span>
      <span>${handled} behandelt</span>
      <p>${canContinue ? 'Alle kritischen Luecken sind behandelt. Hinweise koennen spaeter im Draft weiterbearbeitet werden.' : 'Bitte behandeln Sie zuerst alle kritischen Luecken. Danach wird die Tagesvorschau freigegeben.'}</p>
    </div>
  `;
}

function renderGapGroup(severity) {
  const items = state.gaps.filter((gap) => gap.severity === severity);
  if (!items.length) return '';
  return `
    <article class="gap-group">
      <h3>${gapLabel(severity)}</h3>
      ${items.map((gap) => `
        <div class="gap-row ${gap.state === 'open' ? 'is-open' : 'is-handled'} ${gap.severity === 'critical' ? 'is-critical' : ''}">
          <span>${escapeHtml(gap.message)}</span>
          <select data-gap-state="${gap.id}">
            ${['open', 'ignored', 'later', 'reassigned', 'fallback-allowed', 'material-needed'].map((value) => `<option value="${value}" ${gap.state === value ? 'selected' : ''}>${gapActionLabel(value)}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    </article>
  `;
}

function renderDayPreviewStep() {
  return stepShell(
    'day-preview',
    'Tagesvorschau',
    'Sie waehlen den AI-Modus und erzeugen pro Tag einen strukturierten Tagesentwurf mit Webvarianten, Aufgaben, Loesungshinweisen und Quizplatzhalter.',
    'So pruefen Sie den Draft, bevor er exportiert wird. Der naechste Tag wird erst nach Bestaetigung oder bewusstem Ueberspringen freigegeben.',
    `
      <label>AI-Modus<select data-field="aiMode">
        <option value="local" ${state.aiMode === 'local' ? 'selected' : ''}>Lokal / ohne KI</option>
        <option value="ai-generate" ${state.aiMode === 'ai-generate' ? 'selected' : ''}>OpenAI, falls konfiguriert</option>
        <option value="ai-generate-review" ${state.aiMode === 'ai-generate-review' ? 'selected' : ''}>OpenAI + Review, falls konfiguriert</option>
        <option value="ai-generate-review-repair" ${state.aiMode === 'ai-generate-review-repair' ? 'selected' : ''}>OpenAI + Review + Repair, falls konfiguriert</option>
      </select></label>
      <p class="status">${state.aiMode === 'local' ? 'AI_PROVIDER=local: Der lokale Fallback wird verwendet.' : 'OpenAI ist nicht konfiguriert. Der lokale Fallback wird verwendet.'}</p>
      ${renderMessages(state.aiStatusMessages || [], 'warning')}
      <button class="primary-button" data-action="generate-previews">Tagesentwuerfe erzeugen</button>
      <div class="preview-grid">${state.previews.map(renderPreviewCard).join('')}</div>
    `,
    'Korrektur & Freigabe'
  );
}

function renderPreviewCard(preview) {
  const approval = state.dayApproval[preview.dayNumber] || 'open';
  return `
    <article class="preview-card">
      <div class="day-card-head"><h3>Tag ${preview.dayNumber}: ${escapeHtml(preview.title)}</h3><span>${approval}</span></div>
      <div class="tab-strip"><span>Uebersicht</span><span>Webvariante</span><span>Aufgaben</span><span>Loesungen</span><span>Quiz</span><span>Projektkontext</span><span>Quellen</span><span>Warnungen</span></div>
      <iframe title="Tag ${preview.dayNumber}" srcdoc="${escapeAttribute(preview.html)}"></iframe>
      ${renderMessages(preview.warnings || [], 'warning')}
      <button data-action="confirm-preview-day" data-day="${preview.dayNumber}">Tag bestaetigen</button>
    </article>
  `;
}

function renderApprovalStep() {
  return stepShell(
    'approval',
    'Korrektur & Freigabe',
    'Sie formulieren Korrekturwuensche pro Tag, erzeugen Entwuerfe neu oder geben Tage fuer den Draft-Export frei.',
    'Freigabe bedeutet nur: fuer Export/Draft bestaetigt. Es wird nichts fuer Teilnehmer veroeffentlicht.',
    `
      ${state.previews.map((preview) => `
        <article class="correction-card">
          <h3>Tag ${preview.dayNumber}: ${escapeHtml(preview.title)}</h3>
          <label>Was soll an diesem Tag geaendert werden?<textarea data-correction="${preview.dayNumber}" placeholder="Aufgaben leichter formulieren&#10;Mehr Projektbezug einbauen&#10;SQL noch nicht verwenden">${escapeHtml(preview.correctionText || '')}</textarea></label>
          <div class="button-row">
            <button data-action="apply-correction" data-day="${preview.dayNumber}">Korrektur anwenden</button>
            <button data-action="regenerate-day" data-day="${preview.dayNumber}">Entwurf neu erzeugen</button>
            <button data-action="release-day" data-day="${preview.dayNumber}">Tag freigeben</button>
            <button data-action="reset-day" data-day="${preview.dayNumber}">Tag zuruecksetzen</button>
          </div>
        </article>
      `).join('')}
      <label class="checkline"><input type="checkbox" data-field="allowDraftWithOpenWarnings" ${state.allowDraftWithOpenWarnings ? 'checked' : ''}> Draft mit offenen Punkten exportieren</label>
    `,
    'Export'
  );
}

function renderExportStep() {
  const summary = createExportSummary();
  return stepShell(
    'export',
    'Export / Draft erzeugen',
    'Der Export erzeugt einen Draft-Container oder ein Analysepaket. Es wird nichts automatisch veroeffentlicht.',
    'Vor dem Export sehen Sie, welche Inhalte enthalten sind und welche Warnungen offen bleiben.',
    `
      <div class="summary-grid">${Object.entries(summary).map(([key, value]) => `<span><strong>${escapeHtml(key)}</strong><br>${escapeHtml(value)}</span>`).join('')}</div>
      ${state.allowDraftWithOpenWarnings ? '<p class="warning">Es gibt noch offene Warnungen. Sie koennen trotzdem einen Draft exportieren, aber dieser sollte nicht final veroeffentlicht werden.</p>' : ''}
      <div class="button-row">
        <button class="primary-button" data-action="build-draft">Draft-Container erzeugen</button>
        <button class="secondary-button" data-action="download-draft" ${state.draft ? '' : 'disabled'}>ZIP exportieren</button>
        <button class="secondary-button" data-action="download-report" ${state.draft ? '' : 'disabled'}>Analysebericht exportieren</button>
        <button class="secondary-button" data-action="go-approval">Zurueck zur Korrektur</button>
      </div>
      ${state.draft ? `<pre class="output">${escapeHtml(JSON.stringify(state.draft.analysisReport, null, 2))}</pre>` : ''}
    `
  );
}

function bindEvents() {
  document.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => goStep(button.dataset.step)));
  document.querySelectorAll('[data-field]').forEach((field) => {
    const eventName = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(eventName, handleField);
  });
  document.querySelectorAll('[data-upload-area]').forEach((input) => input.addEventListener('change', handleFiles));
  document.querySelector('[data-plan-upload]')?.addEventListener('change', handlePlanUpload);
  document.querySelector('[data-plan-sheet]')?.addEventListener('change', handlePlanSheetChange);
  document.querySelector('[data-plan-drop]')?.addEventListener('dragover', allowDrop);
  document.querySelector('[data-plan-drop]')?.addEventListener('dragleave', clearDrop);
  document.querySelector('[data-plan-drop]')?.addEventListener('drop', handlePlanDrop);
  document.querySelectorAll('[data-drop-area]').forEach((dropZone) => {
    dropZone.addEventListener('dragover', allowDrop);
    dropZone.addEventListener('dragleave', clearDrop);
    dropZone.addEventListener('drop', handleFileDrop);
  });
  document.querySelector('[data-action="confirm-plan"]')?.addEventListener('click', () => { state.coursePlanConfirmed = true; saveRender(); });
  document.querySelector('[data-action="enable-ai-materials"]')?.addEventListener('click', enableAiMaterials);
  document.querySelector('[data-action="run-analysis"]')?.addEventListener('click', runAnalysis);
  document.querySelector('[data-action="generate-previews"]')?.addEventListener('click', generatePreviews);
  document.querySelector('[data-action="build-draft"]')?.addEventListener('click', buildDraft);
  document.querySelector('[data-action="download-draft"]')?.addEventListener('click', () => downloadJson(`${state.course.courseId}-draft-bundle.json`, state.draft));
  document.querySelector('[data-action="download-report"]')?.addEventListener('click', () => downloadJson(`${state.course.courseId}-analysis-report.json`, state.draft?.analysisReport));
  document.querySelector('[data-action="go-approval"]')?.addEventListener('click', () => { state.activeStep = 'approval'; saveRender(); });
  document.querySelector('[data-action="reset"]')?.addEventListener('click', resetLab);
  document.querySelector('[data-action="export-state"]')?.addEventListener('click', () => downloadJson('content-factory-lab-state.json', state));
  document.querySelector('[data-action="use-suggestion"]')?.addEventListener('click', (event) => { state.course.courseId = event.target.dataset.suggestion; saveRender(); });
  document.querySelectorAll('[data-action="confirm-file"]').forEach((button) => button.addEventListener('click', () => updateReview(button.dataset.file, 'confirmed')));
  document.querySelectorAll('[data-action="ignore-file"]').forEach((button) => button.addEventListener('click', () => updateReview(button.dataset.file, 'ignored')));
  document.querySelectorAll('[data-action="confirm-day"],[data-action="confirm-preview-day"]').forEach((button) => button.addEventListener('click', () => updateDay(button.dataset.day, 'confirmed')));
  document.querySelectorAll('[data-action="skip-day"]').forEach((button) => button.addEventListener('click', () => updateDay(button.dataset.day, 'skipped')));
  document.querySelectorAll('[data-action="release-day"]').forEach((button) => button.addEventListener('click', () => updateDay(button.dataset.day, 'released')));
  document.querySelectorAll('[data-action="reset-day"]').forEach((button) => button.addEventListener('click', () => resetDay(button.dataset.day)));
  document.querySelectorAll('[data-action="regenerate-day"],[data-action="apply-correction"]').forEach((button) => button.addEventListener('click', () => regenerateDay(button.dataset.day)));
  document.querySelectorAll('[data-gap-state]').forEach((select) => select.addEventListener('change', () => updateGap(select.dataset.gapState, select.value)));
  document.querySelector('[data-action="next"]')?.addEventListener('click', (event) => goStep(event.target.dataset.next));
}

function goStep(step) {
  const gate = getGate(step);
  if (!gate.accessible) {
    lockedMessage = `Dieser Schritt ist noch gesperrt. ${gate.missing[0]}`;
    render();
    return;
  }
  lockedMessage = '';
  state.activeStep = step;
  saveRender();
}

function handleField(event) {
  const field = event.target.dataset.field;
  if (field === 'allowDraftWithOpenWarnings') {
    state.allowDraftWithOpenWarnings = event.target.checked;
    saveRender();
    return;
  } else if (field === 'aiMode') {
    state.aiMode = event.target.value;
  } else {
    state.course[field] = event.target.value;
  }
  saveState();
  if (event.target.tagName === 'SELECT') {
    render();
    return;
  }
  updateCourseDataLiveFeedback();
}

function updateCourseDataLiveFeedback() {
  const errorsTarget = document.querySelector('[data-course-errors]');
  if (errorsTarget) errorsTarget.innerHTML = renderMessages(validateCourseData(), 'error');

  const suggestionTarget = document.querySelector('[data-course-id-suggestion]');
  if (suggestionTarget) {
    suggestionTarget.innerHTML = renderCourseIdSuggestion(createCourseIdSuggestion(state.course.courseName));
    suggestionTarget.querySelector('[data-action="use-suggestion"]')?.addEventListener('click', (event) => {
      state.course.courseId = event.target.dataset.suggestion;
      saveRender();
    });
  }

  const nextButton = document.querySelector('[data-next-button]');
  const nextWarning = document.querySelector('[data-next-warning]');
  const next = nextButton?.dataset.next;
  if (!next || !nextButton || !nextWarning) return;
  const nextGate = getGate(next);
  nextButton.disabled = !nextGate.accessible;
  nextWarning.textContent = nextGate.missing[0] || '';
  nextWarning.hidden = nextGate.accessible;
}

function handlePlanUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  files.forEach(addPlanFile);
  event.target.value = '';
}

function handlePlanDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('is-dragging');
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) return;
  files.forEach(addPlanFile);
}

function addPlanFile(file) {
  state.coursePlan = createPlan(file.name);
  state.coursePlanConfirmed = false;
  state.files = state.files.filter((item) => item.uploadArea !== 'course-plan');
  state.files.push(classifyFile(file.name, 'course-plan', file.size));
  saveRender();
}

function handlePlanSheetChange(event) {
  if (!state.coursePlan) return;
  state.coursePlan.selectedSheet = event.target.value;
  state.coursePlan.planVariant = event.target.value;
  state.coursePlanConfirmed = false;
  saveRender();
}

function handleFiles(event) {
  const area = event.target.dataset.uploadArea;
  addUploadFiles(area, event.target.files || []);
  event.target.value = '';
}

function enableAiMaterials() {
  state.aiMaterialsEnabled = true;
  state.files = state.files.filter((file) => file.uploadArea !== 'ai-materials');
  state.files.push({
    fileId: `file-ai-${Date.now().toString(36)}`,
    fileName: 'KI-generierte Materialien',
    uploadArea: 'ai-materials',
    size: 0,
    extension: '',
    technicalType: 'document',
    contentCategory: 'participant-material',
    detectedDay: undefined,
    detectedTopics: [],
    confidence: 0.85,
    needsReview: false,
    warnings: ['Materialien werden aus Unterrichtsplan und Kursdaten als Draft erzeugt.']
  });
  saveRender();
}

function handleFileDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('is-dragging');
  addUploadFiles(event.currentTarget.dataset.dropArea, event.dataTransfer?.files || []);
}

function addUploadFiles(area, files) {
  Array.from(files).forEach((file) => state.files.push(classifyFile(file.name, area, file.size)));
  saveRender();
}

function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add('is-dragging');
}

function clearDrop(event) {
  event.currentTarget.classList.remove('is-dragging');
}

function runAnalysis() {
  state.analysisCompleted = true;
  state.mappings = mapFiles();
  state.gaps = createGaps();
  if (!state.mappings.length && state.coursePlan) state.mappings = mapFiles();
  state.activeStep = 'review';
  saveRender();
}

function updateReview(fileId, value) {
  const category = document.querySelector(`[data-review-category="${fileId}"]`)?.value;
  const day = document.querySelector(`[data-review-day="${fileId}"]`)?.value;
  state.files = state.files.map((file) => file.fileId === fileId ? { ...file, contentCategory: category || file.contentCategory, detectedDay: day ? Number(day) : file.detectedDay, ignored: value === 'ignored' } : file);
  state.reviewStates[fileId] = value;
  state.mappings = mapFiles();
  state.gaps = createGaps();
  saveRender();
}

function updateDay(day, value) {
  state.dayApproval[Number(day)] = value;
  saveRender();
}

function resetDay(day) {
  if (!confirm(`Tag ${day} wirklich zuruecksetzen?`)) return;
  delete state.dayApproval[Number(day)];
  state.previews = state.previews.filter((preview) => preview.dayNumber !== Number(day));
  saveRender();
}

function updateGap(gapId, value) {
  state.gaps = state.gaps.map((gap) => gap.id === gapId ? { ...gap, state: value } : gap);
  saveState();
  render();
}

function generatePreviews() {
  state.dayDrafts = state.mappings.map((mapping) => createLocalDayGenerationResult(mapping));
  state.previews = state.mappings.map((mapping) => createPreviewFromDayDraft(mapping, state.dayDrafts.find((draft) => draft.dayNumber === mapping.dayNumber)));
  state.aiStatusMessages = state.aiMode === 'local'
    ? ['Lokaler Fallback hat strukturierte Tagesentwuerfe erzeugt.']
    : ['OpenAI ist nicht konfiguriert. Der lokale Fallback wurde verwendet.'];
  saveRender();
}

function regenerateDay(day) {
  const dayNumber = Number(day);
  const correctionText = document.querySelector(`[data-correction="${dayNumber}"]`)?.value || '';
  const mapping = state.mappings.find((item) => item.dayNumber === dayNumber);
  if (!mapping) return;
  const next = createPreview(mapping, correctionText);
  state.previews = state.previews.filter((preview) => preview.dayNumber !== dayNumber).concat(next).sort((a, b) => a.dayNumber - b.dayNumber);
  saveRender();
}

function buildDraft() {
  if (!state.coursePlan) {
    alert('Unterrichtsplan ist Pflicht fuer Containerexport.');
    return;
  }
  const draftFiles = createDraftFiles();
  state.draft = {
    containerId: state.course.courseId,
    files: draftFiles,
    analysisReport: {
      importTime: new Date().toISOString(),
      courseName: state.course.courseName,
      courseId: state.course.courseId,
      department: state.course.department,
      fileCount: state.files.length,
      dayCount: state.mappings.length,
      taskCount: state.files.filter((file) => file.contentCategory === 'task').length,
      solutionCount: state.files.filter((file) => file.contentCategory.includes('solution')).length,
      quizCount: state.files.filter((file) => file.contentCategory === 'quiz').length,
      projectFileCount: state.files.filter((file) => file.contentCategory.startsWith('project')).length,
      selectedSheet: state.coursePlan.selectedSheet,
      coursePlanFile: state.coursePlan.sourceFile,
      ueBlockCount: state.coursePlan.days.reduce((sum, day) => sum + ((day.ueBlocks || []).length), 0),
      aiMode: state.aiMode === 'local' ? 'local' : `${state.aiMode} -> local fallback`,
      generatedDayCount: state.dayDrafts?.length || state.mappings.length,
      generatedFiles: draftFiles.map((file) => file.path),
      warnings: state.gaps.filter((gap) => gap.severity !== 'critical').map((gap) => gap.message),
      conflicts: state.gaps.filter((gap) => gap.severity === 'critical').map((gap) => gap.message),
      gaps: state.gaps.map((gap) => gap.message),
      exportedPath: `output/drafts/${state.course.courseId}`
    }
  };
  saveRender();
}

function createDraftFiles() {
  const releaseKeys = [];
  const days = [];
  const participantDays = [];
  const files = [
    { path: 'manifest.json', content: JSON.stringify({ id: state.course.courseId, displayName: state.course.courseName, courseName: state.course.courseName, courseId: state.course.courseId, department: state.course.department, category: 'course', containerType: 'learning-content', version: '0.1.0', status: 'draft', assignable: true, exportable: true, runtimeModes: { standalone: { enabled: true, entry: 'standalone/index.html' }, platform: { enabled: true, adapter: 'platform/adapter.json', catalog: 'catalog/days.json' } } }, null, 2) },
    { path: 'container.json', content: JSON.stringify({ id: state.course.courseId, courseName: state.course.courseName, courseId: state.course.courseId, department: state.course.department, generatedBy: 'content-factory-lab', generatedFrom: 'course-plan', status: 'draft' }, null, 2) }
  ];
  state.mappings.forEach((mapping) => {
    const tag = `tag_${String(mapping.dayNumber).padStart(2, '0')}`;
    const generation = (state.dayDrafts || []).find((draft) => draft.dayNumber === mapping.dayNumber);
    const draft = generation ? createPlanDayDraftFromGeneration(generation) : createPlanDayDraft(mapping.planDay);
    const webTeacher = `dozent/${tag}/webvariante.html`;
    const webParticipant = `teilnehmer/${tag}/webvariante.html`;
    const tasksTeacher = `dozent/${tag}/aufgaben.html`;
    const tasksParticipant = `teilnehmer/${tag}/aufgaben.html`;
    const solutions = `dozent/${tag}/loesungen.html`;
    const quizPath = `shared/quiz/${tag}.json`;
    files.push({ path: webTeacher, content: draft.teacherWeb });
    files.push({ path: tasksTeacher, content: draft.tasks });
    files.push({ path: solutions, content: draft.solutions });
    files.push({ path: webParticipant, content: draft.participantWeb });
    files.push({ path: tasksParticipant, content: draft.tasks });
    files.push({ path: quizPath, content: draft.quiz });
    files.push({ path: `reviews/${tag}.json`, content: draft.review });
    days.push({ id: `day-${mapping.dayNumber}`, dayNumber: mapping.dayNumber, title: mapping.planDay.title, releaseKey: tag, theme: mapping.planDay.mainTopic, webTeacher, webParticipant, tasksTeacher, tasksParticipant, solutions, quizzes: [{ id: `quiz-${tag}`, title: `Tag ${mapping.dayNumber} Quiz`, path: quizPath, releaseKey: `${tag}_quiz` }], sourceRefs: generation?.sourceRefs || [] });
    participantDays.push({ dayNumber: mapping.dayNumber, title: mapping.planDay.title, releaseKey: tag, path: webParticipant, tasksPath: tasksParticipant, quizzes: [{ id: `quiz-${tag}`, title: `Tag ${mapping.dayNumber} Quiz`, path: quizPath, releaseKey: `${tag}_quiz` }] });
    releaseKeys.push(tag, `${tag}_web`, `${tag}_tasks`, `${tag}_solutions`, `${tag}_quiz`);
  });
  files.push({ path: 'dozent/index.html', content: indexHtml('Dozentenbereich', days.map((day) => day.webTeacher), true) });
  files.push({ path: 'teilnehmer/index.html', content: indexHtml('Teilnehmerbereich', participantDays.map((day) => day.path), false) });
  files.push({ path: 'catalog/days.json', content: JSON.stringify(days, null, 2) });
  files.push({ path: 'catalog/projects.json', content: '[]' });
  files.push({ path: 'catalog/tools.json', content: '[]' });
  files.push({ path: 'catalog/participant-content.json', content: JSON.stringify(participantDays, null, 2) });
  files.push({ path: 'catalog/release-keys.json', content: JSON.stringify([...new Set(releaseKeys)], null, 2) });
  files.push({ path: 'shared/assets/.gitkeep', content: '' });
  files.push({ path: 'shared/metadata/container.json', content: JSON.stringify({ courseName: state.course.courseName, courseId: state.course.courseId, department: state.course.department }, null, 2) });
  files.push({ path: 'standalone/index.html', content: standaloneHtml(days) });
  files.push({ path: 'standalone/standalone.js', content: standaloneJs() });
  files.push({ path: 'standalone/standalone.css', content: 'body{font-family:Arial,sans-serif;margin:24px;color:#0b1b33}button{padding:8px 12px}' });
  files.push({ path: 'platform/adapter.json', content: JSON.stringify({ contentContainerId: state.course.courseId, courseName: state.course.courseName, courseId: state.course.courseId, department: state.course.department, supportedReleaseKeys: [...new Set(releaseKeys)], roles: { teacher: { catalog: 'catalog/days.json', canSeeSolutions: true }, participant: { catalog: 'catalog/participant-content.json', canSeeSolutions: false } }, integration: { requiresCourseInstance: true, usesReleaseStates: true, usesCourseMembers: true, usesAuditLog: true } }, null, 2) });
  files.push({ path: 'platform/route-map.json', content: JSON.stringify({ standalone: 'standalone/index.html', teacherEntry: 'dozent/index.html', participantEntry: 'teilnehmer/index.html', catalog: 'catalog/days.json' }, null, 2) });
  files.push({ path: 'platform/integration.json', content: JSON.stringify({ expectsFromPlatform: ['CourseInstance', 'CourseMembers', 'ReleaseStates'], containsRuntimeUsers: false, containsDatabaseLogic: false }, null, 2) });
  files.push({ path: 'source-map.json', content: JSON.stringify({ generatedFrom: 'course-plan', coursePlan: { originalFileName: state.coursePlan.sourceFile, selectedSheet: state.coursePlan.selectedSheet, warnings: state.coursePlan.warnings }, generatedFiles: files.map((file) => file.path) }, null, 2) });
  files.push({ path: 'README.md', content: `# ${state.course.courseName}\n\nDraft aus Unterrichtsplan. Standalone-Draft, keine echte Plattform-Freigabe.\n` });
  return files;
}

function createLocalDayGenerationResult(mapping) {
  const blocks = mapping.planDay.ueBlocks || [];
  const sourceRefs = [`course-plan-day-${mapping.dayNumber}`].concat(mapping.files.map((file) => file.fileName));
  const learnerTasks = blocks.map((block) => block.learnerTask).filter(Boolean);
  const teacherTasks = blocks.map((block) => block.teacherTask || block.evaluation).filter(Boolean);
  const resources = blocks.map((block) => block.resources).filter(Boolean);
  return {
    dayNumber: mapping.dayNumber,
    title: mapping.planDay.title,
    status: 'draft',
    webvariant: {
      teacherHtmlSections: [
        { title: 'Tagesziel', content: (mapping.planDay.learningGoals || ['Lernziel noch ergaenzen']).join('\n'), sourceRefs, aiGenerated: false },
        { title: 'Dozentenhinweise', content: (teacherTasks.length ? teacherTasks : ['Loesungshinweis noch ergaenzen']).join('\n'), sourceRefs, aiGenerated: false }
      ],
      participantHtmlSections: [
        { title: 'Tagesziel', content: (mapping.planDay.learningGoals || ['Lernziel noch ergaenzen']).join('\n'), sourceRefs, aiGenerated: false },
        { title: 'Lernaufgaben', content: (learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen']).join('\n'), sourceRefs, aiGenerated: false },
        { title: 'Materialien', content: (resources.length ? resources : ['Material noch ergaenzen']).join('\n'), sourceRefs, aiGenerated: false }
      ]
    },
    tasks: (learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen']).map((task, index) => ({ id: `day-${mapping.dayNumber}-task-${index + 1}`, title: `Arbeitsauftrag ${index + 1}`, difficulty: 'mittel', text: task, sourceRefs, aiGenerated: false })),
    solutions: (teacherTasks.length ? teacherTasks : ['Loesung noch ergaenzen']).map((hint, index) => ({ taskId: `day-${mapping.dayNumber}-task-${index + 1}`, title: `Dozentenhinweis ${index + 1}`, text: hint, sourceRefs, aiGenerated: false })),
    quiz: [{ id: `day-${mapping.dayNumber}-quiz-1`, type: 'single-choice', topic: mapping.planDay.mainTopic, difficulty: 'leicht', text: 'Quiz noch zu ergaenzen.', options: ['Noch zu ergaenzen'], correct: [0], sourceRefs, aiGenerated: false }],
    sourceRefs,
    warnings: mapping.files.length ? [] : ['Keine Zusatzmaterialien vorhanden. Lokaler Entwurf nutzt nur den Unterrichtsplan.'],
    aiAdditions: ['Automatisch aus Unterrichtsplan erzeugt.']
  };
}

function createPreviewFromDayDraft(mapping, draft) {
  if (!draft) return createPreview(mapping);
  const sections = draft.webvariant.teacherHtmlSections.concat(draft.webvariant.participantHtmlSections)
    .map((section) => `<h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.content)}</p>`)
    .join('');
  return {
    dayNumber: draft.dayNumber,
    title: draft.title,
    warnings: draft.warnings,
    html: pageHtml(`${state.course.courseName} - ${draft.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p>${sections}`)
  };
}

function createPlanDayDraftFromGeneration(result) {
  const teacherSections = result.webvariant.teacherHtmlSections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.content)}</p></section>`).join('');
  const participantSections = result.webvariant.participantHtmlSections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.content)}</p></section>`).join('');
  return {
    teacherWeb: pageHtml(`${state.course.courseName} - ${result.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>${escapeHtml(result.title)}</h1>${teacherSections}`),
    participantWeb: pageHtml(`${state.course.courseName} - ${result.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>${escapeHtml(result.title)}</h1>${participantSections}`),
    tasks: pageHtml(`${state.course.courseName} - Aufgaben ${result.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>Aufgaben</h1>${htmlList(result.tasks.map((task) => task.text))}`),
    solutions: pageHtml(`${state.course.courseName} - Loesungen ${result.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>Loesungshinweise</h1>${htmlList(result.solutions.map((solution) => solution.text))}`),
    quiz: JSON.stringify({ dayNumber: result.dayNumber, status: result.status, generatedFrom: 'day-generation-result', questions: result.quiz, warnings: result.warnings }, null, 2),
    review: JSON.stringify({ dayNumber: result.dayNumber, status: 'draft_ready', planTopics: [result.title], assignedFiles: result.sourceRefs, generated: { webvariantTeacher: 'dozent', webvariantParticipant: 'teilnehmer', tasks: 'aufgaben', solutions: 'loesungen', quiz: 'quiz' }, warnings: result.warnings, gaps: result.aiAdditions, corrections: [], revisions: [] }, null, 2)
  };
}

function createPlanDayDraft(day) {
  const blocks = day.ueBlocks || [];
  const learnerTasks = blocks.map((block) => block.learnerTask).filter(Boolean);
  const teacherHints = blocks.map((block) => block.teacherTask || block.evaluation).filter(Boolean);
  const resources = blocks.map((block) => block.resources).filter(Boolean);
  const warnings = [];
  if (!learnerTasks.length) warnings.push('Keine Lernaufgabe im Unterrichtsplan erkannt.');
  if (!resources.length) warnings.push('Keine Ressourcen im Unterrichtsplan erkannt.');
  return {
    teacherWeb: pageHtml(`${state.course.courseName} - ${day.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>${escapeHtml(day.title)}</h1><h2>Tagesziel</h2>${htmlList(day.learningGoals)}<h2>Themen</h2><p>${escapeHtml(day.mainTopic)}</p>${htmlList(day.subTopics)}<h2>UE-Bloecke</h2>${ueTable(blocks, true)}<h2>Dozentenhinweise</h2>${htmlList(teacherHints)}<h2>Ressourcen</h2>${htmlList(resources)}${warnings.length ? `<h2>Offene Punkte</h2>${htmlList(warnings)}` : ''}`),
    participantWeb: pageHtml(`${state.course.courseName} - ${day.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>${escapeHtml(day.title)}</h1><h2>Tagesziel</h2>${htmlList(day.learningGoals)}<h2>Themen</h2><p>${escapeHtml(day.mainTopic)}</p>${htmlList(day.subTopics)}<h2>Lernaufgaben</h2>${htmlList(learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen'])}<h2>Materialien/Ressourcen</h2>${htmlList(resources.length ? resources : ['Material noch ergaenzen'])}`),
    tasks: pageHtml(`${state.course.courseName} - Aufgaben ${day.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>Aufgaben</h1>${htmlList(learnerTasks.length ? learnerTasks : ['Aufgabe noch ergaenzen'])}`),
    solutions: pageHtml(`${state.course.courseName} - Loesungen ${day.title}`, `<p><strong>Automatisch aus Unterrichtsplan erzeugt.</strong></p><h1>Loesungshinweise</h1>${htmlList(teacherHints.length ? teacherHints : ['Loesung noch ergaenzen'])}`),
    quiz: JSON.stringify({ dayNumber: day.dayNumber, status: 'draft', generatedFrom: 'course-plan', questions: [], note: 'Quiz noch zu ergaenzen. Es wurden keine fachlichen Fragen erfunden.' }, null, 2),
    review: JSON.stringify({ dayNumber: day.dayNumber, status: 'draft', generatedFrom: 'course-plan', warnings, needsHumanReview: true }, null, 2)
  };
}

function pageHtml(title, body) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

function htmlList(items) {
  const clean = (items || []).map((item) => String(item || '').trim()).filter(Boolean);
  return `<ul>${(clean.length ? clean : ['Noch zu ergaenzen']).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function ueTable(blocks, teacher) {
  if (!blocks.length) return '<p>Keine UE-Bloecke erkannt.</p>';
  return `<table><thead><tr><th>Zeit</th><th>Thema</th><th>${teacher ? 'Lehraufgabe' : 'Lernaufgabe'}</th><th>Ressourcen</th></tr></thead><tbody>${blocks.map((block) => `<tr><td>${escapeHtml(block.time || '')}</td><td>${escapeHtml(block.topic || '')}</td><td>${escapeHtml((teacher ? block.teacherTask : block.learnerTask) || '')}</td><td>${escapeHtml(block.resources || '')}</td></tr>`).join('')}</tbody></table>`;
}

function indexHtml(title, paths, teacher) {
  return pageHtml(`${state.course.courseName} - ${title}`, `<h1>${escapeHtml(state.course.courseName)}</h1><h2>${escapeHtml(title)}</h2><p>${teacher ? 'Dozentenansicht mit Hinweisen.' : 'Teilnehmeransicht mit freigegebenen Aufgaben und Materialien.'}</p><ul>${paths.map((path) => `<li><a href="../${path}">${escapeHtml(path)}</a></li>`).join('')}</ul>`);
}

function standaloneHtml(days) {
  const embedded = escapeHtml(JSON.stringify({ courseName: state.course.courseName, courseId: state.course.courseId, days }, null, 2));
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(state.course.courseName)} Standalone</title><link rel="stylesheet" href="standalone.css"></head><body><header><strong>${escapeHtml(state.course.courseName)}</strong><span>Standalone-Draft: keine echte Plattform-Freigabe</span></header><main id="app"><h1>Tagesnavigation</h1><p>Dozentenansicht zeigt Hinweise, Teilnehmer-Vorschau zeigt keine Loesungen.</p><pre id="embedded-data">${embedded}</pre></main><script src="standalone.js"></script></body></html>`;
}

function standaloneJs() {
  return `const data=JSON.parse(document.querySelector('#embedded-data').textContent);document.querySelector('#app').insertAdjacentHTML('beforeend','<div><button data-role="teacher">Dozent</button><button data-role="participant">Teilnehmer</button><section id="view"></section></div>');document.querySelectorAll('[data-role]').forEach((button)=>button.addEventListener('click',()=>{const teacher=button.dataset.role==='teacher';document.querySelector('#view').innerHTML='<h2>'+data.courseName+'</h2><ul>'+data.days.map((day)=>'<li>'+day.title+' - '+(teacher?day.webTeacher:day.webParticipant)+'</li>').join('')+'</ul>'+(teacher?'<p>Loesungen sind nur hier sichtbar.</p>':'<p>Teilnehmer-Vorschau ohne Loesungen.</p>');}));`;
}

function getGate(step) {
  const missing = getMissing(step);
  const accessible = missing.length === 0;
  return { step, accessible, missing, status: accessible ? statusFor(step) : 'locked' };
}

function getMissing(step) {
  const missing = [];
  if (step === 'course-data') return missing;
  if (validateCourseData().length) missing.push('Bitte Kursname, Kurs-ID und Fachbereich vollstaendig ausfuellen.');
  if (step === 'course-plan') return missing;
  if (!state.coursePlan) missing.push('Bitte laden Sie zuerst einen gueltigen Unterrichtsplan hoch.');
  if (!state.coursePlanConfirmed) missing.push('Bitte bestaetigen Sie den Unterrichtsplan.');
  if (step === 'uploads') return missing;
  if (step === 'review') return missing;
  if (!state.analysisCompleted) missing.push('Bitte fuehren Sie zuerst die Dateianalyse aus.');
  if (step === 'day-mapping') return missing;
  const open = openReviewFiles();
  if (open.length) missing.push(`${open.length} unklare oder blockierte Datei(en) muessen bestaetigt, korrigiert oder ignoriert werden.`);
  if (!allMappingDaysHandled()) missing.push('Bitte bestaetigen Sie alle Tageszuordnungen oder markieren Sie einzelne Tage bewusst als spaeter pruefen.');
  if (step === 'gap-analysis') return missing;
  if (state.gaps.some((gap) => gap.severity === 'critical' && gap.state === 'open')) missing.push('Bitte behandeln Sie zuerst alle kritischen Luecken.');
  if (step === 'day-preview') return missing;
  if (!state.previews.length) missing.push('Bitte erzeugen Sie mindestens einen Tagesentwurf.');
  if (step === 'approval') return missing;
  const allDaysDone = state.mappings.length && state.mappings.every((mapping) => ['confirmed', 'skipped', 'released'].includes(state.dayApproval[mapping.dayNumber]));
  if (!allDaysDone && !state.allowDraftWithOpenWarnings) missing.push('Bitte geben Sie alle notwendigen Tage frei oder waehlen Sie bewusst Draft mit offenen Punkten exportieren.');
  return missing;
}

function statusFor(step) {
  if (state.activeStep === step) return 'active';
  if (step === 'course-data' && !validateCourseData().length) return 'done';
  if (step === 'course-plan' && state.coursePlanConfirmed) return 'done';
  if (step === 'uploads' && state.coursePlanConfirmed) return 'done';
  if (step === 'review' && state.analysisCompleted && !openReviewFiles().length) return 'done';
  if (step === 'day-mapping' && allMappingDaysHandled()) return 'done';
  if (step === 'gap-analysis' && state.gaps.some((gap) => gap.severity === 'critical' && gap.state === 'open')) return 'error';
  if (step === 'gap-analysis' && state.gaps.length && state.gaps.every((gap) => gap.severity !== 'critical' || gap.state !== 'open')) return 'done';
  if (step === 'export' && state.allowDraftWithOpenWarnings) return 'warning';
  return 'open';
}

function validateCourseData() {
  const errors = [];
  if (!state.course.courseName.trim()) errors.push('Kursname fehlt.');
  if (!state.course.courseId.trim()) errors.push('Kurs-ID fehlt.');
  if (state.course.courseId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.course.courseId)) errors.push('Kurs-ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  if (!state.course.department) errors.push('Fachbereich fehlt.');
  return errors;
}

function openReviewFiles() {
  return state.files.filter((file) => !file.ignored && (file.blocked || file.needsReview) && !['confirmed', 'ignored', 'corrected'].includes(state.reviewStates[file.fileId]));
}

function allMappingDaysHandled() {
  return state.mappings.length > 0 && state.mappings.every((mapping) => ['confirmed', 'skipped'].includes(state.dayApproval[mapping.dayNumber]));
}

function classifyFile(fileName, uploadArea, size = 0) {
  const extension = getExtension(fileName);
  const lower = fileName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const detectedDay = detectDay(lower);
  const warnings = [];
  let technicalType = 'unknown';
  let contentCategory = 'other';
  let confidence = 0.52;
  let blocked = false;
  let ignored = false;
  if (/(^|\/)(node_modules|\.git)(\/|$)/.test(lower)) ignored = true;
  if (/(^|\/)\.env($|\.)/.test(lower) || ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.msi'].includes(extension)) {
    blocked = true;
    warnings.push('Diese Datei wird aus Sicherheitsgruenden blockiert.');
  }
  if (uploadArea === 'course-plan' || ['.xlsx', '.xlsm'].includes(extension)) { technicalType = 'course-plan'; contentCategory = 'course-plan'; confidence = 0.95; }
  else if (extension === '.zip') { technicalType = 'archive'; contentCategory = uploadArea === 'solutions' ? 'project-solution' : 'project-starter'; confidence = 0.82; }
  else if (extension === '.sql') { technicalType = 'database'; contentCategory = lower.includes('loesung') || lower.includes('solution') ? 'database-solution' : 'database-schema'; confidence = 0.91; }
  else if (['.json', '.xml', '.docx', '.txt'].includes(extension) && uploadArea === 'quiz') { technicalType = 'quiz'; contentCategory = 'quiz'; confidence = 0.9; }
  else if (extension === '.json' && /quiz|fragen|question/.test(lower + uploadArea)) { technicalType = 'quiz'; contentCategory = 'quiz'; confidence = 0.9; }
  else if (['.css', '.js', '.ts', '.tsx', '.jsx', '.php', '.java', '.cs', '.py'].includes(extension)) { technicalType = 'source-code'; contentCategory = 'source-code'; confidence = 0.88; }
  else if (['.html', '.htm'].includes(extension)) { technicalType = lower.includes('webvariante') ? 'web-document' : 'source-code'; contentCategory = detectCategory(lower, lower.includes('webvariante') ? 'webvariant' : 'source-code'); confidence = 0.8; }
  else if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(extension)) { technicalType = 'image'; contentCategory = 'asset'; confidence = 0.9; }
  else if (['.pdf', '.docx', '.md', '.pptx', '.ipynb'].includes(extension)) { technicalType = extension === '.pptx' ? 'presentation' : 'document'; contentCategory = detectCategory(lower, 'participant-material'); confidence = 0.76; }
  contentCategory = areaCategory(uploadArea, contentCategory);
  if (!detectedDay && ['task', 'solution', 'quiz', 'webvariant'].includes(contentCategory)) warnings.push('Keine eindeutige Tagnummer erkannt.');
  return { fileId: `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, fileName, uploadArea, size, extension, technicalType, contentCategory, detectedDay, detectedTopics: [], confidence, needsReview: confidence < 0.72 || warnings.length > 0 || blocked, warnings, ignored, blocked };
}

function createPlan(fileName) {
  const title = state.course.courseName || fileName.replace(/\.(xlsx|xlsm|docx|pdf)$/i, '').replace(/[_-]+/g, ' ');
  return { sourceFile: fileName, selectedSheet: 'Tabelle1', availableSheets: ['Tabelle1', 'Planvariante A'], planVariant: 'Tabelle1', totalDays: 3, courseTitle: title, courseId: state.course.courseId || createCourseIdSuggestion(title), department: state.course.department || 'ALLGEMEIN', warnings: ['Excel-Inhalte werden im Browser-MVP per Fallback gelesen. Bitte Tage pruefen.'], unclearRows: [], days: [1, 2, 3].map((day) => ({ dayNumber: day, title: `Tag ${day} - ${day === 1 ? title : `Themenblock ${day}`}`, mainTopic: day === 1 ? title : `Themenblock ${day}`, subTopics: [], learningGoals: ['Aus dem Unterrichtsplan abgeleitet'], ueBlocks: [{ ue: day, time: '', topic: day === 1 ? title : `Themenblock ${day}`, learnerTask: 'Aufgabe noch ergaenzen', teacherTask: 'Dozentenhinweis noch ergaenzen', resources: 'Material noch ergaenzen', isBreak: false }], pauses: [], requiredOutputs: ['Material noch ergaenzen'] })) };
}

function mapFiles() {
  if (!state.coursePlan) return [];
  return state.coursePlan.days.map((planDay) => {
    const files = state.files.filter((file) => !file.ignored && !file.blocked && file.contentCategory !== 'course-plan' && file.detectedDay === planDay.dayNumber);
    return { dayNumber: planDay.dayNumber, planDay, files, tasks: files.filter((file) => file.contentCategory === 'task'), solutions: files.filter((file) => file.contentCategory.includes('solution')), quizzes: files.filter((file) => file.contentCategory === 'quiz'), projectFiles: files.filter((file) => file.contentCategory.startsWith('project')), sourceCode: files.filter((file) => file.contentCategory === 'source-code'), databaseFiles: files.filter((file) => file.contentCategory.startsWith('database')), assets: files.filter((file) => file.contentCategory === 'asset'), unclearFiles: files.filter((file) => file.needsReview), conflicts: [] };
  });
}

function createGaps() {
  const gaps = [];
  state.mappings.forEach((mapping) => {
    if (!mapping.files.length) gaps.push(gap(`Tag ${mapping.dayNumber} enthaelt das Thema ${mapping.planDay.mainTopic}, aber es wurde kein passendes Material gefunden.`, 'important', mapping.dayNumber));
    if (mapping.solutions.length && !mapping.tasks.length) gaps.push(gap(`Es wurde eine Loesung zu Tag ${mapping.dayNumber} gefunden, aber keine passende Aufgabe.`, 'critical', mapping.dayNumber));
    mapping.unclearFiles.forEach((file) => gaps.push(gap(`Die Datei ${file.fileName} ist unklar und muss manuell geprueft werden.`, 'review', mapping.dayNumber, file.fileId)));
  });
  state.files.filter((file) => file.blocked).forEach((file) => gaps.push(gap(`Die Datei ${file.fileName} enthaelt blockierte oder riskante Inhalte und wird nicht exportiert.`, 'critical', undefined, file.fileId)));
  state.files.filter((file) => file.contentCategory === 'quiz' && file.detectedDay && file.detectedDay > state.coursePlan.days.length).forEach((file) => gaps.push(gap(`Der Fragenpool ${file.fileName} passt zu einem Tag ausserhalb des Unterrichtsplans.`, 'important', file.detectedDay, file.fileId)));
  return gaps;
}

function gap(message, severity, dayNumber, fileId) {
  return { id: `gap-${Math.random().toString(36).slice(2, 9)}`, message, severity, state: 'open', dayNumber, fileId };
}

function createPreview(mapping, correctionText = '') {
  return { dayNumber: mapping.dayNumber, title: mapping.planDay.title, warnings: mapping.unclearFiles.map((file) => `Bitte pruefen: ${file.fileName}`), correctionText, html: `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(mapping.planDay.title)}</title></head><body><h1>${escapeHtml(mapping.planDay.title)}</h1><p>${escapeHtml(mapping.planDay.mainTopic)}</p><h2>Quellen</h2><ul>${mapping.files.map((file) => `<li>${escapeHtml(file.fileName)}</li>`).join('') || '<li>Basisentwurf aus Unterrichtsplan</li>'}</ul>${correctionText ? `<h2>Korrektur</h2><p>${escapeHtml(correctionText)}</p>` : ''}</body></html>` };
}

function createExportSummary() {
  return { Kursname: state.course.courseName || '-', 'Kurs-ID': state.course.courseId || '-', Fachbereich: state.course.department || '-', 'Anzahl Tage': String(state.mappings.length), Materialien: String(state.files.filter((file) => file.contentCategory === 'participant-material').length), Aufgaben: String(state.files.filter((file) => file.contentCategory === 'task').length), Loesungen: String(state.files.filter((file) => file.contentCategory.includes('solution')).length), Quizdateien: String(state.files.filter((file) => file.contentCategory === 'quiz').length), 'Offene Warnungen': String(state.gaps.filter((gap) => gap.state === 'open').length), Exportpfad: `output/drafts/${state.course.courseId || 'kurs'}` };
}

function categoryOptions(selected) {
  return [
    ['participant-material', 'Unterrichtsmaterialien'],
    ['webvariant', 'Webvariante'],
    ['task', 'Aufgaben'],
    ['solution', 'Loesungen'],
    ['quiz', 'Fragenpools / Quiz'],
    ['project-scenario', 'Projektmaterialien: Szenario'],
    ['project-starter', 'Projektmaterialien: Starter'],
    ['project-solution', 'Projektmaterialien: Loesung'],
    ['source-code', 'Quellcode'],
    ['database-schema', 'Datenbank / SQL: Schema'],
    ['database-query', 'Datenbank / SQL: Abfrage'],
    ['database-solution', 'Datenbank / SQL: Loesung'],
    ['asset', 'Assets / Medien'],
    ['other', 'Sonstige Dateien']
  ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
}

function technicalTypeLabel(value) {
  return {
    'course-plan': 'Unterrichtsplan',
    document: 'Dokument',
    presentation: 'Praesentation',
    spreadsheet: 'Tabelle',
    notebook: 'Notebook',
    'web-document': 'Webdokument',
    'source-code': 'Quellcode',
    database: 'SQL',
    quiz: 'Quiz',
    image: 'Bild',
    media: 'Medium',
    archive: 'Archiv',
    asset: 'Asset',
    unknown: 'Unklar'
  }[value] || value;
}

function reviewGroup(file) {
  if (file.blocked) return 'Blockierte Dateien';
  if (file.needsReview) return 'Unklare Dateien';
  if (file.contentCategory === 'task') return 'Aufgaben';
  if (file.contentCategory.includes('solution')) return 'Loesungen';
  if (file.contentCategory === 'quiz') return 'Quizdateien';
  if (file.contentCategory.startsWith('project')) return 'Projektmaterialien';
  if (file.contentCategory === 'source-code') return 'Quellcode';
  if (file.contentCategory.startsWith('database')) return 'SQL-Dateien';
  if (file.contentCategory === 'asset') return 'Assets';
  return 'Unterrichtsmaterialien';
}

function bucket(label, files) {
  return `<details><summary>${label} (${files.length})</summary><ul>${files.map((file) => `<li>${escapeHtml(file.fileName)}</li>`).join('') || '<li>-</li>'}</ul></details>`;
}

function renderMessages(messages, kind) {
  return (messages || []).map((message) => `<p class="${kind}">${escapeHtml(message)}</p>`).join('');
}

function areaCategory(area, fallback) {
  return { materials: 'participant-material', tasks: 'task', solutions: 'solution', quiz: 'quiz', project: fallback.startsWith('project') ? fallback : 'project-scenario', 'source-code': 'source-code', database: fallback.startsWith('database') ? fallback : 'database-schema', assets: 'asset', other: fallback, 'zip-package': fallback.startsWith('project') ? fallback : 'project-starter', 'reference-literature': 'trainer-info', 'ai-materials': 'participant-material', 'course-plan': 'course-plan' }[area] || fallback;
}

function detectCategory(value, fallback) {
  if (/loesung|lösung|solution|muster/.test(value)) return 'solution';
  if (/aufgabe|task|uebung|übung/.test(value)) return 'task';
  if (/quiz|fragen/.test(value)) return 'quiz';
  if (/starter/.test(value)) return 'project-starter';
  if (/szenario|ausgangssituation/.test(value)) return 'project-scenario';
  return fallback;
}

function getNextStep(step) {
  const index = steps.findIndex(([id]) => id === step);
  return steps[index + 1]?.[0] || '';
}

function getExtension(fileName) {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
}

function detectDay(value) {
  const match = value.match(/(?:tag|day|d)[\s_-]*(\d{1,2})/i);
  return match ? Number(match[1]) : undefined;
}

function createCourseIdSuggestion(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kurscontainer';
}

function listHtml(title, files) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><ul>${files.map((file) => `<li>${escapeHtml(file.fileName)}</li>`).join('')}</ul></body></html>`;
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function uniqueFilter(value, index, array) {
  return array.indexOf(value) === index;
}

function gapLabel(value) {
  return { critical: 'Kritisch', important: 'Wichtig', info: 'Hinweis', auto: 'Automatisch loesbar', review: 'Manuell pruefen' }[value] || value;
}

function gapActionLabel(value) {
  return { open: 'offen', ignored: 'ignorieren', later: 'spaeter pruefen', reassigned: 'Datei neu zuordnen', 'fallback-allowed': 'KI-/Fallback-Ergaenzung erlauben', 'material-needed': 'Material nachladen' }[value] || value;
}

function resetLab() {
  if (!confirm('Lab wirklich zuruecksetzen?')) return;
  localStorage.removeItem(storageKey);
  state = defaultState();
  render();
}

function saveRender() {
  saveState();
  render();
}

function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

render();
