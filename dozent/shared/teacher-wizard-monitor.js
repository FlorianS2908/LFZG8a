(() => {
  'use strict';

  const storageKey = 'lfzq8a_teacher_settings';
  const fallbackSettings = {
    teacherLanguage: 'de',
    mainViewMonitor: 'display-1',
    teacherViewMonitor: 'display-2',
    lastTestReportFilter: 'all',
    detectedDisplays: []
  };
  const individualAssignmentReleaseKeys = [
    'tag_01_task_tag_sheet',
    'tag_01_task_html_css_tag_overview',
    'tag_01_task_wunderland_farben_abstaende',
    'tag_01_task_wunderland_custom_properties',
    'tag_01_task_akkordeon_checked_selector',
    'tag_02_task_tag_sheet',
    'tag_02_task_wunderland_header_logo_navigation',
    'tag_02_task_wunderland_hero_button',
    'tag_02_task_akkordeon_radio_label',
    'tag_02_task_akkordeon_basislayout',
    'tag_02_task_akkordeon_active_panel',
    'tag_03_task_tag_sheet',
    'tag_03_task_wunderland_attraktionskarten',
    'tag_03_task_wunderland_bildkarten_hover',
    'tag_03_task_akkordeon_transition_fokus',
    'tag_04_task_tag_sheet',
    'tag_04_task_wunderland_grid_gallery_responsive',
    'tag_04_task_akkordeon_bilder_hintergrund',
    'tag_04_task_akkordeon_responsive',
    'tag_05_task_tag_sheet',
    'tag_05_task_wunderland_seitenabnahme',
    'tag_05_task_akkordeon_barrierearm'
  ];
  const fallbackReleases = {
    tag_01: false,
    tag_01_web: false,
    tag_01_tasks: false,
    tag_01_solutions: false,
    tag_01_quiz25: false,
    tag_01_quiz50: false,
    tag_02: false,
    tag_02_web: false,
    tag_02_tasks: false,
    tag_02_solutions: false,
    tag_02_quiz25: false,
    tag_02_quiz50: false,
    tag_03: false,
    tag_03_web: false,
    tag_03_tasks: false,
    tag_03_solutions: false,
    tag_03_quiz25: false,
    tag_03_quiz50: false,
    tag_04: false,
    tag_04_web: false,
    tag_04_tasks: false,
    tag_04_solutions: false,
    tag_04_quiz25: false,
    tag_04_quiz50: false,
    tag_05: false,
    tag_05_web: false,
    tag_05_tasks: false,
    tag_05_solutions: false,
    tag_05_quiz25: false,
    tag_05_quiz50: false,
    project_materials: false,
    project_accordion_tasks: false,
    project_accordion_workspace: false,
    project_accordion_result: false,
    project_wunderland_tasks: false,
    project_wunderland_workspace: false,
    project_wunderland_result: false,
    ...Object.fromEntries(individualAssignmentReleaseKeys.map((key) => [key, false]))
  };
  const releaseButtonLabels = {
    tag_01_task_tag_sheet: 'Allgemeine Uebung Tag 1 - Aufgabenblatt',
    tag_01_task_html_css_tag_overview: 'Allgemeine Uebung Tag 1 - HTML/CSS Tags Uebersicht',
    tag_01_task_wunderland_farben_abstaende: 'Wunderland einfach 04 - Farben und Abstaende',
    tag_01_task_wunderland_custom_properties: 'Wunderland schwer 01 - Custom Properties Designsystem',
    tag_01_task_akkordeon_checked_selector: 'Akkordeon schwer 01 - :checked Selektor',
    tag_02_task_tag_sheet: 'Allgemeine Uebung Tag 2 - Aufgabenblatt',
    tag_02_task_wunderland_header_logo_navigation: 'Wunderland einfach 01 - Header, Logo und Navigation',
    tag_02_task_wunderland_hero_button: 'Wunderland einfach 02 - Hero Button',
    tag_02_task_akkordeon_radio_label: 'Akkordeon einfach 01 - Radio und Label',
    tag_02_task_akkordeon_basislayout: 'Akkordeon einfach 03 - Basislayout',
    tag_02_task_akkordeon_active_panel: 'Akkordeon einfach 04 - Aktives Panel stylen',
    tag_03_task_tag_sheet: 'Allgemeine Uebung Tag 3 - Aufgabenblatt',
    tag_03_task_wunderland_attraktionskarten: 'Wunderland einfach 03 - Attraktionskarten',
    tag_03_task_wunderland_bildkarten_hover: 'Wunderland schwer 03 - Bildkarten Hover',
    tag_03_task_akkordeon_transition_fokus: 'Akkordeon schwer 02 - Transition und Fokus',
    tag_04_task_tag_sheet: 'Allgemeine Uebung Tag 4 - Aufgabenblatt',
    tag_04_task_wunderland_grid_gallery_responsive: 'Wunderland schwer 02 - Grid Gallery Responsive',
    tag_04_task_akkordeon_bilder_hintergrund: 'Akkordeon einfach 02 - Bilder als Hintergrund',
    tag_04_task_akkordeon_responsive: 'Akkordeon schwer 03 - Responsive Akkordeon',
    tag_05_task_tag_sheet: 'Allgemeine Uebung Tag 5 - Aufgabenblatt',
    tag_05_task_wunderland_seitenabnahme: 'Wunderland schwer 04 - Seitenabnahme',
    tag_05_task_akkordeon_barrierearm: 'Akkordeon schwer 04 - Barrierearme Interaktion',
    project_accordion_tasks: 'Akkordeon - Aufgabenpaket',
    project_accordion_workspace: 'Akkordeon - Arbeitsordner',
    project_accordion_result: 'Akkordeon - Endergebnis',
    project_wunderland_tasks: 'Wunderland - Aufgabenpaket',
    project_wunderland_workspace: 'Wunderland - Arbeitsordner',
    project_wunderland_result: 'Wunderland - Endergebnis'
  };

  // TODO: Spaeter durch echte Testdatenquelle ersetzen.
  const testReportData = {
    lastRun: '2026-07-05 14:30',
    summary: { total: 42, passed: 39, warnings: 2, failed: 1 },
    tests: [
      { id: 'nav-main-load', name: 'Dozenten Main View laedt', area: 'Main View', status: 'passed', description: 'Die Startview konnte ohne JavaScript-Fehler geladen werden.', durationMs: 120 },
      { id: 'monitor-api-fallback', name: 'Monitorerkennung geprueft', area: 'Monitorwahl', status: 'warning', description: 'Echte Monitorerkennung ist nur verfuegbar, wenn die Umgebung dies unterstuetzt.', durationMs: 80 },
      { id: 'tag3-link-check', name: 'Tag 3 Webvariante erreichbar', area: 'Webvarianten', status: 'failed', description: 'Die verlinkte Datei konnte nicht gefunden werden.', durationMs: 45 },
      { id: 'teacher-profile-open', name: 'Profilmenue oeffnet Wizard', area: 'Dozentenprofil', status: 'passed', description: 'Der Einstieg oeffnet den Wizard in der Main View.', durationMs: 60 }
    ]
  };

  const translations = {
    de: {
      profileWizardButton: 'Dozenten Wizard Settings',
      profileSave: 'Speichern',
      profileClose: 'Schliessen',
      dashboardTitle: 'LFZQ8a Kursuebersicht',
      dashboardLead: 'Kurstage, Projekte und Werkzeuge werden hier schrittweise wieder sichtbar eingebunden. Bestehende Materialien bleiben erhalten.',
      dashboardKicker: 'Kursuebersicht',
      day1Kicker: 'Tag 1',
      day1Title: 'Tag 1 - CSS-Grundlagen',
      day1Text: 'Selektoren, Box-Modell, Custom Properties',
      day2Kicker: 'Tag 2',
      day2Title: 'Tag 2 - Flexbox',
      day2Text: 'Navigation, Komponenten, Flexbox-Achsen',
      day3Kicker: 'Tag 3',
      day3Title: 'Tag 3 - CSS Grid',
      day3Text: 'Raster, Layoutbereiche, Datenlayouts',
      day4Kicker: 'Tag 4',
      day4Title: 'Tag 4 - Responsive Design',
      day4Text: 'Media Queries, Breakpoints, flexible Medien',
      day5Kicker: 'Tag 5',
      day5Title: 'Tag 5 - Projektabschluss',
      day5Text: 'Webfonts, Refactoring, Abschlussprojekt',
      webVariant: 'Webvariante',
      assignments: 'Aufgaben',
      solutions: 'Loesungen',
      quiz25: 'Quiz 25',
      quiz50: 'Quiz 50',
      projectsTitle: 'Projekte',
      projectsText: 'Die zwei Projektpfade mit Teilaufgaben, Arbeitsordner und Endergebnis.',
      projectKicker: 'Projekt',
      accordionProject: 'Projekt Akkordeon',
      wunderlandProject: 'Projekt Wunderland',
      projectCardText: 'Aufgabenpaket in der App anzeigen, Arbeitsordner in VS Code bearbeiten.',
      taskPackage: 'Aufgabenpaket',
      workspaceVsCode: 'Arbeitsordner in VS Code',
      finalResult: 'Endergebnis',
      wizardKicker: 'Dozenten-Setup',
      wizardTitle: 'Dozenten Wizard Settings',
      wizardDescription: 'Hier werden Anzeige, Monitorzuordnung und Testberichte fuer die Kursuebersicht verwaltet.',
      generalTitle: 'Allgemein',
      teacherLanguageLabel: 'Dozenten-/UI-Sprache',
      monitorTitle: 'Monitore',
      monitorDescription: 'Waehle aus, welcher Monitor fuer die Main View und welcher Monitor fuer die Dozenten View verwendet werden soll.',
      monitorFallbackNotice: 'Echte Monitorerkennung ist in dieser Umgebung nicht verfuegbar. Es wird ein Fallback verwendet.',
      mainMonitorLabel: 'Monitor fuer Main View',
      teacherMonitorLabel: 'Monitor fuer Dozenten View',
      highlightMonitor: 'Monitor markieren',
      monitorWarning: 'Main View und Dozenten View sollten auf unterschiedlichen Monitoren liegen.',
      saveSettings: 'Speichern',
      cancelSettings: 'Abbrechen',
      saved: 'Einstellungen wurden gespeichert.',
      movePrepared: 'Dozenten View ist vorbereitet, aber noch nicht als eigenes Fenster geoeffnet.',
      browserHighlightFallback: 'Physische Monitor-Markierung ist in dieser Browserumgebung nicht verfuegbar.',
      testReportTitle: 'Testbericht',
      testReportDescription: 'Hier werden die Ergebnisse der aktuellen Testlaeufe angezeigt. Der Bereich dient zur schnellen Pruefung, ob die Webvarianten, Navigationen, Links und Funktionen korrekt arbeiten.',
      testsTotal: 'Tests gesamt',
      testsPassed: 'Erfolgreich',
      testsWarnings: 'Warnungen',
      testsFailed: 'Fehler',
      lastRun: 'Letzter Testlauf',
      completion: 'Gesamterfuellung',
      filterAll: 'Alle',
      filterPassed: 'Erfolgreich',
      filterWarnings: 'Warnungen',
      filterFailed: 'Fehler',
      area: 'Bereich',
      result: 'Ergebnis',
      duration: 'Dauer',
      'nav-main-load_name': 'Dozenten Main View laedt',
      'nav-main-load_description': 'Die Startview konnte ohne JavaScript-Fehler geladen werden.',
      'monitor-api-fallback_name': 'Monitorerkennung geprueft',
      'monitor-api-fallback_description': 'Echte Monitorerkennung ist nur verfuegbar, wenn die Umgebung dies unterstuetzt.',
      'tag3-link-check_name': 'Tag 3 Webvariante erreichbar',
      'tag3-link-check_description': 'Die verlinkte Datei konnte nicht gefunden werden.',
      'teacher-profile-open_name': 'Profilmenue oeffnet Wizard',
      'teacher-profile-open_description': 'Der Einstieg oeffnet den Wizard in der Main View.'
    },
    en: {
      profileWizardButton: 'Teacher Wizard Settings',
      profileSave: 'Save',
      profileClose: 'Close',
      dashboardTitle: 'LFZQ8a Course Overview',
      dashboardLead: 'Course days, projects and tools are being reintroduced step by step. Existing materials remain preserved.',
      dashboardKicker: 'Course overview',
      day1Kicker: 'Day 1',
      day1Title: 'Day 1 - CSS basics',
      day1Text: 'Selectors, box model, custom properties',
      day2Kicker: 'Day 2',
      day2Title: 'Day 2 - Flexbox',
      day2Text: 'Navigation, components, flexbox axes',
      day3Kicker: 'Day 3',
      day3Title: 'Day 3 - CSS Grid',
      day3Text: 'Grids, layout areas, data layouts',
      day4Kicker: 'Day 4',
      day4Title: 'Day 4 - Responsive design',
      day4Text: 'Media queries, breakpoints, flexible media',
      day5Kicker: 'Day 5',
      day5Title: 'Day 5 - Project completion',
      day5Text: 'Web fonts, refactoring, final project',
      webVariant: 'Web variant',
      assignments: 'Tasks',
      solutions: 'Solutions',
      quiz25: 'Quiz 25',
      quiz50: 'Quiz 50',
      projectsTitle: 'Projects',
      projectsText: 'The two project paths with subtasks, working folder and final result.',
      projectKicker: 'Project',
      accordionProject: 'Accordion project',
      wunderlandProject: 'Wunderland project',
      projectCardText: 'Show the task package in the app and edit the working folder in VS Code.',
      taskPackage: 'Task package',
      workspaceVsCode: 'Working folder in VS Code',
      finalResult: 'Final result',
      wizardKicker: 'Teacher Setup',
      wizardTitle: 'Teacher Wizard Settings',
      wizardDescription: 'Display, monitor assignment and test reports for the course overview are managed here.',
      generalTitle: 'General',
      teacherLanguageLabel: 'Teacher/UI language',
      monitorTitle: 'Monitors',
      monitorDescription: 'Choose which monitor is used for the Main View and which monitor is used for the Teacher View.',
      monitorFallbackNotice: 'Real monitor detection is not available in this environment. A fallback is used.',
      mainMonitorLabel: 'Monitor for Main View',
      teacherMonitorLabel: 'Monitor for Teacher View',
      highlightMonitor: 'Highlight monitor',
      monitorWarning: 'Main View and Teacher View should be on different monitors.',
      saveSettings: 'Save',
      cancelSettings: 'Cancel',
      saved: 'Settings were saved.',
      movePrepared: 'Teacher View is prepared, but has not been opened as a separate window yet.',
      browserHighlightFallback: 'Physical monitor highlighting is not available in this browser environment.',
      testReportTitle: 'Test report',
      testReportDescription: 'Results of the current test runs are shown here. This area helps quickly verify whether web variants, navigation, links and functions work correctly.',
      testsTotal: 'Total tests',
      testsPassed: 'Passed',
      testsWarnings: 'Warnings',
      testsFailed: 'Errors',
      lastRun: 'Last test run',
      completion: 'Completion',
      filterAll: 'All',
      filterPassed: 'Passed',
      filterWarnings: 'Warnings',
      filterFailed: 'Errors',
      area: 'Area',
      result: 'Result',
      duration: 'Duration',
      'nav-main-load_name': 'Teacher Main View loads',
      'nav-main-load_description': 'The start view loaded without JavaScript errors.',
      'monitor-api-fallback_name': 'Monitor detection checked',
      'monitor-api-fallback_description': 'Real monitor detection is only available when the environment supports it.',
      'tag3-link-check_name': 'Day 3 web variant reachable',
      'tag3-link-check_description': 'The linked file could not be found.',
      'teacher-profile-open_name': 'Profile menu opens wizard',
      'teacher-profile-open_description': 'The entry point opens the wizard in the Main View.'
    },
    tr: {
      profileWizardButton: 'Egitmen Wizard Ayarlari',
      profileSave: 'Kaydet',
      profileClose: 'Kapat',
      dashboardTitle: 'LFZQ8a Kurs Ozeti',
      dashboardLead: 'Kurs gunleri, projeler ve araclar adim adim tekrar gorunur hale getiriliyor. Mevcut materyaller korunur.',
      dashboardKicker: 'Kurs ozeti',
      day1Kicker: 'Gun 1',
      day1Title: 'Gun 1 - CSS temelleri',
      day1Text: 'Seciciler, kutu modeli, custom properties',
      day2Kicker: 'Gun 2',
      day2Title: 'Gun 2 - Flexbox',
      day2Text: 'Navigasyon, bilesenler, Flexbox eksenleri',
      day3Kicker: 'Gun 3',
      day3Title: 'Gun 3 - CSS Grid',
      day3Text: 'Izgaralar, layout alanlari, veri layoutlari',
      day4Kicker: 'Gun 4',
      day4Title: 'Gun 4 - Responsive design',
      day4Text: 'Media queries, breakpointler, esnek medya',
      day5Kicker: 'Gun 5',
      day5Title: 'Gun 5 - Proje kapanisi',
      day5Text: 'Web fontlari, refactoring, final proje',
      webVariant: 'Web varyanti',
      assignments: 'Gorevler',
      solutions: 'Cozumler',
      quiz25: 'Quiz 25',
      quiz50: 'Quiz 50',
      projectsTitle: 'Projeler',
      projectsText: 'Alt gorevler, calisma klasoru ve final sonucuyla iki proje yolu.',
      projectKicker: 'Proje',
      accordionProject: 'Akkordeon projesi',
      wunderlandProject: 'Wunderland projesi',
      projectCardText: 'Gorev paketini uygulamada goster, calisma klasorunu VS Code ile duzenle.',
      taskPackage: 'Gorev paketi',
      workspaceVsCode: 'VS Code calisma klasoru',
      finalResult: 'Final sonuc',
      wizardKicker: 'Egitmen kurulumu',
      wizardTitle: 'Egitmen Wizard Ayarlari',
      wizardDescription: 'Kurs ozeti icin gorunum, monitor atamasi ve test raporlari burada yonetilir.',
      generalTitle: 'Genel',
      teacherLanguageLabel: 'Egitmen/UI dili',
      monitorTitle: 'Monitorler',
      monitorDescription: 'Main View ve Egitmen View icin hangi monitorun kullanilacagini sec.',
      monitorFallbackNotice: 'Bu ortamda gercek monitor algilama yok. Fallback kullaniliyor.',
      mainMonitorLabel: 'Main View monitoru',
      teacherMonitorLabel: 'Egitmen View monitoru',
      highlightMonitor: 'Monitoru isaretle',
      monitorWarning: 'Main View ve Egitmen View farkli monitorlerde olmalidir.',
      saveSettings: 'Kaydet',
      cancelSettings: 'Iptal',
      saved: 'Ayarlar kaydedildi.',
      movePrepared: 'Egitmen View hazirlandi, fakat henuz ayri pencere olarak acilmadi.',
      browserHighlightFallback: 'Fiziksel monitor isaretleme bu tarayici ortaminda kullanilamaz.',
      testReportTitle: 'Test raporu',
      testReportDescription: 'Guncel test kosularinin sonuclari burada gosterilir. Bu alan web varyantlari, navigasyonlar, linkler ve fonksiyonlarin dogru calistigini hizli kontrol etmeye yarar.',
      testsTotal: 'Toplam test',
      testsPassed: 'Basarili',
      testsWarnings: 'Uyarilar',
      testsFailed: 'Hatalar',
      lastRun: 'Son test kosusu',
      completion: 'Tamamlanma',
      filterAll: 'Tumu',
      filterPassed: 'Basarili',
      filterWarnings: 'Uyarilar',
      filterFailed: 'Hatalar',
      area: 'Alan',
      result: 'Sonuc',
      duration: 'Sure',
      'nav-main-load_name': 'Egitmen Main View yukleniyor',
      'nav-main-load_description': 'Startview JavaScript hatasi olmadan yuklendi.',
      'monitor-api-fallback_name': 'Monitor algilama kontrol edildi',
      'monitor-api-fallback_description': 'Gercek monitor algilama yalnizca ortam destekliyorsa kullanilabilir.',
      'tag3-link-check_name': 'Gun 3 web varyanti erisilebilir',
      'tag3-link-check_description': 'Bagli dosya bulunamadi.',
      'teacher-profile-open_name': 'Profil menusu wizard aciyor',
      'teacher-profile-open_description': 'Giris noktasi wizardi Main View icinde acar.'
    },
    ru: {
      profileWizardButton: 'Настройки мастера преподавателя',
      profileSave: 'Сохранить',
      profileClose: 'Закрыть',
      dashboardTitle: 'Обзор курса LFZQ8a',
      dashboardLead: 'Дни курса, проекты и инструменты постепенно снова подключаются. Существующие материалы сохраняются.',
      dashboardKicker: 'Обзор курса',
      day1Kicker: 'День 1',
      day1Title: 'День 1 - основы CSS',
      day1Text: 'Селекторы, box model, custom properties',
      day2Kicker: 'День 2',
      day2Title: 'День 2 - Flexbox',
      day2Text: 'Навигация, компоненты, оси Flexbox',
      day3Kicker: 'День 3',
      day3Title: 'День 3 - CSS Grid',
      day3Text: 'Сетки, области layout, data layouts',
      day4Kicker: 'День 4',
      day4Title: 'День 4 - responsive design',
      day4Text: 'Media queries, breakpoints, гибкие медиа',
      day5Kicker: 'День 5',
      day5Title: 'День 5 - завершение проекта',
      day5Text: 'Webfonts, refactoring, итоговый проект',
      webVariant: 'Web-вариант',
      assignments: 'Задания',
      solutions: 'Решения',
      quiz25: 'Quiz 25',
      quiz50: 'Quiz 50',
      projectsTitle: 'Проекты',
      projectsText: 'Два проектных пути с подзадачами, рабочей папкой и итоговым результатом.',
      projectKicker: 'Проект',
      accordionProject: 'Проект Akkordeon',
      wunderlandProject: 'Проект Wunderland',
      projectCardText: 'Показать пакет заданий в приложении и редактировать рабочую папку в VS Code.',
      taskPackage: 'Пакет заданий',
      workspaceVsCode: 'Рабочая папка в VS Code',
      finalResult: 'Итоговый результат',
      wizardKicker: 'Настройка преподавателя',
      wizardTitle: 'Настройки мастера преподавателя',
      wizardDescription: 'Здесь управляются отображение, назначение мониторов и тестовые отчеты для обзора курса.',
      generalTitle: 'Общее',
      teacherLanguageLabel: 'Язык преподавателя/UI',
      monitorTitle: 'Мониторы',
      monitorDescription: 'Выберите, какой монитор используется для Main View и какой для Teacher View.',
      monitorFallbackNotice: 'Реальное распознавание мониторов в этой среде недоступно. Используется fallback.',
      mainMonitorLabel: 'Монитор для Main View',
      teacherMonitorLabel: 'Монитор для Teacher View',
      highlightMonitor: 'Отметить монитор',
      monitorWarning: 'Main View и Teacher View должны находиться на разных мониторах.',
      saveSettings: 'Сохранить',
      cancelSettings: 'Отмена',
      saved: 'Настройки сохранены.',
      movePrepared: 'Teacher View подготовлен, но еще не открыт как отдельное окно.',
      browserHighlightFallback: 'Физическая отметка монитора недоступна в этой браузерной среде.',
      testReportTitle: 'Тестовый отчет',
      testReportDescription: 'Здесь отображаются результаты текущих тестовых запусков. Раздел помогает быстро проверить web-варианты, навигацию, ссылки и функции.',
      testsTotal: 'Всего тестов',
      testsPassed: 'Успешно',
      testsWarnings: 'Предупреждения',
      testsFailed: 'Ошибки',
      lastRun: 'Последний запуск',
      completion: 'Выполнение',
      filterAll: 'Все',
      filterPassed: 'Успешно',
      filterWarnings: 'Предупреждения',
      filterFailed: 'Ошибки',
      area: 'Область',
      result: 'Результат',
      duration: 'Длительность',
      'nav-main-load_name': 'Teacher Main View загружается',
      'nav-main-load_description': 'Startview загрузился без JavaScript-ошибок.',
      'monitor-api-fallback_name': 'Проверено распознавание мониторов',
      'monitor-api-fallback_description': 'Реальное распознавание мониторов доступно только если среда это поддерживает.',
      'tag3-link-check_name': 'Web-вариант дня 3 доступен',
      'tag3-link-check_description': 'Связанный файл не найден.',
      'teacher-profile-open_name': 'Меню профиля открывает мастер',
      'teacher-profile-open_description': 'Точка входа открывает мастер в Main View.'
    }
  };

  let connectedDisplays = [];

  function loadTeacherSettings() {
    try {
      return { ...fallbackSettings, ...JSON.parse(window.localStorage.getItem(storageKey) || '{}') };
    } catch (error) {
      return { ...fallbackSettings };
    }
  }

  function persistTeacherSettings(settings) {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }

  function t(key) {
    const language = loadTeacherSettings().teacherLanguage;
    return (translations[language] || translations.de)[key] || translations.de[key] || key;
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
    if (document.querySelector('[data-test-list]')) {
      renderTestReport(loadTeacherSettings().lastTestReportFilter);
    }
  }

  function translatedTestValue(test, suffix, fallback) {
    const key = `${test.id}_${suffix}`;
    const value = t(key);
    return value === key ? fallback : value;
  }

  async function loadCourseOverviewReleases() {
    if (window.lfzq8aDesktop?.getParticipantReleases) {
      try {
        return {
          ...fallbackReleases,
          ...(await window.lfzq8aDesktop.getParticipantReleases())
        };
      } catch (error) {
        return fallbackReleases;
      }
    }
    return fallbackReleases;
  }

  function setReleaseLinkState(link, isReleased) {
    const releaseLabel = getReleaseButtonLabel(link.dataset.releaseKey);
    if (releaseLabel) {
      link.textContent = releaseLabel;
    }
    link.hidden = !isReleased;
    link.classList.toggle('is-release-locked', !isReleased);
    link.setAttribute('aria-disabled', String(!isReleased));
    link.tabIndex = isReleased ? 0 : -1;
    link.dataset.releaseLocked = String(!isReleased);
  }

  function getReleaseButtonLabel(releaseKey) {
    if (releaseButtonLabels[releaseKey]) {
      return releaseButtonLabels[releaseKey];
    }
    const dayMatch = /^tag_(\d{2})_(web|tasks|solutions|quiz25|quiz50)$/.exec(releaseKey || '');
    if (!dayMatch) {
      return '';
    }
    const dayNumber = Number(dayMatch[1]);
    const labelByType = {
      web: 'Webvariante',
      tasks: 'Aufgabenuebersicht',
      solutions: 'Loesungen',
      quiz25: 'Quiz 25',
      quiz50: 'Quiz 50'
    };
    return `Tag ${dayNumber} - ${labelByType[dayMatch[2]]}`;
  }

  function setCourseOverviewCardState(card, isReleased, releases) {
    const hasReleasedLink = [...card.querySelectorAll('[data-release-link]')]
      .some((link) => releases[link.dataset.releaseKey] === true);
    const isLegacyDayRelease = /^tag_\d{2}$/.test(card.dataset.releaseKey || '');
    const cardVisible = hasReleasedLink || (isReleased && !isLegacyDayRelease);
    card.hidden = !cardVisible;
    card.classList.toggle('is-locked', !cardVisible);
    card.setAttribute('aria-disabled', String(!cardVisible));
    card.querySelectorAll('[data-release-link]').forEach((link) => {
      const linkReleaseKey = link.dataset.releaseKey;
      const linkReleased = cardVisible && (!linkReleaseKey || releases[linkReleaseKey] === true);
      setReleaseLinkState(link, linkReleased);
    });
  }

  function updateReleaseSections() {
    const sectionStates = new Map();
    document.querySelectorAll('[data-release-card]').forEach((card) => {
      const section = card.closest('[data-release-section]');
      if (!section) {
        return;
      }
      const key = section.dataset.releaseSectionKey;
      sectionStates.set(key, (sectionStates.get(key) || false) || !card.hidden);
    });
    document.querySelectorAll('[data-release-section]').forEach((section) => {
      const key = section.dataset.releaseSectionKey;
      section.hidden = !sectionStates.get(key);
    });
  }

  async function applyCourseOverviewReleases() {
    const releases = await loadCourseOverviewReleases();
    document.querySelectorAll('[data-release-card]').forEach((card) => {
      const releaseKey = card.dataset.releaseKey;
      setCourseOverviewCardState(card, releases[releaseKey] === true, releases);
    });
    updateReleaseSections();
  }

  function createFallbackDisplays() {
    return [
      { id: 'display-1', value: 'display-1', index: 0, label: 'Monitor 1', source: 'fallback' },
      { id: 'display-2', value: 'display-2', index: 1, label: 'Monitor 2', source: 'fallback' }
    ];
  }

  function formatDisplay(display, fallbackIndex) {
    const bounds = display.bounds || display.workArea || {};
    const width = bounds.width || '?';
    const height = bounds.height || '?';
    const x = Number.isFinite(bounds.x) ? bounds.x : '?';
    const y = Number.isFinite(bounds.y) ? bounds.y : '?';
    const scale = display.scaleFactor ? ` - ${display.scaleFactor}x` : '';
    const primary = display.primary ? ' - primaer' : ' - extern';
    const label = display.label || `Monitor ${fallbackIndex + 1}`;
    const value = display.id ? `display-${display.id}` : `display-${fallbackIndex + 1}`;
    return { ...display, value, label: `${label} - ${width}x${height} - x:${x} y:${y}${scale}${primary}` };
  }

  async function detectConnectedDisplays() {
    if (window.lfzq8aDesktop?.getCourseState) {
      const courseState = await window.lfzq8aDesktop.getCourseState();
      const displays = Array.isArray(courseState.displays) ? courseState.displays : [];
      if (displays.length) {
        connectedDisplays = displays.map(formatDisplay);
        return { displays: connectedDisplays, source: 'electron' };
      }
    }

    if ('getScreenDetails' in window) {
      try {
        const details = await window.getScreenDetails();
        connectedDisplays = Array.from(details.screens || []).map((screen, index) => formatDisplay({
          id: index + 1,
          label: `Monitor ${index + 1}`,
          primary: screen === details.currentScreen,
          bounds: { x: screen.left, y: screen.top, width: screen.width, height: screen.height },
          scaleFactor: screen.devicePixelRatio || window.devicePixelRatio
        }, index));
        return { displays: connectedDisplays, source: 'browser-api' };
      } catch (error) {
        connectedDisplays = createFallbackDisplays();
        return { displays: connectedDisplays, source: 'fallback' };
      }
    }

    connectedDisplays = createFallbackDisplays();
    return { displays: connectedDisplays, source: 'fallback' };
  }

  function renderMonitorOptions(displays = connectedDisplays) {
    document.querySelectorAll('[data-main-monitor], [data-teacher-monitor]').forEach((select) => {
      const selected = select.value;
      select.innerHTML = '';
      displays.forEach((display) => {
        const option = document.createElement('option');
        option.value = display.value;
        option.textContent = display.label;
        select.appendChild(option);
      });
      if ([...select.options].some((option) => option.value === selected)) {
        select.value = selected;
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

  function saveMonitorSettings(settings) {
    const mergedSettings = { ...loadTeacherSettings(), ...settings, detectedDisplays: connectedDisplays };
    persistTeacherSettings(mergedSettings);
    return mergedSettings;
  }

  async function moveViewToSelectedMonitor(viewType, displayId) {
    if (window.lfzq8aDesktop?.moveViewToMonitor) {
      return window.lfzq8aDesktop.moveViewToMonitor(viewType, displayId);
    }
    return { moved: false, reason: 'unsupported' };
  }

  function moveMainViewToMonitor(displayId) {
    return moveViewToSelectedMonitor('main', displayId);
  }

  function openTeacherInfoViewOnMonitor(displayId) {
    return moveViewToSelectedMonitor('teacher', displayId);
  }

  function showBrowserMonitorHighlight(label) {
    document.querySelector('[data-monitor-highlight-fallback]')?.remove();
    const frame = document.createElement('div');
    frame.className = 'monitor-highlight-fallback';
    frame.dataset.monitorHighlightFallback = 'true';
    frame.textContent = label;
    document.body.appendChild(frame);
    window.setTimeout(() => frame.remove(), 2600);
  }

  async function highlightSelectedMonitor(displayId, label) {
    if (window.lfzq8aDesktop?.highlightMonitor) {
      return window.lfzq8aDesktop.highlightMonitor(displayId, label);
    }
    showBrowserMonitorHighlight(`${label} - ${t('browserHighlightFallback')}`);
    return { highlighted: false, fallback: 'browser-frame' };
  }

  async function saveTeacherSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const settings = {
      teacherLanguage: form.elements.teacherLanguage.value,
      mainViewMonitor: form.elements.mainViewMonitor.value,
      teacherViewMonitor: form.elements.teacherViewMonitor.value,
      lastTestReportFilter: loadTeacherSettings().lastTestReportFilter
    };
    if (!validateMonitorSelection()) {
      document.querySelector('[data-teacher-wizard-status]').textContent = t('monitorWarning');
      return;
    }
    const saved = saveMonitorSettings(settings);
    applyTeacherLanguage(saved.teacherLanguage);
    await moveMainViewToMonitor(saved.mainViewMonitor);
    const teacherMoveResult = await openTeacherInfoViewOnMonitor(saved.teacherViewMonitor);
    const status = document.querySelector('[data-teacher-wizard-status]');
    if (status) {
      status.textContent = teacherMoveResult?.moved ? t('saved') : `${t('saved')} ${t('movePrepared')}`;
    }
    window.setTimeout(closeTeacherWizard, 650);
  }

  function renderTestReport(filter = 'all') {
    const summary = testReportData.summary;
    const passedDegrees = Math.round((summary.passed / summary.total) * 360);
    const warningDegrees = passedDegrees + Math.round((summary.warnings / summary.total) * 360);
    const percent = Math.round((summary.passed / summary.total) * 100);
    const tests = filter === 'all' ? testReportData.tests : testReportData.tests.filter((test) => test.status === filter);
    document.querySelector('[data-kpi-total]').textContent = `${summary.total}`;
    document.querySelector('[data-kpi-passed]').textContent = `${summary.passed}`;
    document.querySelector('[data-kpi-warnings]').textContent = `${summary.warnings}`;
    document.querySelector('[data-kpi-failed]').textContent = `${summary.failed}`;
    document.querySelector('[data-kpi-last-run]').textContent = testReportData.lastRun;
    document.querySelector('[data-report-percent]').textContent = `${percent}%`;
    document.querySelector('[data-report-progress]').style.width = `${percent}%`;
    document.querySelector('[data-report-donut]').style.setProperty('--passed-deg', `${passedDegrees}deg`);
    document.querySelector('[data-report-donut]').style.setProperty('--warning-deg', `${warningDegrees}deg`);
    const byArea = testReportData.tests.reduce((areas, test) => {
      areas[test.area] = (areas[test.area] || 0) + 1;
      return areas;
    }, {});
    const maxAreaCount = Math.max(...Object.values(byArea));
    const barChart = document.querySelector('[data-report-bars]');
    barChart.innerHTML = '';
    Object.entries(byArea).forEach(([area, count]) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `<span>${area}</span><div class="bar-track"><span style="width:${Math.round((count / maxAreaCount) * 100)}%"></span></div><strong>${count}</strong>`;
      barChart.appendChild(row);
    });
    document.querySelectorAll('[data-report-filters] button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.filter === filter);
    });
    const list = document.querySelector('[data-test-list]');
    list.innerHTML = '';
    tests.forEach((test) => {
      const item = document.createElement('article');
      item.className = `test-item ${test.status}`;
      const icon = test.status === 'passed' ? 'OK' : test.status === 'warning' ? '!' : 'X';
      const testName = translatedTestValue(test, 'name', test.name);
      const testDescription = translatedTestValue(test, 'description', test.description);
      item.innerHTML = `<span class="test-icon">${icon}</span><div><h3>${testName}</h3><p>${t('area')}: ${test.area}</p><p>${t('result')}: ${testDescription}</p></div><small>${t('duration')}: ${test.durationMs} ms</small>`;
      list.appendChild(item);
    });
  }

  async function initializeDisplays() {
    const result = await detectConnectedDisplays();
    renderMonitorOptions(result.displays);
    const settings = loadTeacherSettings();
    const environment = document.querySelector('[data-monitor-environment]');
    if (environment) {
      environment.hidden = result.source !== 'fallback';
    }
    populateWizard(settings);
    saveMonitorSettings({ ...settings, detectedDisplays: result.displays });
  }

  document.addEventListener('click', (event) => {
    const lockedLink = event.target.closest('[data-release-locked="true"]');
    if (lockedLink) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('click', async (event) => {
    if (event.target.closest('[data-open-teacher-wizard]')) {
      event.preventDefault();
      openTeacherWizard();
    }
    if (event.target.closest('[data-close-teacher-wizard]')) {
      event.preventDefault();
      closeTeacherWizard();
    }
    const highlightButton = event.target.closest('[data-highlight-monitor]');
    if (highlightButton) {
      event.preventDefault();
      const form = document.querySelector('[data-teacher-wizard-form]');
      const viewType = highlightButton.dataset.highlightMonitor;
      const displayId = viewType === 'main' ? form.elements.mainViewMonitor.value : form.elements.teacherViewMonitor.value;
      const label = viewType === 'main' ? 'Ausgewaehlter Monitor: Main View' : 'Ausgewaehlter Monitor: Dozenten View';
      const result = await highlightSelectedMonitor(displayId, label);
      const status = document.querySelector('[data-monitor-action-status]');
      if (status && result?.fallback) {
        status.textContent = t('browserHighlightFallback');
      }
    }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      event.preventDefault();
      const settings = saveMonitorSettings({ lastTestReportFilter: filterButton.dataset.filter });
      renderTestReport(settings.lastTestReportFilter);
    }
  });

  document.querySelector('[data-teacher-wizard-form]')?.addEventListener('submit', saveTeacherSettings);
  document.querySelectorAll('[data-main-monitor], [data-teacher-monitor]').forEach((select) => {
    select.addEventListener('change', validateMonitorSelection);
  });

  const initialSettings = loadTeacherSettings();
  applyTeacherLanguage(initialSettings.teacherLanguage);
  populateWizard(initialSettings);
  renderTestReport(initialSettings.lastTestReportFilter);
  initializeDisplays();
  applyCourseOverviewReleases();
  window.lfzq8aDesktop?.onParticipantReleasesChanged?.(applyCourseOverviewReleases);
  window.addEventListener('focus', applyCourseOverviewReleases);
  window.setInterval(applyCourseOverviewReleases, 5000);

  window.lfzq8aTeacherStartview = {
    detectConnectedDisplays,
    renderMonitorOptions,
    validateMonitorSelection,
    saveMonitorSettings,
    moveViewToSelectedMonitor,
    moveMainViewToMonitor,
    openTeacherInfoViewOnMonitor,
    highlightSelectedMonitor,
    openTeacherWizard,
    closeTeacherWizard,
    saveTeacherSettings,
    loadTeacherSettings,
    applyTeacherLanguage,
    applyCourseOverviewReleases
  };
})();
