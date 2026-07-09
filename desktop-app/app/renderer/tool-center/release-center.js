const desktop = window.lfzq8aDesktop;

const state = {
  users: [],
  assignableModules: [],
  pendingRegistrations: []
};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function userMatchesFilter(user) {
  const search = $('[data-user-search]').value.toLowerCase().trim();
  const roleFilter = $('[data-role-filter]').value;
  const roles = user.roles || [];
  const profile = user.profile || {};
  const haystack = `${user.displayName || ''} ${user.email || ''} ${profile.firstName || ''} ${profile.lastName || ''}`.toLowerCase();
  return (!search || haystack.includes(search))
    && (roleFilter === 'all' || roles.includes(roleFilter));
}

function renderUsers() {
  const users = state.users.filter(userMatchesFilter);
  $('[data-user-list]').innerHTML = users.length ? users.map((user) => {
    const profile = user.profile || {};
    const assigned = new Set(profile.assignedModuleIds || []);
    return `
      <article class="factory-card" data-user-id="${escapeHtml(user.id)}">
        <div class="factory-card-header">
          <strong>${escapeHtml(user.displayName || user.email)}</strong>
          <span class="status-badge">${escapeHtml((user.roles || []).join(', '))}</span>
        </div>
        <p>${escapeHtml(user.email)}</p>
        <small>Freigegeben: ${escapeHtml((profile.assignedModuleIds || []).join(', ') || 'keine')}</small>
        <div class="mapping-list">
          ${state.assignableModules.map((module) => `
            <label class="toggle-row">
              <input type="checkbox" data-module-assignment value="${escapeHtml(module.id)}" ${assigned.has(module.id) ? 'checked' : ''}>
              <span>${escapeHtml(module.name)}</span>
            </label>
          `).join('')}
        </div>
        <button class="primary-button" type="button" data-save-user-assignments>Freigaben speichern</button>
      </article>
    `;
  }).join('') : '<article class="empty-state"><strong>Keine Benutzer gefunden</strong><span>Bitte Suche oder Filter anpassen.</span></article>';

  document.querySelectorAll('[data-save-user-assignments]').forEach((button) => {
    button.addEventListener('click', () => saveAssignments(button.closest('[data-user-id]')));
  });
}

function formatRole(role) {
  return role === 'dozent' ? 'Dozent' : role === 'teilnehmer' ? 'Teilnehmer' : role;
}

function pendingMatchesFilter(entry) {
  const search = $('[data-user-search]').value.toLowerCase().trim();
  const roleFilter = $('[data-role-filter]').value;
  const haystack = `${entry.name || ''} ${entry.email || ''} ${entry.note || ''}`.toLowerCase();
  const role = formatRole(entry.role);
  return (!search || haystack.includes(search))
    && (roleFilter === 'all' || role === roleFilter);
}

function renderPendingRegistrations() {
  const entries = state.pendingRegistrations.filter(pendingMatchesFilter);
  $('[data-pending-list]').innerHTML = entries.length ? entries.map((entry) => `
    <article class="factory-card" data-pending-id="${escapeHtml(entry.id)}">
      <div class="factory-card-header">
        <strong>${escapeHtml(entry.name)}</strong>
        <span class="status-badge">${escapeHtml(formatRole(entry.role))}</span>
      </div>
      <p>${escapeHtml(entry.email)}</p>
      <small>Status: ${escapeHtml(entry.status)} · erstellt am ${escapeHtml(entry.createdAt || '')}</small>
      <small>Erstellt durch: ${escapeHtml(entry.createdBy || '-')}</small>
      <p>${escapeHtml(entry.note || 'Keine Notiz')}</p>
      ${entry.status === 'pending'
        ? '<button class="secondary-button" type="button" data-revoke-pending>Widerrufen</button>'
        : ''}
    </article>
  `).join('') : '<article class="empty-state"><strong>Keine Registrierungsfreigaben gefunden</strong><span>Bitte Suche oder Filter anpassen.</span></article>';

  document.querySelectorAll('[data-revoke-pending]').forEach((button) => {
    button.addEventListener('click', () => revokePendingRegistration(button.closest('[data-pending-id]').dataset.pendingId));
  });
}

async function saveAssignments(card) {
  const moduleIds = Array.from(card.querySelectorAll('[data-module-assignment]:checked')).map((input) => input.value);
  $('[data-release-status]').textContent = 'Freigaben werden gespeichert ...';
  try {
    await desktop.releaseCenter.saveAssignments(card.dataset.userId, moduleIds);
    $('[data-release-status]').textContent = 'Freigaben gespeichert.';
    await loadState();
  } catch (error) {
    $('[data-release-status]').textContent = error.message;
  }
}

async function revokePendingRegistration(id) {
  $('[data-release-status]').textContent = 'Registrierungsfreigabe wird widerrufen ...';
  try {
    await desktop.releaseCenter.revokePendingRegistration(id);
    $('[data-release-status]').textContent = 'Registrierungsfreigabe widerrufen.';
    await loadState();
  } catch (error) {
    $('[data-release-status]').textContent = error.message;
  }
}

async function loadState() {
  const data = await desktop.releaseCenter.getState();
  state.users = data.users || [];
  state.assignableModules = data.assignableModules || [];
  state.pendingRegistrations = data.pendingRegistrations || [];
  renderUsers();
  renderPendingRegistrations();
}

async function init() {
  if (!desktop?.releaseCenter) {
    document.body.innerHTML = '<main class="tool-card"><h1>Freigabezentrum API nicht verfuegbar</h1></main>';
    return;
  }
  $('[data-open-landing]').addEventListener('click', () => desktop.openLanding());
  $('[data-refresh]').addEventListener('click', loadState);
  $('[data-user-search]').addEventListener('input', () => {
    renderUsers();
    renderPendingRegistrations();
  });
  $('[data-role-filter]').addEventListener('change', () => {
    renderUsers();
    renderPendingRegistrations();
  });
  await loadState();
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${escapeHtml(error.message)}</p>`);
});
