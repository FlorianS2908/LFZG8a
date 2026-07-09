const desktop = window.lfzq8aDesktop;

const state = {
  workspace: null,
  auth: null,
  modules: [],
  quizConfig: null,
  quizHistory: []
};

const timerAreas = {
  software: {
    title: 'Software Entwicklung Allgemein',
    subtitle: 'Grundlagen, Prozesse und Codefragen',
    hintTitle: 'JSON:',
    hintText: 'Lade eigene Fragenpools direkt im Tool. Fragen mit Code werden formatiert dargestellt.'
  },
  sql: {
    title: 'SQL',
    subtitle: 'SELECT, JOINs und Datenbanken',
    hintTitle: 'SQL:',
    hintText: 'Trainiere Datenbankfragen mit Timer und direkter Auswertung.'
  },
  python: {
    title: 'Python',
    subtitle: 'Syntax, Funktionen und Codefragen',
    hintTitle: 'Python:',
    hintText: 'Nutze den Timer fuer kurze Python-Wiederholungen.'
  }
};

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

function showView(viewName) {
  $all('[data-view]').forEach((view) => {
    view.classList.toggle('is-active', view.dataset.view === viewName);
  });
}

function activateTrack(trackName) {
  $all('[data-track]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.track === trackName);
  });
  $all('[data-track-panel]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.trackPanel === trackName);
  });
}

function activateToolTab(kind, tabName) {
  $all(`[data-${kind}-tab]`).forEach((button) => {
    button.classList.toggle('is-active', button.dataset[`${kind}Tab`] === tabName);
  });
  $all(`[data-${kind}-panel]`).forEach((panel) => {
    panel.hidden = panel.dataset[`${kind}Panel`] !== tabName;
  });
}

function renderProfile(settings) {
  const authUser = state.auth?.user || {};
  const authProfile = state.auth?.profile || {};
  const profile = settings.teacherProfile || {};
  const displayName = authUser.displayName || profile.displayName || 'Dozent';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'LF';

  $('[data-profile-name]').textContent = displayName;
  $('[data-profile-initials]').textContent = initials;
  $('[data-profile-display-name]').value = displayName;
  $('[data-profile-email]').value = authUser.email || profile.email || '';
  $('[data-profile-email]').readOnly = true;
  $('[data-profile-organization]').value = authProfile.organizationName || '';
  $('[data-auth-email]').textContent = authUser.email || '';
  $('[data-auth-roles]').textContent = `Rolle(n): ${(authUser.roles || []).join(', ') || 'lokaler Benutzer'}`;
  $('[data-auth-status]').textContent = authUser.isProtected
    ? 'Geschuetztes lokales Administratorkonto'
    : 'Lokaler Benutzer';

  const image = $('[data-profile-image]');
  const avatar = authProfile.avatar || profile.avatarDataUrl || '';
  if (avatar) {
    image.src = avatar;
    image.hidden = false;
    $('[data-profile-initials]').hidden = true;
  } else {
    image.hidden = true;
    $('[data-profile-initials]').hidden = false;
  }
  renderCourseSettings(settings);
}

function userCanSeeCourseSettings() {
  const roles = state.auth?.user?.roles || [];
  const assigned = state.auth?.profile?.assignedModuleIds || [];
  return roles.includes('Dozent') && assigned.includes('lfzq8a');
}

function userIsAdmin() {
  const roles = state.auth?.user?.roles || [];
  return roles.includes('Admin') || roles.includes('SuperAdmin');
}

function userCanOpenWizard() {
  const roles = state.auth?.user?.roles || [];
  const assigned = state.auth?.profile?.assignedModuleIds || [];
  return roles.includes('Dozent') && assigned.includes('lfzq8a');
}

function renderCourseSettings(settings) {
  const panel = $('[data-course-settings-panel]');
  panel.hidden = !userCanSeeCourseSettings();
  if (panel.hidden) {
    return;
  }
  const courseSettings = settings.courseSettingsByCourseId?.['html-css'] || {};
  $('[data-course-start]').value = courseSettings.startTime || '08:30';
  $('[data-course-end]').value = courseSettings.endTime || '16:30';
  $('[data-course-monitor]').value = courseSettings.courseViewMonitorIndex ?? 1;
  $('[data-teacher-monitor]').value = courseSettings.teacherViewMonitorIndex ?? 0;
  const breaks = courseSettings.breaks || [];
  $('[data-course-breaks]').innerHTML = breaks.map((breakData, index) => `
    <article class="mapping-item" data-course-break-index="${index}">
      <strong>${escapeHtml(breakData.label || `Pause ${index + 1}`)}</strong>
      <div class="factory-form-grid">
        <label>Start<input data-break-start value="${escapeHtml(breakData.start || '')}"></label>
        <label>Ende<input data-break-end value="${escapeHtml(breakData.end || '')}"></label>
      </div>
    </article>
  `).join('');
}

async function loadWorkspaceState() {
  state.workspace = await desktop.getWorkspaceState();
  state.auth = state.workspace.auth;
  state.modules = state.workspace.modules || [];
  renderProfile(state.workspace.settings);
  renderModules();
}

async function saveProfile() {
  const status = $('[data-profile-status]');
  status.textContent = 'Profil wird gespeichert ...';
  const avatarFile = $('[data-profile-avatar]').files?.[0];
  const avatar = avatarFile ? await readFileAsDataUrl(avatarFile) : undefined;
  const result = await desktop.saveWorkspaceProfile({
    displayName: $('[data-profile-display-name]').value,
    email: $('[data-profile-email]').value,
    organizationName: $('[data-profile-organization]').value,
    avatar
  });
  state.workspace.settings = result.settings;
  state.auth = result.auth;
  renderProfile(result.settings);
  status.textContent = 'Profil gespeichert.';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveCourseSettings() {
  const status = $('[data-profile-status]');
  status.textContent = 'Kurssettings werden gespeichert ...';
  try {
    const breaks = $all('[data-course-break-index]').map((item, index) => ({
      id: `pause-${index + 1}`,
      label: `Pause ${index + 1}`,
      start: item.querySelector('[data-break-start]').value,
      end: item.querySelector('[data-break-end]').value
    }));
    await desktop.courseSettings.save('html-css', {
      startTime: $('[data-course-start]').value,
      endTime: $('[data-course-end]').value,
      courseViewMonitorIndex: Number($('[data-course-monitor]').value),
      teacherViewMonitorIndex: Number($('[data-teacher-monitor]').value),
      breaks
    });
    await loadWorkspaceState();
    status.textContent = 'Kurssettings gespeichert.';
  } catch (error) {
    status.textContent = error.message;
  }
}

function createModuleTile(module) {
  const button = document.createElement('button');
  button.className = `tool-tile module-tile status-${module.status}`;
  button.type = 'button';
  button.dataset.openModule = module.id;
  button.disabled = module.status !== 'active';
  button.innerHTML = `
    <span class="tool-visual lfzq8a-visual">${escapeHtml(module.icon === 'Code' ? 'HC' : module.name.slice(0, 2).toUpperCase())}</span>
    <span class="tool-copy">
      <strong>${escapeHtml(module.name)}</strong>
      <small>${escapeHtml(module.description)}</small>
    </span>
  `;
  return button;
}

function renderModules() {
  const adminView = userIsAdmin();
  const adminSection = $('[data-admin-module-section]');
  const trackNavigation = $('[data-track-navigation]');
  const coursePanel = $('[data-course-track-panel]');
  if (adminSection) {
    adminSection.hidden = !adminView;
  }
  if (trackNavigation) {
    trackNavigation.hidden = adminView;
  }
  if (coursePanel) {
    coursePanel.hidden = adminView;
  }
  const target = adminView ? $('[data-admin-module-grid]') : $('[data-module-grid]');
  if (!target) {
    return;
  }
  target.innerHTML = '';
  state.modules.forEach((module) => {
    target.append(createModuleTile(module));
  });
  $('[data-role-empty-state]').hidden = state.modules.length !== 0;
  if (state.modules.length === 0) {
    const roles = state.auth?.user?.roles || [];
    $('[data-role-empty-message]').textContent = roles.includes('Dozent')
      ? 'Fuer Ihr Dozentenprofil sind aktuell keine Kurse oder Tools freigeschaltet. Bitte wenden Sie sich an den Administrator.'
      : 'Fuer Ihr Teilnehmerprofil sind aktuell keine Kurse oder Tools freigeschaltet. Bitte wenden Sie sich an den Administrator oder Ihre Kursleitung.';
  }
  const wizardButton = $('[data-profile-wizard]');
  if (wizardButton) {
    wizardButton.hidden = !userCanOpenWizard();
  }
  $all('[data-open-module]').forEach((button) => {
    button.addEventListener('click', () => desktop.openModule(button.dataset.openModule));
  });
}

async function logout() {
  await desktop.auth.logout();
}

async function changePassword() {
  const status = $('[data-profile-status]');
  status.textContent = 'Passwort wird geaendert ...';
  try {
    await desktop.auth.changePassword({
      oldPassword: $('[data-password-old]').value,
      newPassword: $('[data-password-new]').value,
      confirmation: $('[data-password-confirm]').value
    });
    $('[data-password-old]').value = '';
    $('[data-password-new]').value = '';
    $('[data-password-confirm]').value = '';
    status.textContent = 'Passwort gespeichert.';
  } catch (error) {
    status.textContent = error.message;
  }
}

function openProfileDialog() {
  const dialog = $('[data-profile-dialog]');
  if (dialog.showModal) {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', 'open');
  }
}

function renderDokuReport(report) {
  const target = $('[data-doku-report]');
  target.innerHTML = `
    <section class="result-item status-${escapeHtml(report.summary.score >= 80 ? 'gruen' : report.summary.score >= 50 ? 'gelb' : 'rot')}">
      <strong>Score: ${escapeHtml(report.summary.score)} %</strong>
      <span>${escapeHtml(report.summary.grade)} - ${escapeHtml(report.summary.note)}</span>
    </section>
    ${(report.results || []).map((item) => `
      <article class="result-item status-${escapeHtml(item.status)}">
        <strong>${escapeHtml(item.category)}: ${escapeHtml(item.criterion)}</strong>
        <span>${escapeHtml(item.message)}</span>
      </article>
    `).join('')}
  `;
}

async function refreshDokuHistory() {
  const data = await desktop.dokuTool.listReports();
  const target = $('[data-doku-history]');
  const reports = data.reports || [];
  target.innerHTML = reports.length
    ? reports.map((report) => `
      <article class="history-item">
        <strong>${escapeHtml(report.title)}</strong>
        <span>${escapeHtml(new Date(report.createdAt).toLocaleString('de-DE'))} - ${escapeHtml(report.score)} % - ${escapeHtml(report.grade)}</span>
      </article>
    `).join('')
    : '<p class="status-line">Noch keine lokalen Reports vorhanden.</p>';
}

async function readSelectedDokuFile() {
  const file = $('[data-doku-file]').files?.[0];
  if (!file) {
    return { fileName: '', text: $('[data-doku-text]').value };
  }

  if (/\.(txt|md|html)$/i.test(file.name)) {
    return {
      fileName: file.name,
      text: await file.text()
    };
  }

  return {
    fileName: file.name,
    text: $('[data-doku-text]').value
  };
}

async function runDokuCheck() {
  const status = $('[data-doku-status]');
  status.textContent = 'Doku wird lokal geprueft ...';
  try {
    const fileData = await readSelectedDokuFile();
    const report = await desktop.dokuTool.analyze({
      title: $('[data-doku-title]').value,
      ...fileData
    });
    renderDokuReport(report);
    await refreshDokuHistory();
    status.textContent = 'Pruefung abgeschlossen.';
  } catch (error) {
    status.textContent = error.message;
  }
}

function renderQuizConfig(config) {
  $('[data-quiz-status]').textContent = config.questionPools.status;
  $('[data-quiz-source]').textContent = config.sourceRepo;
  $('[data-quiz-path]').textContent = config.questionSchema.firestorePath;
  $('[data-quiz-schema]').innerHTML = (config.questionSchema.fields || []).map((field) => (
    `<div class="schema-item"><strong>${escapeHtml(field.key)}</strong><span>${escapeHtml(field.label)}</span></div>`
  )).join('');

  const poolSelect = $('[data-quiz-pool]');
  poolSelect.innerHTML = '<option value="">Bitte waehlen</option>' + config.questionPools.pools.map((pool) => (
    `<option value="${escapeHtml(pool.id)}">${escapeHtml(pool.label)}</option>`
  )).join('');
  renderQuizTopics();
}

function selectedQuizPool() {
  const poolId = $('[data-quiz-pool]').value;
  return (state.quizConfig?.questionPools?.pools || []).find((pool) => pool.id === poolId) || null;
}

function renderQuizTopics() {
  const pool = selectedQuizPool();
  const topicSelect = $('[data-quiz-topic]');
  topicSelect.innerHTML = '<option value="">Alle Topics</option>' + (pool?.topics || []).map((topic) => (
    `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`
  )).join('');
  topicSelect.disabled = !pool;
  $('[data-quiz-pool-status]').textContent = pool
    ? `${pool.previewCount} lokale Vorschaufragen verfuegbar.`
    : 'Waehle einen Fragenpool.';
}

function renderQuestions(questions) {
  $('[data-question-preview]').innerHTML = questions.length
    ? questions.map((question) => `
      <article class="question-item">
        <strong>${escapeHtml(question.question)}</strong>
        <span>${escapeHtml((question.answers || []).join(' | '))}</span>
        <small>Richtig: ${escapeHtml(question.correctAnswer)}</small>
      </article>
    `).join('')
    : '<p class="status-line">Keine Fragen fuer diese Auswahl gefunden.</p>';
}

function renderQuizHistory() {
  $('[data-quiz-history]').innerHTML = state.quizHistory.length
    ? state.quizHistory.map((entry) => `
      <article class="history-item">
        <strong>${escapeHtml(entry.poolId)} ${escapeHtml(entry.topic || '')}</strong>
        <span>${escapeHtml(entry.count)} Fragen geladen - ${escapeHtml(new Date(entry.createdAt).toLocaleString('de-DE'))}</span>
      </article>
    `).join('')
    : '<p class="status-line">Noch keine Fragen geladen.</p>';
}

async function loadQuizConfig() {
  state.quizConfig = await desktop.dokuTool.getQuizConfig();
  renderQuizConfig(state.quizConfig);
}

async function loadQuizQuestions() {
  const poolId = $('[data-quiz-pool]').value;
  const topic = $('[data-quiz-topic]').value;
  const max = $('[data-quiz-limit]').value;
  const status = $('[data-quiz-pool-status]');
  status.textContent = 'Fragen werden geladen ...';
  const data = await desktop.dokuTool.getQuizQuestions({ poolId, topic, max });
  const questions = data.questions || [];
  renderQuestions(questions);
  state.quizHistory = [{ poolId, topic, count: questions.length, createdAt: new Date().toISOString() }, ...state.quizHistory].slice(0, 20);
  renderQuizHistory();
  status.textContent = `${questions.length} Fragen geladen.`;
}

function openTimer(area) {
  const config = timerAreas[area] || timerAreas.software;
  $('[data-timer-title]').textContent = config.title;
  $('[data-timer-subtitle]').textContent = config.subtitle;
  $('[data-timer-hint-title]').textContent = config.hintTitle;
  $('[data-timer-hint-text]').textContent = config.hintText;
  $('#timerQuizRoot').dataset.timerQuizArea = area;
  showView('timer');
  window.dispatchEvent(new CustomEvent('timer-quiz-area-change', { detail: { area } }));
}

async function init() {
  if (!desktop) {
    document.body.innerHTML = '<main class="tool-card"><h1>Electron API nicht verfuegbar</h1></main>';
    return;
  }

  await loadWorkspaceState();
  await loadQuizConfig();
  await refreshDokuHistory();

  $all('[data-track]').forEach((button) => {
    button.addEventListener('click', () => activateTrack(button.dataset.track));
  });
  $all('[data-back-workspace]').forEach((button) => {
    button.addEventListener('click', () => showView('workspace'));
  });
  $('[data-open-tool="doku"]').addEventListener('click', () => showView('doku'));
  $('[data-open-tool="quiz"]').addEventListener('click', () => showView('quiz'));
  $all('[data-open-timer]').forEach((button) => {
    button.addEventListener('click', () => openTimer(button.dataset.openTimer));
  });
  $all('[data-open-wizard]').forEach((button) => {
    button.addEventListener('click', () => desktop.openWizard());
  });
  $('[data-open-profile]').addEventListener('click', openProfileDialog);
  $('[data-save-profile]').addEventListener('click', saveProfile);
  $('[data-save-course-settings]').addEventListener('click', saveCourseSettings);
  $('[data-logout]').addEventListener('click', logout);
  $('[data-change-password]').addEventListener('click', changePassword);
  $('[data-run-doku-check]').addEventListener('click', runDokuCheck);
  $('[data-quiz-pool]').addEventListener('change', renderQuizTopics);
  $('[data-load-questions]').addEventListener('click', loadQuizQuestions);

  $all('[data-doku-tab]').forEach((button) => {
    button.addEventListener('click', () => activateToolTab('doku', button.dataset.dokuTab));
  });
  $all('[data-quiz-tab]').forEach((button) => {
    button.addEventListener('click', () => activateToolTab('quiz', button.dataset.quizTab));
  });
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line">${escapeHtml(error.message)}</p>`);
});
