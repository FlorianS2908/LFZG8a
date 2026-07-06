(() => {
  'use strict';

  const storageKey = 'lfzq8a-teacher-mainview-settings';
  const fallbackSettings = {
    teacherLanguage: 'de',
    mainViewMonitor: 'monitor-1',
    teacherViewMonitor: 'monitor-2'
  };

  const translations = {
    de: {
      profileWizardButton: 'Dozenten Wizard Settings',
      profileSave: 'Speichern',
      profileClose: 'Schliessen',
      dashboardTitle: 'LFZQ8a Kursuebersicht',
      dashboardLead: 'Kurstage, Projekte und Werkzeuge werden hier schrittweise wieder sichtbar eingebunden. Bestehende Materialien bleiben erhalten.',
      wizardKicker: 'Dozenten-Setup',
      wizardTitle: 'Dozenten Wizard Settings',
      wizardDescription: 'Hier werden die Anzeige- und Monitor-Einstellungen fuer die Kursuebersicht eingerichtet.',
      languageTitle: 'Spracheinstellung',
      teacherLanguageLabel: 'Dozenten-/UI-Sprache',
      monitorTitle: 'Monitor fuer Dozenteninfo',
      monitorDescription: 'Waehle aus, welcher Monitor fuer die Main View und welcher Monitor fuer die Dozenten View verwendet werden soll.',
      mainMonitorLabel: 'Monitor fuer Main View',
      teacherMonitorLabel: 'Monitor fuer Dozenten View',
      monitorWarning: 'Main View und Dozenten View verwenden denselben Monitor. Bitte pruefe die Auswahl.',
      saveSettings: 'Speichern',
      cancelSettings: 'Abbrechen',
      saved: 'Einstellungen wurden gespeichert.'
    },
    en: {
      profileWizardButton: 'Teacher Wizard Settings',
      profileSave: 'Save',
      profileClose: 'Close',
      dashboardTitle: 'LFZQ8a Course Overview',
      dashboardLead: 'Course days, projects and tools are being reintroduced step by step. Existing materials remain preserved.',
      wizardKicker: 'Teacher Setup',
      wizardTitle: 'Teacher Wizard Settings',
      wizardDescription: 'Configure display and monitor settings for the teacher area.',
      languageTitle: 'Language Settings',
      teacherLanguageLabel: 'Teacher/UI language',
      monitorTitle: 'Monitor for teacher information',
      monitorDescription: 'Choose which monitor is used for the Main View and which monitor is used for the Teacher View.',
      mainMonitorLabel: 'Monitor for Main View',
      teacherMonitorLabel: 'Monitor for Teacher View',
      monitorWarning: 'Main View and Teacher View use the same monitor. Please check the selection.',
      saveSettings: 'Save',
      cancelSettings: 'Cancel',
      saved: 'Settings were saved.'
    }
  };

  function loadTeacherSettings() {
    try {
      return {
        ...fallbackSettings,
        ...JSON.parse(window.localStorage.getItem(storageKey) || '{}')
      };
    } catch (error) {
      return { ...fallbackSettings };
    }
  }

  function persistTeacherSettings(settings) {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }

  function applyTeacherLanguage(language) {
    const dictionary = translations[language] || translations.de;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n-key]').forEach((node) => {
      const value = dictionary[node.dataset.i18nKey];
      if (value) {
        node.textContent = value;
      }
    });
  }

  function validateMonitorSelection() {
    const form = document.querySelector('[data-teacher-wizard-form]');
    const warning = document.querySelector('[data-monitor-warning]');
    if (!form || !warning) {
      return true;
    }

    const usesSameMonitor = form.elements.mainViewMonitor.value === form.elements.teacherViewMonitor.value;
    warning.hidden = !usesSameMonitor;
    return !usesSameMonitor;
  }

  function populateWizard(settings) {
    const form = document.querySelector('[data-teacher-wizard-form]');
    if (!form) {
      return;
    }

    form.elements.teacherLanguage.value = settings.teacherLanguage;
    form.elements.mainViewMonitor.value = settings.mainViewMonitor;
    form.elements.teacherViewMonitor.value = settings.teacherViewMonitor;
    validateMonitorSelection();
  }

  function openTeacherWizard() {
    const dashboard = document.querySelector('[data-dashboard-view]');
    const wizard = document.querySelector('[data-teacher-wizard]');
    if (!dashboard || !wizard) {
      return;
    }

    dashboard.hidden = true;
    wizard.hidden = false;
    populateWizard(loadTeacherSettings());
    wizard.scrollIntoView({ block: 'start' });
  }

  function closeTeacherWizard() {
    const dashboard = document.querySelector('[data-dashboard-view]');
    const wizard = document.querySelector('[data-teacher-wizard]');
    const status = document.querySelector('[data-teacher-wizard-status]');
    if (!dashboard || !wizard) {
      return;
    }

    wizard.hidden = true;
    dashboard.hidden = false;
    if (status) {
      status.textContent = '';
    }
  }

  function saveTeacherSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const settings = {
      teacherLanguage: form.elements.teacherLanguage.value,
      mainViewMonitor: form.elements.mainViewMonitor.value,
      teacherViewMonitor: form.elements.teacherViewMonitor.value
    };

    persistTeacherSettings(settings);
    applyTeacherLanguage(settings.teacherLanguage);
    validateMonitorSelection();

    const status = document.querySelector('[data-teacher-wizard-status]');
    if (status) {
      status.textContent = (translations[settings.teacherLanguage] || translations.de).saved;
    }
  }

  async function loadDisplaysFromElectron() {
    if (!window.lfzq8aDesktop?.getCourseState) {
      return;
    }

    const courseState = await window.lfzq8aDesktop.getCourseState();
    const displays = Array.isArray(courseState.displays) ? courseState.displays : [];
    if (!displays.length) {
      return;
    }

    document.querySelectorAll('[data-main-monitor], [data-teacher-monitor]').forEach((select) => {
      const selected = select.value;
      select.innerHTML = '';
      displays.forEach((display) => {
        const option = document.createElement('option');
        option.value = `monitor-${Number(display.index) + 1}`;
        option.textContent = `${display.label || option.value}${display.primary ? ' (Hauptmonitor)' : ''}`;
        select.appendChild(option);
      });
      if ([...select.options].some((option) => option.value === selected)) {
        select.value = selected;
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-teacher-wizard]')) {
      event.preventDefault();
      openTeacherWizard();
    }
    if (event.target.closest('[data-close-teacher-wizard]')) {
      event.preventDefault();
      closeTeacherWizard();
    }
  });

  document.querySelector('[data-teacher-wizard-form]')?.addEventListener('submit', saveTeacherSettings);
  document.querySelectorAll('[data-main-monitor], [data-teacher-monitor]').forEach((select) => {
    select.addEventListener('change', validateMonitorSelection);
  });

  const initialSettings = loadTeacherSettings();
  applyTeacherLanguage(initialSettings.teacherLanguage);
  populateWizard(initialSettings);
  loadDisplaysFromElectron();

  window.lfzq8aTeacherStartview = {
    openTeacherWizard,
    closeTeacherWizard,
    saveTeacherSettings,
    loadTeacherSettings,
    applyTeacherLanguage,
    validateMonitorSelection
  };
})();
