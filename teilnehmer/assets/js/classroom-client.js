(() => {
  'use strict';

  const profileKey = 'lfzq8a-participant-profile';
  const isClassroomServer = /^https?:$/.test(window.location.protocol);
  const cards = [...document.querySelectorAll('[data-release-key]')];

  function createId() {
    return `tn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readProfile() {
    try {
      return JSON.parse(window.localStorage.getItem(profileKey) || 'null');
    } catch {
      return null;
    }
  }

  function saveProfile(profile) {
    window.localStorage.setItem(profileKey, JSON.stringify(profile));
    return profile;
  }

  function api(path, body) {
    return window.fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Serverantwort ${response.status}`);
      }
      return response.json();
    });
  }

  function readAvatar(file) {
    return new Promise((resolve) => {
      if (!file) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result));
      reader.addEventListener('error', () => resolve(''));
      reader.readAsDataURL(file);
    });
  }

  function showProfileWizard() {
    const existing = readProfile() || {};
    const dialog = document.createElement('div');
    dialog.className = 'profile-dialog';
    dialog.innerHTML = `
      <form class="profile-form">
        <h2>Teilnehmerprofil einrichten</h2>
        <p>Diese Daten werden an den Dozenten uebertragen, damit Fortschritt und Hilfeanfragen im Kurs zugeordnet werden koennen.</p>
        <label>Anzeigename<input name="displayName" required value="${existing.displayName || ''}"></label>
        <label>Kuerzel<input name="shortName" required value="${existing.shortName || ''}"></label>
        <label>E-Mail optional<input name="email" type="email" value="${existing.email || ''}"></label>
        <label>Teams-Name optional<input name="teamsName" value="${existing.teamsName || ''}"></label>
        <label>Profilbild optional<input name="avatar" type="file" accept="image/*"></label>
        <button type="submit">Profil speichern und verbinden</button>
      </form>
    `;
    document.body.append(dialog);

    return new Promise((resolve) => {
      dialog.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const profile = saveProfile({
          participantId: existing.participantId || createId(),
          displayName: String(formData.get('displayName') || '').trim(),
          shortName: String(formData.get('shortName') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          teamsName: String(formData.get('teamsName') || '').trim(),
          avatarDataUrl: await readAvatar(formData.get('avatar')) || existing.avatarDataUrl || ''
        });
        dialog.remove();
        resolve(profile);
      });
    });
  }

  async function ensureProfile() {
    const existing = readProfile();
    if (existing?.displayName && existing?.shortName) {
      return existing;
    }
    return showProfileWizard();
  }

  function addProgressControls(profile) {
    cards.forEach((card) => {
      if (card.classList.contains('is-locked')) {
        return;
      }
      const actions = document.createElement('div');
      actions.className = 'progress-actions';
      actions.innerHTML = `
        <button type="button" data-progress-state="gestartet" data-progress="10">Gestartet</button>
        <button type="button" data-progress-state="in Bearbeitung" data-progress="50">In Bearbeitung</button>
        <button type="button" data-progress-state="Hilfe benoetigt" data-progress="50" data-help="true">Hilfe benoetigt</button>
        <button type="button" data-progress-state="erledigt" data-progress="100">Erledigt</button>
      `;
      actions.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) {
          return;
        }
        await api('/api/participants/progress', {
          participantId: profile.participantId,
          status: {
            currentTask: card.querySelector('h3')?.textContent || card.dataset.releaseKey,
            progress: Number(button.dataset.progress),
            state: button.dataset.progressState,
            needsHelp: button.dataset.help === 'true'
          }
        });
      });
      card.append(actions);
    });
  }

  async function refreshReleases() {
    const releases = await api('/api/releases');
    window.LFZQ8A_PARTICIPANT_RELEASES = releases;
    document.querySelectorAll('[data-release-key]').forEach((item) => {
      const isReleased = releases[item.dataset.releaseKey] === true;
      const state = item.querySelector('.release-state');
      item.classList.toggle('is-locked', !isReleased);
      if (state) {
        state.textContent = isReleased ? 'Freigegeben' : 'Gesperrt';
      }
    });
  }

  async function start() {
    if (!isClassroomServer) {
      return;
    }

    await refreshReleases();
    const profile = await ensureProfile();
    await api('/api/participants/profile', profile);
    addProgressControls(profile);
    window.setInterval(() => {
      api('/api/participants/profile', profile).catch(() => {});
      refreshReleases().catch(() => {});
    }, 15000);
  }

  start().catch((error) => {
    window.alert(`Verbindung zum Kursserver fehlgeschlagen: ${error.message}`);
  });
})();
