(() => {
  'use strict';

  const readStoredProfile = (storageKey) => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  };

  const writeStoredProfile = (storageKey, profile) => {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
  };

  const readStoredWizardSettings = (storageKey) => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  };

  const writeStoredWizardSettings = (storageKey, settings) => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  };

  const getInitials = (name, fallback) => {
    const letters = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return letters || fallback || 'LF';
  };

  const renderAvatar = (avatarNode, profile, fallbackInitials) => {
    if (!avatarNode) {
      return;
    }

    if (profile.avatarDataUrl) {
      avatarNode.innerHTML = '';
      const image = document.createElement('img');
      image.src = profile.avatarDataUrl;
      image.alt = '';
      avatarNode.appendChild(image);
      return;
    }

    avatarNode.textContent = getInitials(profile.displayName, fallbackInitials);
  };

  const applyProfile = (root, profile, defaults) => {
    const nameNode = root.querySelector('[data-profile-name]');
    const subtitleNode = root.querySelector('[data-profile-subtitle]');
    const avatarNode = root.querySelector('[data-profile-avatar]');
    const form = root.querySelector('[data-profile-settings]');

    const normalized = {
      displayName: profile.displayName || defaults.displayName,
      subtitle: defaults.subtitle,
      language: profile.language || defaults.language,
      avatarDataUrl: profile.avatarDataUrl || ''
    };

    if (nameNode) {
      nameNode.textContent = normalized.displayName;
    }
    if (subtitleNode) {
      subtitleNode.textContent = normalized.subtitle;
    }
    if (form) {
      form.elements.displayName.value = normalized.displayName;
      if (form.elements.language) {
        form.elements.language.value = normalized.language;
      }
    }

    document.documentElement.lang = normalized.language;
    renderAvatar(avatarNode, normalized, defaults.initials);
  };

  const readAvatarFile = (file) => new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error || new Error('Profilbild konnte nicht gelesen werden.')));
    reader.readAsDataURL(file);
  });

  const renderOptions = (select, items, selectedValue) => {
    if (!select) {
      return;
    }

    select.innerHTML = '';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = String(item.value);
      option.textContent = item.label;
      if (String(item.value) === String(selectedValue)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  };

  const defaultLanguages = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Turkce' },
    { value: 'uk', label: 'Ukrainisch' },
    { value: 'ru', label: 'Russisch' }
  ];

  const normalizeLanguageOptions = (languages) => {
    if (!Array.isArray(languages) || !languages.length) {
      return defaultLanguages;
    }

    return languages.map((language) => ({
      value: language.code || language.value || language,
      label: language.label || language.name || language.code || language
    }));
  };

  const renderReports = (root, reports) => {
    const reportList = root.querySelector('[data-report-list]');
    if (!reportList) {
      return;
    }

    reportList.innerHTML = '';
    if (!Array.isArray(reports) || !reports.length) {
      reportList.textContent = 'Noch keine Testberichte vorhanden.';
      return;
    }

    reports.slice(0, 5).forEach((report) => {
      const item = document.createElement('div');
      item.textContent = `${report.createdAt || report.id || 'Testbericht'} - JSON: ${report.files?.json || '-'} | HTML: ${report.files?.html || '-'}`;
      reportList.appendChild(item);
    });
  };

  const applyWizardSettings = (root, settings, context = {}) => {
    const form = root.querySelector('[data-profile-settings]');
    if (!form || !root.querySelector('[data-wizard-settings]')) {
      return;
    }

    const profile = settings.teacherProfile || {};
    if (form.elements.email) {
      form.elements.email.value = profile.email || settings.email || '';
    }

    const languages = normalizeLanguageOptions(context.supportedLanguages);
    renderOptions(form.elements.teacherLanguage, languages, settings.teacherLanguage || settings.language || 'de');
    renderOptions(form.elements.participantLanguage, languages, settings.participantLanguage || 'de');

    const displays = Array.isArray(context.displays) && context.displays.length
      ? context.displays.map((display) => ({
        value: display.index,
        label: `${display.label || `Monitor ${Number(display.index) + 1}`}${display.primary ? ' (Hauptmonitor)' : ''}`
      }))
      : [{ value: 0, label: 'Monitor 1' }];
    renderOptions(form.elements.monitorIndex, displays, settings.monitorIndex ?? 0);

    if (form.elements.openTeacherOnSecondMonitor) {
      form.elements.openTeacherOnSecondMonitor.checked = settings.openTeacherOnSecondMonitor !== false;
    }
    if (form.elements.includeDeviceNetworkData) {
      form.elements.includeDeviceNetworkData.checked = settings.includeDeviceNetworkData === true;
    }
    renderReports(root, context.testReports || settings.testReports || []);
  };

  const readWizardSettingsFromForm = (form, previousSettings) => ({
    monitorIndex: Number(form.elements.monitorIndex?.value || 0),
    openTeacherOnSecondMonitor: form.elements.openTeacherOnSecondMonitor?.checked !== false,
    includeDeviceNetworkData: form.elements.includeDeviceNetworkData?.checked === true,
    teacherLanguage: String(form.elements.teacherLanguage?.value || form.elements.language?.value || 'de'),
    participantLanguage: String(form.elements.participantLanguage?.value || 'de'),
    teacherProfile: {
      displayName: String(form.elements.displayName?.value || '').trim() || 'Dozent',
      email: String(form.elements.email?.value || '').trim(),
      avatarDataUrl: previousSettings.teacherProfile?.avatarDataUrl || ''
    }
  });

  const refreshWizardFromDesktop = async (root, storageKey) => {
    const desktop = window.lfzq8aDesktop;
    const modeNode = root.querySelector('[data-wizard-mode]');
    if (!desktop?.getCourseState) {
      const localSettings = readStoredWizardSettings(storageKey);
      applyWizardSettings(root, localSettings);
      if (modeNode) {
        modeNode.textContent = 'Lokale Speicherung aktiv. In der Electron-App werden die bestehenden Wizard-Settings verwendet.';
      }
      return localSettings;
    }

    const courseState = await desktop.getCourseState();
    const settings = courseState.settings || {};
    applyWizardSettings(root, settings, {
      supportedLanguages: courseState.supportedLanguages,
      displays: courseState.displays,
      testReports: courseState.testReports
    });
    if (modeNode) {
      modeNode.textContent = 'Electron-App verbunden. Diese Werte werden in den bestehenden Wizard-Settings gespeichert.';
    }
    return settings;
  };

  const initializeProfileMenu = (root) => {
    const storageKey = root.dataset.profileStorage || 'lfzq8a-start-profile';
    const wizardStorageKey = root.dataset.wizardStorage || 'lfzq8a-teacher-wizard-settings';
    const toggle = root.querySelector('[data-profile-toggle]');
    const form = root.querySelector('[data-profile-settings]');
    const wizardToggle = root.querySelector('[data-wizard-settings-toggle]');
    const wizardSettings = root.querySelector('[data-wizard-settings]');
    const nameNode = root.querySelector('[data-profile-name]');
    const subtitleNode = root.querySelector('[data-profile-subtitle]');
    const avatarNode = root.querySelector('[data-profile-avatar]');

    if (!toggle || !form) {
      return;
    }

    const defaults = {
      displayName: nameNode ? nameNode.textContent.trim() : 'LFZQ8a',
      subtitle: subtitleNode ? subtitleNode.textContent.trim() : 'Aktueller Kurs',
      language: document.documentElement.lang || 'de',
      initials: avatarNode ? avatarNode.textContent.trim() : 'LF'
    };

    let storedProfile = readStoredProfile(storageKey);
    let wizardState = readStoredWizardSettings(wizardStorageKey);
    applyProfile(root, storedProfile, defaults);
    applyWizardSettings(root, wizardState);

    const setOpen = (isOpen) => {
      form.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen && wizardSettings && !wizardSettings.hidden) {
        refreshWizardFromDesktop(root, wizardStorageKey).then((settings) => {
          wizardState = settings || wizardState;
        });
      }
    };

    const setWizardOpen = (isOpen) => {
      if (!wizardSettings || !wizardToggle) {
        return;
      }

      wizardSettings.hidden = !isOpen;
      wizardToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        refreshWizardFromDesktop(root, wizardStorageKey).then((settings) => {
          wizardState = settings || wizardState;
        });
      }
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      setOpen(form.hidden);
    });

    wizardToggle?.addEventListener('click', () => setWizardOpen(wizardSettings.hidden));

    root.querySelector('[data-create-report]')?.addEventListener('click', async () => {
      const status = root.querySelector('[data-profile-status]');
      if (!window.lfzq8aDesktop?.createTestReport) {
        if (status) {
          status.textContent = 'Testberichte koennen nur in der Electron-App erstellt werden.';
        }
        return;
      }

      await window.lfzq8aDesktop.createTestReport();
      const reports = await window.lfzq8aDesktop.listTestReports();
      renderReports(root, reports);
      if (status) {
        status.textContent = 'Testbericht erstellt.';
      }
    });

    root.querySelector('[data-open-report-dir]')?.addEventListener('click', () => {
      if (window.lfzq8aDesktop?.openTestReportDir) {
        window.lfzq8aDesktop.openTestReportDir();
      }
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const file = form.elements.avatar.files && form.elements.avatar.files[0];
      const avatarDataUrl = file ? await readAvatarFile(file) : storedProfile.avatarDataUrl || '';
      storedProfile = {
        displayName: form.elements.displayName.value.trim() || defaults.displayName,
        language: form.elements.language?.value || storedProfile.language || defaults.language,
        avatarDataUrl
      };

      writeStoredProfile(storageKey, storedProfile);
      if (wizardSettings) {
        wizardState = readWizardSettingsFromForm(form, {
          ...wizardState,
          teacherProfile: {
            ...(wizardState.teacherProfile || {}),
            avatarDataUrl
          }
        });
        wizardState.teacherProfile.avatarDataUrl = avatarDataUrl || wizardState.teacherProfile.avatarDataUrl || '';

        if (window.lfzq8aDesktop?.saveSetup) {
          wizardState = await window.lfzq8aDesktop.saveSetup(wizardState);
        } else {
          writeStoredWizardSettings(wizardStorageKey, wizardState);
        }
      }
      applyProfile(root, storedProfile, defaults);
      applyWizardSettings(root, wizardState);
      form.elements.avatar.value = '';
      const status = root.querySelector('[data-profile-status]');
      if (status) {
        status.textContent = 'Settings gespeichert.';
      }
      setOpen(false);
    });
  };

  document.querySelectorAll('[data-profile-root]').forEach(initializeProfileMenu);
})();
