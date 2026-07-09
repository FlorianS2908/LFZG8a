const desktop = window.lfzq8aDesktop;

function $(selector) {
  return document.querySelector(selector);
}

function setStatus(message) {
  $('[data-login-status]').textContent = message || '';
}

function setAuthMode(mode) {
  const nextMode = mode === 'register' ? 'register' : 'login';
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.authMode === nextMode);
  });
  document.querySelectorAll('[data-auth-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== nextMode;
  });
  setStatus('');
}

async function init() {
  if (!desktop?.auth) {
    document.body.innerHTML = '<main class="login-shell"><section class="login-panel"><h1>Electron API nicht verfuegbar</h1></section></main>';
    return;
  }

  const session = await desktop.auth.getState();
  if (session.authenticated) {
    await desktop.openLanding();
    return;
  }

  $('[data-login-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Login wird geprueft ...');
    const result = await desktop.auth.login({
      email: $('[data-login-email]').value,
      password: $('[data-login-password]').value
    });
    if (!result.authenticated) {
      setStatus(result.error || 'Login fehlgeschlagen.');
    }
  });

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
  });
  setAuthMode('login');

  $('[data-register-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Registrierung wird gespeichert ...');
    try {
      const result = await desktop.auth.register({
        displayName: $('[data-register-name]').value,
        email: $('[data-register-email]').value,
        role: $('[data-register-role]').value,
        password: $('[data-register-password]').value,
        confirmation: $('[data-register-confirmation]').value
      });
      if (!result.authenticated) {
        setStatus(result.error || 'Registrierung fehlgeschlagen.');
      }
    } catch (error) {
      setStatus(error.message);
    }
  });
}

init().catch((error) => {
  setStatus(error.message);
});
