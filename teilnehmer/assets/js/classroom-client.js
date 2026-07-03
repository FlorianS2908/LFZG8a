(() => {
  'use strict';

  const profileKey = 'lfzq8a-participant-profile';
  const languageKey = 'lfzq8a-participant-language';
  const isClassroomServer = /^https?:$/.test(window.location.protocol);
  const cards = [...document.querySelectorAll('[data-release-key]')];
  const supportedLanguages = [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Turkce' }
  ];
  const translations = {
    de: {
      participantArea: 'Teilnehmerbereich',
      participantIntro: 'Webvarianten, Aufgaben, Starterdateien, Quizpools und Projektmaterial fuer LFZQ8a HTML & CSS.',
      dayCards: 'Tageskarten',
      projectAndTools: 'Projekt und Tools',
      language: 'Sprache',
      profileTitle: 'Teilnehmerprofil einrichten',
      profileText: 'Diese Daten werden an den Dozenten uebertragen, damit Fortschritt und Hilfeanfragen im Kurs zugeordnet werden koennen.',
      displayName: 'Anzeigename',
      shortName: 'Kuerzel',
      emailOptional: 'E-Mail optional',
      teamsOptional: 'Teams-Name optional',
      avatarOptional: 'Profilbild optional',
      saveProfile: 'Profil speichern und verbinden',
      started: 'Gestartet',
      inProgress: 'In Bearbeitung',
      helpNeeded: 'Hilfe benoetigt',
      done: 'Erledigt',
      released: 'Freigegeben',
      locked: 'Gesperrt',
      lockedMessage: 'Vom Dozenten noch nicht freigeschaltet',
      connectionFailed: 'Verbindung zum Kursserver fehlgeschlagen: {message}'
    },
    en: {
      participantArea: 'Participant area',
      participantIntro: 'Web variants, tasks, starter files, quiz pools and project material for LFZQ8a HTML & CSS.',
      dayCards: 'Day cards',
      projectAndTools: 'Projects and tools',
      language: 'Language',
      profileTitle: 'Set up participant profile',
      profileText: 'This data is sent to the teacher so progress and help requests can be assigned during the course.',
      displayName: 'Display name',
      shortName: 'Short name',
      emailOptional: 'Email optional',
      teamsOptional: 'Teams name optional',
      avatarOptional: 'Profile image optional',
      saveProfile: 'Save profile and connect',
      started: 'Started',
      inProgress: 'In progress',
      helpNeeded: 'Help needed',
      done: 'Done',
      released: 'Released',
      locked: 'Locked',
      lockedMessage: 'Not released by the teacher yet',
      connectionFailed: 'Connection to course server failed: {message}'
    },
    tr: {
      participantArea: 'Katilimci alani',
      participantIntro: 'LFZQ8a HTML & CSS icin web varyantlari, gorevler, baslangic dosyalari, quiz havuzlari ve proje materyalleri.',
      dayCards: 'Gun kartlari',
      projectAndTools: 'Projeler ve araclar',
      language: 'Dil',
      profileTitle: 'Katilimci profilini ayarla',
      profileText: 'Bu bilgiler egitmene gonderilir; ilerleme ve yardim istekleri kursta kisilere atanabilir.',
      displayName: 'Gorunen ad',
      shortName: 'Kisa ad',
      emailOptional: 'E-posta istege bagli',
      teamsOptional: 'Teams adi istege bagli',
      avatarOptional: 'Profil resmi istege bagli',
      saveProfile: 'Profili kaydet ve baglan',
      started: 'Basladi',
      inProgress: 'Devam ediyor',
      helpNeeded: 'Yardim gerekiyor',
      done: 'Tamamlandi',
      released: 'Acik',
      locked: 'Kilitli',
      lockedMessage: 'Egitmen tarafindan henuz acilmadi',
      connectionFailed: 'Kurs sunucusuna baglanti basarisiz: {message}'
    }
  };

  function normalizeLanguage(language) {
    return translations[language] ? language : 'de';
  }

  function getLanguage() {
    return normalizeLanguage(
      window.localStorage.getItem(languageKey) ||
      window.LFZQ8A_PARTICIPANT_LANGUAGE ||
      'de'
    );
  }

  function t(key, replacements = {}) {
    const template = translations[getLanguage()][key] || translations.de[key] || key;
    return Object.entries(replacements).reduce((text, [name, value]) => (
      text.replaceAll(`{${name}}`, String(value))
    ), template);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function applyStaticTranslations() {
    document.documentElement.lang = getLanguage();
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-release-key]').forEach((item) => {
      const releases = window.LFZQ8A_PARTICIPANT_RELEASES || {};
      const isReleased = releases[item.dataset.releaseKey] === true;
      const state = item.querySelector('.release-state');
      if (state) {
        state.textContent = isReleased ? t('released') : t('locked');
      }
      item.dataset.lockedText = t('lockedMessage');
    });
  }

  function languageOptions(selectedLanguage) {
    return supportedLanguages.map((language) => (
      `<option value="${language.code}"${language.code === selectedLanguage ? ' selected' : ''}>${language.label}</option>`
    )).join('');
  }

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
    const selectedLanguage = normalizeLanguage(existing.language || getLanguage());
    const dialog = document.createElement('div');
    dialog.className = 'profile-dialog';
    dialog.innerHTML = `
      <form class="profile-form">
        <h2>${t('profileTitle')}</h2>
        <p>${t('profileText')}</p>
        <label>${t('language')}<select name="language">${languageOptions(selectedLanguage)}</select></label>
        <label>${t('displayName')}<input name="displayName" required value="${escapeHtml(existing.displayName)}"></label>
        <label>${t('shortName')}<input name="shortName" required value="${escapeHtml(existing.shortName)}"></label>
        <label>${t('emailOptional')}<input name="email" type="email" value="${escapeHtml(existing.email)}"></label>
        <label>${t('teamsOptional')}<input name="teamsName" value="${escapeHtml(existing.teamsName)}"></label>
        <label>${t('avatarOptional')}<input name="avatar" type="file" accept="image/*"></label>
        <button type="submit">${t('saveProfile')}</button>
      </form>
    `;
    document.body.append(dialog);

    return new Promise((resolve) => {
      dialog.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const language = normalizeLanguage(String(formData.get('language') || selectedLanguage));
        window.localStorage.setItem(languageKey, language);
        applyStaticTranslations();
        const profile = saveProfile({
          participantId: existing.participantId || createId(),
          language,
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
        <button type="button" data-progress-state="${t('started')}" data-progress="10">${t('started')}</button>
        <button type="button" data-progress-state="${t('inProgress')}" data-progress="50">${t('inProgress')}</button>
        <button type="button" data-progress-state="${t('helpNeeded')}" data-progress="50" data-help="true">${t('helpNeeded')}</button>
        <button type="button" data-progress-state="${t('done')}" data-progress="100">${t('done')}</button>
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
      item.dataset.lockedText = t('lockedMessage');
      if (state) {
        state.textContent = isReleased ? t('released') : t('locked');
      }
    });
  }

  async function start() {
    if (!isClassroomServer) {
      applyStaticTranslations();
      return;
    }

    applyStaticTranslations();
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
    window.alert(t('connectionFailed', { message: error.message }));
  });
})();
