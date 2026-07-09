const desktop = window.lfzq8aDesktop;

const state = {
  courses: [],
  users: [],
  assignableContainers: [],
  members: [],
  assignments: [],
  syncEvents: [],
  auditLog: []
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

function userOptions(role) {
  return state.users
    .filter((user) => (user.roles || []).includes(role))
    .map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.displayName || user.email)}</option>`)
    .join('');
}

function renderSelects() {
  $('[data-selected-course]').innerHTML = state.courses.map((course) => (
    `<option value="${escapeHtml(course.id)}">${escapeHtml(course.courseName)} (${escapeHtml(course.status)})</option>`
  )).join('');
  $('[data-selected-container]').innerHTML = state.assignableContainers.map((container) => (
    `<option value="${escapeHtml(container.id)}">${escapeHtml(container.courseName || container.name)}</option>`
  )).join('');
  $('[data-selected-teacher]').innerHTML = userOptions('Dozent');
  $('[data-selected-participant]').innerHTML = userOptions('Teilnehmer');
}

function renderCourses() {
  $('[data-course-list]').innerHTML = state.courses.length ? state.courses.map((course) => {
    const members = state.members.filter((member) => member.courseInstanceId === course.id);
    const assignments = state.assignments.filter((entry) => entry.courseInstanceId === course.id);
    return `
      <article class="factory-card">
        <div class="factory-card-header">
          <strong>${escapeHtml(course.courseName)}</strong>
          <span class="status-badge">${escapeHtml(course.status)}</span>
        </div>
        <p>${escapeHtml(course.courseId)} · ${escapeHtml(course.department)} · Revision ${escapeHtml(course.revision)}</p>
        <small>Mitglieder: ${escapeHtml(members.length)} · Container: ${escapeHtml(assignments.map((entry) => entry.contentContainerId).join(', ') || 'keine')}</small>
      </article>
    `;
  }).join('') : '<article class="empty-state"><strong>Keine Kurse vorhanden</strong><span>Legen Sie zuerst eine CourseInstance an.</span></article>';
}

function renderEvents() {
  $('[data-sync-events]').innerHTML = state.syncEvents.map((event) => (
    `<article class="history-entry"><strong>${escapeHtml(event.action)}</strong><span>${escapeHtml(event.entity)} · ${escapeHtml(event.timestamp)}</span></article>`
  )).join('') || '<article class="empty-state"><strong>Keine SyncEvents</strong><span>Noch keine Aenderungen gespeichert.</span></article>';
  $('[data-audit-log]').innerHTML = state.auditLog.map((entry) => (
    `<article class="history-entry"><strong>${escapeHtml(entry.action)}</strong><span>${escapeHtml(entry.entity)} · ${escapeHtml(entry.actor)} · ${escapeHtml(entry.timestamp)}</span></article>`
  )).join('') || '<article class="empty-state"><strong>Kein AuditLog</strong><span>Noch keine Aenderungen gespeichert.</span></article>';
}

function render() {
  renderSelects();
  renderCourses();
  renderEvents();
}

async function loadState() {
  const data = await desktop.courseManagement.getState();
  Object.assign(state, data);
  render();
}

async function createCourse() {
  $('[data-course-status-line]').textContent = 'Kurs wird erstellt ...';
  try {
    await desktop.courseManagement.createCourse({
      courseName: $('[data-course-name]').value,
      courseId: $('[data-course-id]').value,
      department: $('[data-course-department]').value,
      status: $('[data-course-status]').value,
      startDate: $('[data-course-start-date]').value,
      endDate: $('[data-course-end-date]').value
    });
    $('[data-course-status-line]').textContent = 'Kurs erstellt.';
    await loadState();
  } catch (error) {
    $('[data-course-status-line]').textContent = error.message;
  }
}

async function assignContainer() {
  await runAssignment('Container wird zugewiesen ...', () => desktop.courseManagement.assignContainer(
    $('[data-selected-course]').value,
    $('[data-selected-container]').value
  ));
}

async function assignTeacher() {
  await runAssignment('Dozent wird zugewiesen ...', () => desktop.courseManagement.assignMember(
    $('[data-selected-course]').value,
    $('[data-selected-teacher]').value,
    'teacher'
  ));
}

async function assignParticipant() {
  await runAssignment('Teilnehmer wird zugewiesen ...', () => desktop.courseManagement.assignMember(
    $('[data-selected-course]').value,
    $('[data-selected-participant]').value,
    'participant'
  ));
}

async function runAssignment(message, action) {
  $('[data-assignment-status]').textContent = message;
  try {
    await action();
    $('[data-assignment-status]').textContent = 'Zuordnung gespeichert.';
    await loadState();
  } catch (error) {
    $('[data-assignment-status]').textContent = error.message;
  }
}

async function init() {
  if (!desktop?.courseManagement) {
    document.body.innerHTML = '<main class="tool-card"><h1>Kursverwaltung API nicht verfuegbar</h1></main>';
    return;
  }
  $('[data-open-landing]').addEventListener('click', () => desktop.openLanding());
  $('[data-refresh]').addEventListener('click', loadState);
  $('[data-create-course]').addEventListener('click', createCourse);
  $('[data-assign-container]').addEventListener('click', assignContainer);
  $('[data-assign-teacher]').addEventListener('click', assignTeacher);
  $('[data-assign-participant]').addEventListener('click', assignParticipant);
  await loadState();
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${escapeHtml(error.message)}</p>`);
});
