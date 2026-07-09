const desktop = window.lfzq8aDesktop;

function $(selector) {
  return document.querySelector(selector);
}

function getRole() {
  const params = new URLSearchParams(window.location.search);
  return params.get('role') === 'dozent' ? 'dozent' : 'teilnehmer';
}

function applyRoleText(role) {
  const isTeacher = role === 'dozent';
  const label = isTeacher ? 'Dozent' : 'Teilnehmer';
  $('[data-create-title]').textContent = `${label} anlegen`;
  $('[data-create-heading]').textContent = `${label} vormerken`;
  $('[data-create-copy]').textContent = isTeacher
    ? 'Legen Sie einen Dozenten vorab an. Die Registrierung ist erst mit dieser Freigabe moeglich.'
    : 'Legen Sie einen Teilnehmer vorab an. Die Registrierung ist erst mit dieser Freigabe moeglich.';
  $('[data-create-submit]').textContent = `${label} vormerken`;
}

async function init() {
  if (!desktop?.userCreate) {
    document.body.innerHTML = '<main class="tool-card"><h1>Benutzeranlage API nicht verfuegbar</h1></main>';
    return;
  }
  const role = getRole();
  applyRoleText(role);
  $('[data-open-landing]').addEventListener('click', () => desktop.openLanding());
  $('[data-create-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('[data-create-status]').textContent = 'Vorabfreigabe wird gespeichert ...';
    try {
      await desktop.userCreate.createPendingRegistration({
        name: $('[data-create-name]').value,
        email: $('[data-create-email]').value,
        note: $('[data-create-note]').value,
        role
      });
      $('[data-create-form]').reset();
      $('[data-create-status]').textContent = 'Vorabfreigabe gespeichert.';
    } catch (error) {
      $('[data-create-status]').textContent = error.message;
    }
  });
}

init().catch((error) => {
  document.body.insertAdjacentHTML('beforeend', `<p class="status-line status-error">${error.message}</p>`);
});
