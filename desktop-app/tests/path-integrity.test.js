const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const repoRoot = path.resolve(__dirname, '..', '..');
const participantRoot = path.join(repoRoot, 'teilnehmer');
const teacherRoot = path.join(repoRoot, 'dozent');
const ignoredDirs = new Set([
  '.git',
  '.agents',
  '.codex',
  '_archiv',
  'node_modules'
]);

const absolutePathPattern = new RegExp(`(?:^|[^A-Za-z0-9_])[A-Za-z]:[\\\\/][A-Za-z0-9_.-]|file:\\/\\/\\/|(?:href|src)=["']\\/(?!\\/)`, 'i');
const localReferencePattern = /\b(?:href|src)=["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi;
const externalReferencePattern = /^(?:#|data:|https?:|mailto:|tel:|javascript:|about:)/i;

function walkFiles(dir, predicate, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walkFiles(path.join(dir, entry.name), predicate, files);
      }
      return;
    }

    const filePath = path.join(dir, entry.name);
    if (predicate(filePath)) {
      files.push(filePath);
    }
  });
  return files;
}

function isTextFile(filePath) {
  return /\.(?:cmd|css|html|js|json|md|txt)$/i.test(filePath);
}

function isWebFile(filePath) {
  return /\.(?:css|html)$/i.test(filePath);
}

function stripHashAndQuery(reference) {
  return reference.split('#')[0].split('?')[0];
}

function resolveReference(fromFile, reference) {
  const cleanReference = decodeURI(stripHashAndQuery(reference.trim()));
  if (!cleanReference || cleanReference.includes('&') || externalReferencePattern.test(cleanReference)) {
    return null;
  }
  return path.resolve(path.dirname(fromFile), cleanReference);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function collectLocalReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const references = [];
  let match = localReferencePattern.exec(content);

  while (match) {
    const reference = match[1] || match[2];
    const resolved = resolveReference(filePath, reference);
    if (resolved) {
      references.push({ reference, resolved });
    }
    match = localReferencePattern.exec(content);
  }

  return references;
}

test('active project files do not contain absolute Windows or root-relative paths', () => {
  const files = walkFiles(repoRoot, isTextFile);
  const offenders = files.filter((filePath) => absolutePathPattern.test(fs.readFileSync(filePath, 'utf8')));

  assert.deepEqual(offenders.map((filePath) => path.relative(repoRoot, filePath)), []);
});

test('participant folder is standalone and does not link outside itself', () => {
  const files = walkFiles(participantRoot, isWebFile);
  const escapingReferences = [];
  const missingReferences = [];

  files.forEach((filePath) => {
    collectLocalReferences(filePath).forEach(({ reference, resolved }) => {
      if (!isInside(participantRoot, resolved)) {
        escapingReferences.push(`${path.relative(repoRoot, filePath)} -> ${reference}`);
        return;
      }
      if (!fs.existsSync(resolved)) {
        missingReferences.push(`${path.relative(repoRoot, filePath)} -> ${reference}`);
      }
    });
  });

  assert.deepEqual(escapingReferences, []);
  assert.deepEqual(missingReferences, []);
});

test('static root does not expose the teacher folder by link', () => {
  const rootIndex = path.join(repoRoot, 'index.html');
  const teacherLinks = collectLocalReferences(rootIndex)
    .filter(({ resolved }) => isInside(teacherRoot, resolved))
    .map(({ reference }) => reference);

  assert.deepEqual(teacherLinks, []);
});

test('electron desktop app starts the teacher overview with a portable project-relative path', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');

  assert.match(mainSource, /path\.join\(__dirname,\s*'renderer',\s*'course\.html'\)/);
  assert.match(mainSource, /path\.join\(projectRoot,\s*'dozent',\s*'index_dozent\.html'\)/);
  assert.doesNotMatch(mainSource, /(?:^|[^A-Za-z0-9_])[A-Za-z]:[\\/][A-Za-z0-9_.-]|file:\/\//);
});

test('electron desktop app integrates course html pages through the app shell catalog', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'preload.js'), 'utf8');
  const courseHtml = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.html'), 'utf8');
  const courseJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.js'), 'utf8');
  const courseGroupsJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course-content-groups.js'), 'utf8');
  const { flattenCatalog } = require('../app/lib/course-catalog');
  const missingCatalogTargets = flattenCatalog()
    .map((target) => path.join(repoRoot, target))
    .filter((targetPath) => !fs.existsSync(targetPath));

  assert.match(mainSource, /const \{ courseCatalog \} = require\('\.\/lib\/course-catalog'\)/);
  assert.match(mainSource, /function getHydratedCourseCatalog\(\)/);
  assert.match(mainSource, /ipcMain\.handle\('course:get-state'/);
  assert.match(mainSource, /function notifyParticipantReleasesChanged\(releases\)/);
  assert.match(mainSource, /webContents\.send\('participant-releases:changed', releases\)/);
  assert.match(mainSource, /notifyParticipantReleasesChanged\(saved\)/);
  assert.match(mainSource, /pathToFileURL\(resolvedPath\)\.href/);
  assert.match(preloadSource, /getCourseState: \(\) => ipcRenderer\.invoke\('course:get-state'\)/);
  assert.match(preloadSource, /openParticipantReleases: \(\) => ipcRenderer\.invoke\('teacher:open-releases'\)/);
  assert.match(preloadSource, /onParticipantReleasesChanged: \(callback\) =>/);
  assert.match(preloadSource, /ipcRenderer\.on\('participant-releases:changed', listener\)/);
  assert.match(courseHtml, /data-panel="dashboard"/);
  assert.doesNotMatch(courseHtml, /data-panel="days"/);
  assert.doesNotMatch(courseHtml, /data-panel="projects"/);
  assert.doesNotMatch(courseHtml, /data-panel="releases"/);
  assert.match(courseHtml, /<section class="viewer-shell"[\s\S]+data-viewer-shell hidden/);
  assert.match(courseHtml, /course-navigation\.js[\s\S]+course-content-groups\.js[\s\S]+course\.js/);
  assert.match(courseHtml, /course-content-groups\.js/);
  assert.match(courseJs, /window\.LFZQ8aCourseContent \|\| fallbackContentGroups/);
  assert.match(courseJs, /window\.LFZQ8aCourseNavigation \|\| fallbackCourseNavigation/);
  assert.match(courseJs, /window\.lfzq8aDesktop\.getCourseState\(\)/);
  assert.match(courseJs, /function getInitialView\(\)/);
  assert.match(courseJs, /new URLSearchParams\(window\.location\.search\)\.get\('view'\)/);
  assert.match(courseJs, /state\.activeView = getInitialView\(\)/);
  assert.match(courseJs, /loadContent\(title, kind, fileInfo\)/);
  assert.match(courseJs, /\[data-viewer-shell\]/);
  assert.match(courseJs, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/);
  assert.match(courseJs, /addHistory\(\{[\s\S]+type: 'course-content'[\s\S]+\.catch\(\(\) => \{\}\)/);
  assert.match(courseJs, /async function renderDashboard\(\)/);
  assert.match(courseJs, /const contentGroups = window\.LFZQ8aCourseContent/);
  assert.match(courseJs, /const courseNavigation = window\.LFZQ8aCourseNavigation/);
  assert.match(courseJs, /await renderParticipants\(panel\)/);
  assert.match(courseJs, /renderReleases\(panel\)/);
  assert.match(courseJs, /contentGroups\.getTeacherSupportItems\(state\.catalog\)/);
  assert.match(courseGroupsJs, /getTeacherTools\(catalog\)/);
  assert.match(courseGroupsJs, /getParticipantProjects\(catalog\)/);
  assert.match(courseJs, /window\.lfzq8aDesktop\.openInEditor\(project\.workspace\)/);
  assert.match(courseJs, /window\.lfzq8aDesktop\.saveParticipantReleases/);
  assert.match(courseJs, /async function handleParticipantReleasesChanged\(releases\)/);
  assert.match(courseJs, /onParticipantReleasesChanged\?\.\(handleParticipantReleasesChanged\)/);
  assert.deepEqual(missingCatalogTargets.map((targetPath) => path.relative(repoRoot, targetPath)), []);
});

test('course catalog is split into maintainable content modules', () => {
  const catalogRoot = path.join(repoRoot, 'desktop-app', 'app', 'lib', 'catalog');
  const courseCatalogFacade = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'lib', 'course-catalog.js'), 'utf8');
  const catalogIndex = fs.readFileSync(path.join(catalogRoot, 'index.js'), 'utf8');
  const expectedModules = [
    'participant-content.js',
    'teacher-days.js',
    'teacher-projects.js',
    'teacher-tools.js'
  ];
  const { courseCatalog } = require('../app/lib/course-catalog');

  expectedModules.forEach((fileName) => {
    assert.equal(fs.existsSync(path.join(catalogRoot, fileName)), true, fileName);
  });
  assert.match(courseCatalogFacade, /require\('\.\/catalog'\)/);
  assert.doesNotMatch(courseCatalogFacade, /title: 'Tag 1|title: 'Projekt Akkordeon|title: 'HTML\/CSS Tag-Tool/);
  assert.match(catalogIndex, /require\('\.\/teacher-days'\)/);
  assert.match(catalogIndex, /require\('\.\/teacher-projects'\)/);
  assert.match(catalogIndex, /require\('\.\/teacher-tools'\)/);
  assert.match(catalogIndex, /require\('\.\/participant-content'\)/);
  assert.equal(courseCatalog.teacher.days.length, 5);
  assert.equal(courseCatalog.teacher.projects.length, 2);
  assert.ok(courseCatalog.teacher.quickLinks.some((item) => item.kind === 'Tool'));
  assert.equal(courseCatalog.participant.projects.length, 2);
});

test('electron teacher view keeps only the compact dashboard visible', () => {
  const courseHtml = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.html'), 'utf8');
  const courseJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.js'), 'utf8');
  const navViews = [...courseHtml.matchAll(/<button\b[^>]*class="[^"]*\bnav-button\b[^"]*"[^>]*data-view="([^"]+)"/g)]
    .map((match) => match[1]);
  const panels = [...courseHtml.matchAll(/<section\b[^>]*data-panel="([^"]+)"/g)]
    .map((match) => match[1]);
  const expectedViews = ['dashboard'];

  assert.deepEqual(navViews, expectedViews);
  assert.deepEqual(panels, expectedViews);
  assert.match(courseHtml, /<nav class="main-nav"[^>]*hidden/);
  assert.match(courseHtml, /viewer-shell[\s\S]+hidden/);
  assert.doesNotMatch(courseHtml, /<a\b[^>]*class="[^"]*\bnav-button\b/i);
  assert.match(courseJs, /function showView\(view\)/);
  assert.match(courseJs, /courseNavigation\.showView/);
  assert.match(courseJs, /panels: document\.querySelectorAll\('\[data-panel\]'\)/);
  assert.match(courseJs, /buttons: document\.querySelectorAll\('\[data-view\]'\)/);
  assert.match(courseJs, /showView\(navButton\.dataset\.view\)/);

  expectedViews.forEach((view) => {
    assert.match(courseJs, new RegExp(`${view}: 'dashboardTitle'`));
  });
});

test('electron teacher view renders participant status releases and tools only', () => {
  const courseJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.js'), 'utf8');

  assert.match(courseJs, /async function renderDashboard\(\)/);
  assert.match(courseJs, /await renderParticipants\(panel\)/);
  assert.match(courseJs, /renderReleases\(panel\)/);
  assert.match(courseJs, /contentGroups\.getTeacherSupportItems\(state\.catalog\)\.forEach/);
  assert.doesNotMatch(courseJs, /appendSectionTitle\(panel, t\('courseDays'/);
  assert.doesNotMatch(courseJs, /appendSectionTitle\(panel, t\('projects'/);

  assert.match(courseJs, /function renderDays\(\)/);
  assert.match(courseJs, /function renderProjects\(\)/);
  assert.match(courseJs, /function renderTools\(targetPanel\)/);
  assert.match(courseJs, /async function renderParticipants\(targetPanel\)/);
  assert.match(courseJs, /function renderReleases\(targetPanel\)/);
  assert.match(courseJs, /const releaseSections = \[/);
  assert.doesNotMatch(courseJs, /Tag 1 insgesamt/);
  assert.doesNotMatch(courseJs, /Tag 5 insgesamt/);
  assert.match(courseJs, /createElement\('details', 'release-section'\)/);
  assert.match(courseJs, /createElement\('summary', 'release-section-summary'\)/);
  assert.match(courseJs, /section\.open = sectionIndex === 0/);
  assert.match(courseJs, /createElement\('table', 'release-table'\)/);
  assert.match(courseJs, /title: 'Fragenpools'/);
  assert.match(courseJs, /type: 'Tag 1', key: 'tag_01_quiz25', title: 'Tag 1 - Quiz 25'/);
  assert.match(courseJs, /type: 'Tag 5', key: 'tag_05_quiz50', title: 'Tag 5 - Quiz 50'/);
  assert.match(courseJs, /Allgemeine Uebungsaufgabe/);
  assert.match(courseJs, /Projektvorbereitung Wunderland/);
  assert.match(courseJs, /Projektvorbereitung Akkordeon/);
  assert.match(courseJs, /tag_01_task_html_css_tag_overview/);
  assert.match(courseJs, /tag_02_task_wunderland_hero_button/);
  assert.match(courseJs, /tag_01_task_wunderland_custom_properties/);
  assert.match(courseJs, /tag_04_task_akkordeon_responsive/);
  assert.match(courseJs, /title: 'Projekt Wunderland'/);
  assert.match(courseJs, /title: 'Projekt Akkordeon'/);
  assert.match(courseJs, /input\.dataset\.releaseKey = rowData\.key/);
  assert.match(courseJs, /async function renderAll\(\)\s*\{\s*await renderDashboard\(\);/);
  assert.match(courseJs, /renderParticipants\(byData\('\[data-panel="dashboard"\]'\)\)/);
});

test('electron and participant views expose configurable app languages', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');
  const appDataSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'lib', 'app-data.js'), 'utf8');
  const i18nSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'lib', 'i18n.js'), 'utf8');
  const wizardHtml = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'wizard.html'), 'utf8');
  const wizardJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'wizard.js'), 'utf8');
  const courseHtml = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.html'), 'utf8');
  const courseJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.js'), 'utf8');
  const participantIndex = fs.readFileSync(path.join(participantRoot, 'index_teilnehmer.html'), 'utf8');
  const participantClient = fs.readFileSync(path.join(participantRoot, 'assets', 'js', 'classroom-client.js'), 'utf8');

  assert.match(i18nSource, /supportedLanguages/);
  assert.match(i18nSource, /code: 'en'/);
  assert.match(i18nSource, /code: 'tr'/);
  assert.match(i18nSource, /code: 'uk'/);
  assert.match(i18nSource, /code: 'ru'/);
  assert.match(appDataSource, /teacherLanguage: 'de'/);
  assert.match(appDataSource, /participantLanguage: 'de'/);
  assert.match(appDataSource, /teacherProfile/);
  assert.match(appDataSource, /LFZQ8A_PARTICIPANT_LANGUAGE/);
  assert.match(mainSource, /getTranslations\(getAppData\(\)\.getSettings\(\)\.teacherLanguage\)/);
  assert.match(mainSource, /supportedLanguages/);
  assert.match(wizardHtml, /id="teacherLanguage"/);
  assert.match(wizardHtml, /id="participantLanguage"/);
  assert.match(wizardJs, /renderLanguageSelects/);
  assert.match(wizardJs, /data-i18n/);
  assert.match(courseHtml, /data-i18n="coursePlatform"/);
  assert.match(courseHtml, /data-open-settings/);
  assert.match(courseHtml, /data-setting-teacher-language/);
  assert.match(courseHtml, /data-setting-participant-language/);
  assert.match(courseJs, /applyTranslations/);
  assert.match(courseJs, /saveSettingsFromDialog/);
  assert.match(courseJs, /window\.lfzq8aDesktop\.saveSetup/);
  assert.match(participantIndex, /data-i18n="participantArea"/);
  assert.match(participantIndex, /data-open-profile/);
  assert.match(participantClient, /LFZQ8A_PARTICIPANT_LANGUAGE/);
  assert.match(participantClient, /profileTitle/);
  assert.match(participantClient, /showProfileWizard\(\)\.then/);
});

test('teacher profile settings include monitor options and automatic test reports', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'preload.js'), 'utf8');
  const courseHtml = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.html'), 'utf8');
  const courseJs = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'renderer', 'course.js'), 'utf8');

  assert.match(mainSource, /let startupTestReportCreated = false/);
  assert.match(mainSource, /function createStartupTestReport\(\)/);
  assert.match(mainSource, /createStartupTestReport\(\);\s*createWorkshopWindow\(\);/);
  assert.match(mainSource, /testReports: getAppData\(\)\.listTestReports\(\)/);
  assert.match(mainSource, /displays: getDisplaySummaries\(\)/);
  assert.match(mainSource, /let releaseWindow = null/);
  assert.match(mainSource, /function openParticipantReleaseWindow\(\)/);
  assert.match(mainSource, /getReleaseViewUrl\(\)/);
  assert.match(mainSource, /\?view=releases/);
  assert.match(mainSource, /settings\.openTeacherOnSecondMonitor === false/);
  assert.match(mainSource, /ipcMain\.handle\('teacher:open-releases'/);
  assert.match(mainSource, /createWorkshopWindow\(\);\s*openParticipantReleaseWindow\(\);/);
  assert.match(mainSource, /createTeacherStartviewWindow\(\);\s*openParticipantReleaseWindow\(\);/);
  assert.match(preloadSource, /createTestReport: \(\) => ipcRenderer\.invoke\('test-report:create'\)/);
  assert.match(preloadSource, /openTestReportDir: \(\) => ipcRenderer\.invoke\('test-report:open-dir'\)/);
  assert.match(courseHtml, /data-setting-monitor/);
  assert.match(courseHtml, /data-setting-network/);
  assert.match(courseHtml, /data-settings-reports/);
  assert.match(courseHtml, /data-create-report/);
  assert.match(courseHtml, /data-open-report-dir/);
  assert.match(courseJs, /renderReportList/);
  assert.match(courseJs, /createReportFromSettings/);
  assert.match(courseJs, /window\.lfzq8aDesktop\.createTestReport\(\)/);
  assert.match(courseJs, /window\.lfzq8aDesktop\.listTestReports\(\)/);
});

test('electron desktop app closes all secondary windows when the app closes', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');

  assert.match(mainSource, /function closeAllApplicationWindows\(exceptWindow = null\)/);
  assert.match(mainSource, /BrowserWindow\.getAllWindows\(\)\.forEach/);
  assert.match(mainSource, /function registerMainWindow\(window\)/);
  assert.match(mainSource, /mainWindow\.on\('closed'/);
  assert.match(mainSource, /closeAllApplicationWindows\(window\)/);
  assert.match(mainSource, /app\.on\('before-quit'/);
  assert.match(mainSource, /isReplacingMainWindow/);
});

test('electron desktop app opens project files in VS Code through a guarded bridge', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'preload.js'), 'utf8');
  const vsCodeSettings = fs.readFileSync(path.join(repoRoot, '.vscode', 'settings.json'), 'utf8');
  const taskOverview = fs.readFileSync(
    path.join(teacherRoot, 'Projektmaterialien', 'aufgaben', 'akkordeon', 'aufgabenpakete.html'),
    'utf8'
  );

  assert.match(mainSource, /function resolveEditorTarget\(target\)/);
  assert.match(mainSource, /function getVsCodeLaunchers\(\)/);
  assert.match(mainSource, /function spawnDetached\(command, args/);
  assert.match(mainSource, /function openFileInVsCode\(target\)/);
  assert.match(mainSource, /Code\.exe/);
  assert.match(mainSource, /code\.cmd/);
  assert.match(mainSource, /\['-n', projectRoot, '-g', filePath\]/);
  assert.match(mainSource, /fs\.statSync\(filePath\)\.isDirectory\(\)/);
  assert.match(mainSource, /\['-n', filePath\]/);
  assert.match(mainSource, /vscode:\/\/file\//);
  assert.match(mainSource, /ipcMain\.handle\('editor:open'/);
  assert.match(mainSource, /isInsideProject\(resolvedPath\)/);
  assert.match(preloadSource, /openInEditor: \(target\) => ipcRenderer\.invoke\('editor:open', target\)/);
  assert.match(preloadSource, /data-open-editor/);
  assert.match(preloadSource, /VS Code konnte nicht gestartet werden/);
  assert.match(vsCodeSettings, /"files\.autoSave": "afterDelay"/);
  assert.match(vsCodeSettings, /"files\.hotExit": "onExitAndWindowClose"/);
  assert.match(taskOverview, /data-open-editor="Ausgangssituation"/);
  assert.doesNotMatch(taskOverview, /data-open-editor="[^"]+\.(html|css|js)"/);
  assert.match(taskOverview, /function toVsCodeFileUrl\(fileUrl\)/);
  assert.match(taskOverview, /window\.lfzq8aDesktop\.openInEditor\(targetUrl\)/);
  assert.match(taskOverview, /vscode:\/\/file\//);
});

test('teacher workplace opens all dashboard links through the desktop window bridge', () => {
  const teacherIndex = path.join(teacherRoot, 'index_dozent.html');
  const content = fs.readFileSync(teacherIndex, 'utf8');
  const anchors = [...content.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  const dashboardLinksWithoutBridge = anchors
    .filter((match) => !externalReferencePattern.test(match[1]))
    .filter((match) => !/\bteacher-open\b/.test(match[0]))
    .map((match) => match[1]);

  assert.match(content, /href="tools\/html-css-tag-tool-dozent\.html"/);
  assert.match(content, /href="tag_01\/LFZQ8a_tag_01_Webvariante_Dozent\.html"/);
  assert.deepEqual(dashboardLinksWithoutBridge, []);
});

test('teacher main view shows dashboard cards while legacy navigation is preserved', () => {
  const teacherIndex = path.join(teacherRoot, 'index_dozent.html');
  const backupIndex = path.join(teacherRoot, 'index_dozent_backup_vor_neustruktur.html');
  const content = fs.readFileSync(teacherIndex, 'utf8');
  const backupContent = fs.readFileSync(backupIndex, 'utf8');

  assert.equal(fs.existsSync(backupIndex), true);
  assert.match(content, /<!-- Neue Kursuebersicht: Start -->/);
  assert.match(content, /class="start-shell"/);
  assert.match(content, /class="topbar"/);
  assert.match(content, /class="profile-menu"/);
  assert.match(content, /<strong[^>]*data-profile-name[^>]*>Dozent<\/strong>/);
  assert.match(content, /<small[^>]*data-profile-subtitle[^>]*>Aktueller Kurs<\/small>/);
  assert.match(content, /class="teacher-dashboard"/);
  assert.match(content, /LFZQ8a Kursuebersicht/);
  assert.match(content, /Tag 1 - CSS-Grundlagen/);
  assert.match(content, /Tag 5 - Projektabschluss/);
  assert.match(content, /Projekt Akkordeon/);
  assert.match(content, /Projekt Wunderland/);
  assert.match(content, /data-release-key="tag_01"/);
  assert.match(content, /data-release-link data-release-key="tag_01_web"/);
  assert.match(content, /class="release-topic is-release-locked" data-release-link data-release-key="tag_01_task_html_css_tag_overview"/);
  assert.match(content, /class="release-topic is-release-locked" data-release-link data-release-key="tag_01_task_wunderland_custom_properties"/);
  assert.match(content, /class="release-topic is-release-locked" data-release-link data-release-key="tag_02_task_wunderland_hero_button"/);
  assert.match(content, /class="release-topic is-release-locked" data-release-link data-release-key="tag_05_task_akkordeon_barrierearm"/);
  assert.match(content, /data-release-section data-release-section-key="question-pools"/);
  assert.match(content, /Fragenpools/);
  assert.match(content, /QuizTool_Timer_v9_LFZQ8a_CSS_Pools\.html\?pool=Tag_01_CSS_Grundlagen_25_Fragen_35_Minuten\.json/);
  assert.match(content, /QuizTool_Timer_v9_LFZQ8a_CSS_Pools\.html\?pool=Tag_05_Webfonts_Projekt_Refactoring_50_Fragen_70_Minuten\.json/);
  assert.match(content, /data-release-link data-release-key="tag_03_tasks"/);
  assert.match(content, /data-release-link data-release-key="tag_05_quiz50"/);
  assert.match(content, /data-release-link data-release-key="project_accordion_workspace"/);
  assert.match(content, /data-release-link data-release-key="project_wunderland_result"/);
  assert.match(content, /class="course-card accent-blue is-locked" data-release-card data-release-key="tag_02"/);
  assert.match(content, /class="course-card accent-purple is-locked" data-release-card data-release-key="tag_05"/);
  assert.match(content, /class="course-card accent-green project-card is-locked" data-release-card data-release-key="project_materials"/);
  assert.match(content, /Bestehende Materialien bleiben erhalten\./);
  assert.match(content, /<!-- Legacy Navigation: bleibt erhalten, wird spaeter schrittweise neu aufgebaut -->/);
  assert.match(content, /class="legacy-navigation" hidden/);
  assert.match(content, /href="tag_01\/LFZQ8a_tag_01_Webvariante_Dozent\.html"/);
  assert.match(content, /href="tools\/html-css-tag-tool-dozent\.html"/);
  assert.match(backupContent, /Dozentenarbeitsplatz - LFZQ8a HTML &amp; CSS/);
  assert.match(backupContent, /href="tag_05\/LFZQ8a_tag_05_Webvariante_Dozent\.html"/);
});

test('teacher and participant start views keep the shared shell and preserved legacy content', () => {
  const teacherContent = fs.readFileSync(path.join(teacherRoot, 'index_dozent.html'), 'utf8');
  const participantBackup = path.join(participantRoot, 'index_teilnehmer_backup_vor_neustruktur.html');
  const participantContent = fs.readFileSync(path.join(participantRoot, 'index_teilnehmer.html'), 'utf8');
  const participantBackupContent = fs.readFileSync(participantBackup, 'utf8');

  assert.equal(fs.existsSync(participantBackup), true);
  [
    /class="start-shell"/,
    /class="topbar"/,
    /class="brand"/,
    /class="profile-menu"/,
    /class="profile-avatar"/,
    /class="status-pill"/,
    /Bestehende Materialien bleiben erhalten\./,
    /<!-- Legacy Navigation: bleibt erhalten, wird spaeter schrittweise neu aufgebaut -->/,
    /class="legacy-navigation" hidden/
  ].forEach((pattern) => {
    assert.match(teacherContent, pattern);
    assert.match(participantContent, pattern);
  });
  assert.match(teacherContent, /class="teacher-dashboard"/);
  assert.match(teacherContent, /data-teacher-wizard hidden/);
  assert.match(participantContent, /Teilnehmerbereich wird schrittweise neu aufgebaut\./);
  assert.match(participantContent, /class="welcome-card"/);
  assert.match(participantContent, /class="note"/);
  assert.match(participantContent, /data-open-profile/);
  assert.match(participantContent, /href="tag_01\/LFZQ8a_tag_01_Webvariante_Teilnehmer\.html"/);
  assert.match(participantContent, /data-release-key="tag_01_web"/);
  assert.match(participantContent, /data-release-key="tag_05_quiz50"/);
  assert.match(participantContent, /href="Projektmaterialien\/index\.html"/);
  assert.match(participantBackupContent, /Teilnehmerbereich - LFZQ8a HTML &amp; CSS/);
});

test('start view profile settings are stored locally for teacher and participant', () => {
  const teacherProfileScriptPath = path.join(teacherRoot, 'shared', 'startview-profile.js');
  const participantProfileScriptPath = path.join(participantRoot, 'shared', 'startview-profile.js');
  const profileScript = fs.readFileSync(participantProfileScriptPath, 'utf8');
  const teacherContent = fs.readFileSync(path.join(teacherRoot, 'index_dozent.html'), 'utf8');
  const participantContent = fs.readFileSync(path.join(participantRoot, 'index_teilnehmer.html'), 'utf8');

  assert.equal(fs.existsSync(teacherProfileScriptPath), true);
  assert.equal(fs.existsSync(participantProfileScriptPath), true);
  [
    /data-profile-root/,
    /data-profile-storage=/,
    /data-profile-toggle/,
    /data-profile-settings/,
    /name="displayName"/,
    /name="avatar"/,
    /src="shared\/startview-profile\.js"/
  ].forEach((pattern) => {
    assert.match(teacherContent, pattern);
    assert.match(participantContent, pattern);
  });

  assert.match(teacherContent, /lfzq8a-teacher-start-profile/);
  assert.match(participantContent, /lfzq8a-participant-start-profile/);
  assert.match(teacherContent, /<small[^>]*data-profile-subtitle[^>]*>Aktueller Kurs<\/small>/);
  assert.match(participantContent, /<small[^>]*data-profile-subtitle[^>]*>Aktueller Kurs<\/small>/);
  assert.doesNotMatch(teacherContent, /data-profile-close/);
  assert.doesNotMatch(participantContent, /data-profile-close/);
  assert.doesNotMatch(teacherContent, /name="subtitle"/);
  assert.doesNotMatch(participantContent, /name="subtitle"/);
  assert.doesNotMatch(teacherContent, /<label>Sprache<select name="language"/);
  assert.match(participantContent, /name="language"/);
  assert.match(profileScript, /localStorage/);
  assert.match(profileScript, /FileReader/);
  assert.match(profileScript, /profileStorage/);
  assert.match(profileScript, /aria-expanded/);
  assert.match(profileScript, /document\.documentElement\.lang/);
  assert.match(profileScript, /subtitle: defaults\.subtitle/);
  assert.doesNotMatch(profileScript, /form\.elements\.subtitle/);
});

test('teacher start profile opens wizard settings in the main view', () => {
  const teacherProfileScriptPath = path.join(teacherRoot, 'shared', 'startview-profile.js');
  const teacherProfileScript = fs.readFileSync(teacherProfileScriptPath, 'utf8');
  const teacherStartviewScriptPath = path.join(teacherRoot, 'shared', 'teacher-wizard-monitor.js');
  const teacherStartviewStylePath = path.join(teacherRoot, 'shared', 'teacher-startview.css');
  const teacherStartviewScript = fs.readFileSync(teacherStartviewScriptPath, 'utf8');
  const teacherStartviewStyle = fs.readFileSync(teacherStartviewStylePath, 'utf8');
  const teacherContent = fs.readFileSync(path.join(teacherRoot, 'index_dozent.html'), 'utf8');
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'preload.js'), 'utf8');

  assert.equal(fs.existsSync(teacherStartviewScriptPath), true);
  assert.equal(fs.existsSync(teacherStartviewStylePath), true);
  [
    /data-profile-role="teacher"/,
    /data-wizard-storage="lfzq8a-teacher-wizard-settings"/,
    /data-open-teacher-wizard/,
    /Dozenten Wizard Settings/,
    /data-dashboard-view/,
    /data-teacher-wizard hidden/,
    /data-teacher-wizard-form/,
    /name="teacherLanguage"/,
    /value="tr">Turkce/,
    /value="ru">Русский/,
    /name="mainViewMonitor"/,
    /name="teacherViewMonitor"/,
    /data-i18n-key="dashboardKicker"/,
    /data-i18n-key="day1Title"/,
    /data-i18n-key="projectsTitle"/,
    /data-i18n-key="testReportTitle"/,
    /data-highlight-monitor="main"/,
    /data-highlight-monitor="teacher"/,
    /data-monitor-warning/,
    /data-monitor-environment/,
    /data-kpi-total/,
    /data-report-donut/,
    /data-report-bars/,
    /data-filter="all"/,
    /data-filter="passed"/,
    /data-filter="warning"/,
    /data-filter="failed"/,
    /shared\/teacher-startview\.css/,
    /shared\/teacher-wizard-monitor\.js/
  ].forEach((pattern) => assert.match(teacherContent, pattern));

  assert.doesNotMatch(teacherContent, /name="participantLanguage"/);
  assert.doesNotMatch(teacherContent, /Teilnehmer-Ansicht/);
  assert.doesNotMatch(teacherContent, /Participant Language/);
  assert.doesNotMatch(teacherContent, /data-wizard-settings-toggle/);
  assert.match(teacherProfileScript, /localStorage/);
  assert.match(teacherStartviewScript, /function openTeacherWizard\(\)/);
  assert.match(teacherStartviewScript, /function closeTeacherWizard\(\)/);
  assert.match(teacherStartviewScript, /function saveTeacherSettings\(event\)/);
  assert.match(teacherStartviewScript, /window\.setTimeout\(closeTeacherWizard,\s*650\)/);
  assert.match(teacherStartviewScript, /function loadTeacherSettings\(\)/);
  assert.match(teacherStartviewScript, /function applyTeacherLanguage\(language\)/);
  assert.match(teacherStartviewScript, /const fallbackReleases/);
  assert.match(teacherStartviewScript, /tag_01: false/);
  assert.match(teacherStartviewScript, /tag_01_web: false/);
  assert.match(teacherStartviewScript, /tag_05_quiz50: false/);
  assert.match(teacherStartviewScript, /project_materials: false/);
  assert.match(teacherStartviewScript, /project_accordion_workspace: false/);
  assert.match(teacherStartviewScript, /const individualAssignmentReleaseKeys = \[/);
  assert.match(teacherStartviewScript, /tag_02_task_wunderland_header_logo_navigation/);
  assert.match(teacherStartviewScript, /tag_05_task_akkordeon_barrierearm/);
  assert.match(teacherStartviewScript, /function loadCourseOverviewReleases\(\)/);
  assert.match(teacherStartviewScript, /window\.lfzq8aDesktop\?\.getParticipantReleases/);
  assert.match(teacherStartviewScript, /function setReleaseLinkState\(link, isReleased\)/);
  assert.match(teacherStartviewScript, /const releaseButtonLabels = \{/);
  assert.match(teacherStartviewScript, /function getReleaseButtonLabel\(releaseKey\)/);
  assert.match(teacherStartviewScript, /Tag \$\{dayNumber\} - \$\{labelByType\[dayMatch\[2\]\]\}/);
  assert.match(teacherStartviewScript, /Aufgabenuebersicht/);
  assert.match(teacherStartviewScript, /Akkordeon - Arbeitsordner/);
  assert.match(teacherStartviewScript, /link\.hidden = !isReleased/);
  assert.match(teacherStartviewScript, /card\.hidden = !cardVisible/);
  assert.match(teacherStartviewScript, /const hasReleasedLink = \[\.\.\.card\.querySelectorAll\('\[data-release-link\]'\)\]/);
  assert.match(teacherStartviewScript, /const isLegacyDayRelease = \/\^tag_\\d\{2\}\$\//);
  assert.match(teacherStartviewScript, /const cardVisible = hasReleasedLink \|\| \(isReleased && !isLegacyDayRelease\)/);
  assert.match(teacherStartviewScript, /function updateReleaseSections\(\)/);
  assert.match(teacherStartviewScript, /document\.querySelectorAll\('\[data-release-section\]'\)/);
  assert.match(teacherStartviewScript, /function applyCourseOverviewReleases\(\)/);
  assert.match(teacherStartviewScript, /updateReleaseSections\(\)/);
  assert.match(teacherStartviewScript, /onParticipantReleasesChanged\?\.\(applyCourseOverviewReleases\)/);
  assert.match(teacherStartviewScript, /querySelectorAll\('\[data-release-card\]'\)/);
  assert.match(teacherStartviewScript, /card\.querySelectorAll\('\[data-release-link\]'\)\.forEach/);
  assert.match(teacherStartviewScript, /link\.dataset\.releaseKey/);
  assert.match(teacherStartviewScript, /data-release-locked="true"/);
  assert.match(teacherStartviewScript, /stopImmediatePropagation\(\)/);
  assert.match(teacherStartviewScript, /function translatedTestValue\(test,\s*suffix,\s*fallback\)/);
  assert.match(teacherStartviewScript, /renderTestReport\(loadTeacherSettings\(\)\.lastTestReportFilter\)/);
  assert.match(teacherStartviewScript, /function validateMonitorSelection\(\)/);
  assert.match(teacherStartviewScript, /function detectConnectedDisplays\(\)/);
  assert.match(teacherStartviewScript, /function renderMonitorOptions/);
  assert.match(teacherStartviewScript, /function saveMonitorSettings/);
  assert.match(teacherStartviewScript, /function moveViewToSelectedMonitor/);
  assert.match(teacherStartviewScript, /function moveMainViewToMonitor/);
  assert.match(teacherStartviewScript, /function openTeacherInfoViewOnMonitor/);
  assert.match(teacherStartviewScript, /function highlightSelectedMonitor/);
  assert.match(teacherStartviewScript, /const storageKey = 'lfzq8a_teacher_settings'/);
  assert.match(teacherStartviewScript, /const testReportData/);
  assert.match(teacherStartviewScript, /tr:\s*\{/);
  assert.match(teacherStartviewScript, /ru:\s*\{/);
  assert.match(teacherStartviewScript, /Egitmen Wizard Ayarlari/);
  assert.match(teacherStartviewScript, /Настройки мастера преподавателя/);
  assert.match(teacherStartviewScript, /nav-main-load_name/);
  assert.match(teacherStartviewScript, /TODO: Spaeter durch echte Testdatenquelle ersetzen/);
  assert.match(teacherStartviewScript, /localStorage/);
  assert.match(teacherStartviewScript, /getCourseState/);
  assert.match(teacherStartviewScript, /getScreenDetails/);
  assert.match(teacherStartviewScript, /monitor-highlight-fallback/);
  assert.match(teacherStartviewStyle, /\[hidden\]\s*\{[\s\S]+display: none !important/);
  assert.match(teacherStartviewStyle, /\.button-grid a,[\s\S]+\.button-grid \.release-topic/);
  assert.match(teacherStartviewStyle, /\.button-grid \.release-topic\.is-release-locked/);
  assert.match(teacherStartviewStyle, /\.day-grid,[\s\S]+\.project-grid,[\s\S]+\.question-pool-grid\s*\{[\s\S]+grid-template-columns: 1fr/);
  assert.match(teacherStartviewStyle, /\.quiz-pool-card\s*\{/);
  assert.match(preloadSource, /moveViewToMonitor/);
  assert.match(preloadSource, /highlightMonitor/);
  assert.match(mainSource, /display:move-view/);
  assert.match(mainSource, /display:highlight/);
  assert.match(mainSource, /createMonitorHighlightWindow/);
  assert.match(mainSource, /forceTeacherStartview/);
  assert.match(mainSource, /createTeacherStartviewWindow/);
  assert.match(mainSource, /mainWindow\.loadFile\(teacherOverviewFile\)/);
});

test('teacher tag tool links back to the teacher overview', () => {
  const tagTool = path.join(teacherRoot, 'tools', 'html-css-tag-tool-dozent.html');
  const content = fs.readFileSync(tagTool, 'utf8');

  assert.match(content, /href="\.\.\/index_dozent\.html"/);
  assert.match(content, /Zurück zur Dozentenübersicht/);
});

test('teacher tag tool opens teacher info automatically when a tag card is opened', () => {
  const tagTool = path.join(teacherRoot, 'tools', 'html-css-tag-tool-dozent.html');
  const content = fs.readFileSync(tagTool, 'utf8');

  assert.match(content, /function openTeacherInfoForCard\(card\)/);
  assert.match(content, /summary\.addEventListener\('click'/);
  assert.match(content, /if \(!card\.open\)/);
  assert.match(content, /openTeacherInfoForCard\(card\)/);
});

test('quiz tool can preload released question pools from the course overview', () => {
  const quizTool = path.join(teacherRoot, 'tools', 'quiz', 'QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html');
  const content = fs.readFileSync(quizTool, 'utf8');

  assert.match(content, /function loadJsonPoolFromParameter\(\)/);
  assert.match(content, /new URLSearchParams\(window\.location\.search\)\.get\('pool'\)/);
  assert.match(content, /fetch\(safeFileName, \{ cache: 'no-store' \}\)/);
  assert.match(content, /normalizePool\(data, safeFileName\)/);
  assert.match(content, /useBuiltInFallback/);
  assert.match(content, /String\(pool\.id \|\| ''\)\.includes\(`tag_\$\{tagMatch\[1\]\}_\$\{tagMatch\[2\]\}`\)/);
  assert.match(content, /loadJsonPoolFromParameter\(\)/);
  assert.match(content, /background: #eef6fa/);
  assert.match(content, /border-top: 6px solid var\(--cyan\)/);
});

test('teacher tag tool provides five css variants with richer demo content', () => {
  const tagTools = [
    path.join(teacherRoot, 'tools', 'html-css-tag-tool-dozent.html'),
    path.join(participantRoot, 'tools', 'html-css-tag-tool-teilnehmer.html')
  ];

  tagTools.forEach((tagTool) => {
    const content = fs.readFileSync(tagTool, 'utf8');
    const cardCount = (content.match(/<details class="tag-card"/g) || []).length;

    assert.ok(cardCount > 0);
    [1, 2, 3, 4, 5].forEach((variant) => {
      assert.equal((content.match(new RegExp(`class="variant-input v${variant}"`, 'g')) || []).length, cardCount);
      assert.equal((content.match(new RegExp(`class="tab-${variant}"`, 'g')) || []).length, cardCount);
      assert.equal((content.match(new RegExp(`class="code code-${variant}"`, 'g')) || []).length, cardCount);
    });
    assert.equal((content.match(/class="demo-context"/g) || []).length, cardCount);
    assert.match(content, /grid-template-columns/);
    assert.match(content, /box-shadow/);
    assert.match(content, /linear-gradient/);
  });
});

test('opened tag cards use full grid width in teacher and participant tools', () => {
  const tagTools = [
    path.join(teacherRoot, 'tools', 'html-css-tag-tool-dozent.html'),
    path.join(participantRoot, 'tools', 'html-css-tag-tool-teilnehmer.html')
  ];

  tagTools.forEach((tagTool) => {
    const content = fs.readFileSync(tagTool, 'utf8');

    assert.match(content, /\.tag-card\[open\]\{grid-column:1\/-1\}/);
    assert.doesNotMatch(content, /\.tag-card\[open\]\{grid-column:span [12]\}/);
  });
});

test('additional assignments are integrated by role and day', () => {
  const participantIndex = fs.readFileSync(path.join(participantRoot, 'index_teilnehmer.html'), 'utf8');
  const teacherIndex = fs.readFileSync(path.join(teacherRoot, 'index_dozent.html'), 'utf8');
  const participantAdditionalIndex = path.join(participantRoot, 'zusatzaufgaben', 'index.html');
  const teacherAdditionalIndex = path.join(teacherRoot, 'zusatzaufgaben', 'index.html');
  const expectedDays = [
    'tag_01_html_css_basis',
    'tag_02_navigation_flexbox',
    'tag_03_grid_layout_daten',
    'tag_04_responsive_medien',
    'tag_05_formulare_webfonts_projekt'
  ];

  assert.match(participantIndex, /href="zusatzaufgaben\/index\.html"/);
  assert.match(teacherIndex, /href="zusatzaufgaben\/index\.html"/);
  assert.equal(fs.existsSync(participantAdditionalIndex), true);
  assert.equal(fs.existsSync(teacherAdditionalIndex), true);

  expectedDays.forEach((day) => {
    assert.equal(fs.existsSync(path.join(participantRoot, 'zusatzaufgaben', day, 'aufgaben')), true);
    assert.equal(fs.existsSync(path.join(participantRoot, 'zusatzaufgaben', day, 'loesungen')), false);
    assert.equal(fs.existsSync(path.join(teacherRoot, 'zusatzaufgaben', day, 'aufgaben')), true);
    assert.equal(fs.existsSync(path.join(teacherRoot, 'zusatzaufgaben', day, 'loesungen')), true);
  });

  const participantSolutionFiles = walkFiles(path.join(participantRoot, 'zusatzaufgaben'), () => true)
    .filter((filePath) => /l(ö|oe|o)sung/i.test(path.basename(filePath)));

  assert.deepEqual(participantSolutionFiles.map((filePath) => path.relative(participantRoot, filePath)), []);
});

test('project materials are grouped by role, project, and difficulty', () => {
  const participantIndex = fs.readFileSync(path.join(participantRoot, 'index_teilnehmer.html'), 'utf8');
  const teacherIndex = fs.readFileSync(path.join(teacherRoot, 'index_dozent.html'), 'utf8');
  const expectedProjects = [
    '01_ausgangssituation_responsive',
    '02_wunderland',
    '03_akkordeon'
  ];

  assert.match(participantIndex, /href="Projektmaterialien\/index\.html"/);
  assert.match(participantIndex, /href="Projektmaterialien\/abgabe\/Abgabe_Checkliste\.html"/);
  assert.match(teacherIndex, /href="Projektmaterialien\/index\.html"/);
  assert.match(teacherIndex, /class="card teacher-open" href="Projektmaterialien\/index\.html"/);
  const teacherProjectMaterialRoot = path.join(teacherRoot, 'Projektmaterialien');
  [
    { label: 'Ausgangssituation', href: 'loesungen/Ausgangssituation/index.html', root: 'loesungen', files: ['Ausgangssituation/index.html'] },
    { label: 'wunderland', href: 'loesungen/wunderland/index.html', root: 'loesungen', files: ['wunderland/index.html', 'wunderland/css/style.css', 'wunderland/js/menu.js', 'wunderland/lightbox/dist/js/lightbox-plus-jquery.min.js'] },
    { label: 'akkordeon', href: 'loesungen/akkordeon/index.html', root: 'loesungen', files: ['akkordeon/index.html', 'akkordeon/css/style.css'] }
  ].forEach((projectPackage) => {
    assert.match(
      fs.readFileSync(path.join(teacherRoot, 'Projektmaterialien', 'index.html'), 'utf8'),
      new RegExp(`href="${projectPackage.href}"`)
    );
    projectPackage.files.forEach((filePath) => {
      assert.equal(
        fs.existsSync(path.join(teacherProjectMaterialRoot, projectPackage.root, filePath)),
        true,
        `${projectPackage.label} ${filePath}`
      );
    });
  });
  [
    { project: 'akkordeon', workspaceFiles: ['index.html', 'arbeitsdatei.html', 'arbeitsdatei.css'] },
    { project: 'wunderland', workspaceFiles: ['index.html', 'arbeitsdatei.html', 'arbeitsdatei.css', 'arbeitsdatei.js'] }
  ].forEach(({ project, workspaceFiles }) => {
    const assignmentRoot = path.join(teacherProjectMaterialRoot, 'aufgaben', project);
    const workspaceRoot = path.join(assignmentRoot, 'Ausgangssituation');
    const overview = fs.readFileSync(path.join(assignmentRoot, 'aufgabenpakete.html'), 'utf8');

    assert.match(
      fs.readFileSync(path.join(teacherRoot, 'Projektmaterialien', 'index.html'), 'utf8'),
      new RegExp(`href="aufgaben/${project}/aufgabenpakete\\.html"`)
    );
    assert.equal(fs.existsSync(path.join(assignmentRoot, 'aufgabenpakete.html')), true, `${project} aufgabenpakete`);
    assert.match(overview, /href="Ausgangssituation\/index\.html"/);
    assert.match(overview, /data-open-editor="Ausgangssituation"/);
    assert.doesNotMatch(overview, /data-open-editor="[^"]+\.(html|css|js)"/);
    assert.doesNotMatch(overview, /Arbeits-CSS in VS Code oeffnen/);
    assert.doesNotMatch(overview, /Arbeits-CSS oeffnen/);
    assert.match(overview, /data-download-starters/);
    assert.match(overview, /Original-Loesung als Ziel ansehen/);
    assert.match(overview, /function toVsCodeFileUrl\(fileUrl\)/);
    workspaceFiles.forEach((fileName) => {
      assert.equal(fs.existsSync(path.join(workspaceRoot, fileName)), true, `${project} Ausgangssituation ${fileName}`);
    });
    ['loesung.html', 'loesung.css', 'loesung.js', 'arbeitsdatei.html', 'arbeitsdatei.css', 'arbeitsdatei.js'].forEach((fileName) => {
      assert.equal(fs.existsSync(path.join(assignmentRoot, fileName)), false, `${project} task ${fileName} must not exist`);
    });
    if (project === 'wunderland') {
      const solutionStepRoot = path.join(teacherProjectMaterialRoot, 'loesungen', 'wunderland', 'teilloesungen');
      const solutionStepFiles = fs.readdirSync(solutionStepRoot).filter((fileName) => /^\d{2}_.+\.html$/.test(fileName));

      assert.match(overview, /<textarea id="starter-html" hidden>/);
      assert.match(overview, /data-editor-status/);
      assert.doesNotMatch(overview, /const starterHtml =/);
      assert.match(overview, /href="\.\.\/\.\.\/loesungen\/wunderland\/teilloesungen\/01_grundgeruest_assets\.html"/);
      assert.equal(solutionStepFiles.length, 15, 'wunderland teilloesung count');
      assert.match(
        fs.readFileSync(path.join(solutionStepRoot, '15_abnahme_original.html'), 'utf8'),
        /id="wrapper"|id='wrapper'/
      );
      assert.match(
        fs.readFileSync(path.join(teacherProjectMaterialRoot, 'loesungen', 'wunderland', 'css', 'teilloesungen.css'), 'utf8'),
        /Aufgabe 15/
      );
      assert.equal(fs.existsSync(path.join(assignmentRoot, 'index.html')), false, 'wunderland task index.html must not exist');
      assert.equal(fs.existsSync(path.join(assignmentRoot, 'teilloesungen')), false, 'wunderland task teilloesungen must not exist');
      assert.equal(fs.existsSync(path.join(assignmentRoot, 'css')), false, 'wunderland task css must not exist');
      ['fonts', 'html', 'images', 'js', 'lightbox'].forEach((dirName) => {
        assert.equal(fs.existsSync(path.join(assignmentRoot, dirName)), false, `wunderland task ${dirName} must not exist`);
      });
    }
  });
  [
    { project: 'akkordeon', firstEasyTask: '01_radio_label_verknuepfung.html', firstHardTask: '01_checked_selektor.html', firstStepSolution: '01_html_basis.html' },
    { project: 'wunderland', firstEasyTask: '01_header_logo_navigation.html', firstHardTask: '01_custom_properties_designsystem.html', firstStepSolution: '01_grundgeruest_assets.html' }
  ].forEach(({ project, firstEasyTask, firstHardTask, firstStepSolution }) => {
    const preparationRoot = path.join(teacherProjectMaterialRoot, 'projektvorbereitung', project);
    const preparationOverview = fs.readFileSync(path.join(preparationRoot, 'index.html'), 'utf8');
    const projectTasksOverview = fs.readFileSync(path.join(preparationRoot, 'projektaufgaben', 'aufgabenpakete.html'), 'utf8');

    assert.match(
      fs.readFileSync(path.join(teacherProjectMaterialRoot, 'index.html'), 'utf8'),
      /href="projektvorbereitung\/index\.html"/
    );
    assert.equal(fs.existsSync(path.join(preparationRoot, 'material', 'index.html')), true, `${project} projektvorbereitung material`);
    assert.equal(fs.existsSync(path.join(preparationRoot, 'vorbereitende_aufgaben', 'einfach', firstEasyTask)), true, `${project} projektvorbereitung einfach`);
    assert.equal(fs.existsSync(path.join(preparationRoot, 'vorbereitende_aufgaben', 'schwer', firstHardTask)), true, `${project} projektvorbereitung schwer`);
    assert.equal(fs.existsSync(path.join(preparationRoot, 'projektaufgaben', 'aufgabenpakete.html')), true, `${project} projektvorbereitung aufgabenpakete`);
    assert.equal(fs.existsSync(path.join(preparationRoot, 'projektaufgaben', 'Ausgangssituation', 'index.html')), true, `${project} projektvorbereitung ausgangssituation`);
    assert.equal(fs.existsSync(path.join(preparationRoot, 'loesungen', 'index.html')), true, `${project} projektvorbereitung loesung`);
    assert.equal(fs.existsSync(path.join(preparationRoot, 'loesungen', 'teilloesungen', firstStepSolution)), true, `${project} projektvorbereitung teilloesung`);
    assert.match(preparationOverview, /href="projektaufgaben\/aufgabenpakete\.html"/);
    assert.match(preparationOverview, /href="loesungen\/index\.html"/);
    assert.match(projectTasksOverview, /href="\.\.\/loesungen\/index\.html"/);
    assert.doesNotMatch(projectTasksOverview, /\.\.\/\.\.\/loesungen\/(?:wunderland|akkordeon)\//);
  });
  [
    { project: 'akkordeon', workspaceFiles: ['index.html', 'arbeitsdatei.html', 'arbeitsdatei.css'] },
    { project: 'wunderland', workspaceFiles: ['index.html', 'arbeitsdatei.html', 'arbeitsdatei.css', 'arbeitsdatei.js'] }
  ].forEach(({ project, workspaceFiles }) => {
    const participantAssignmentRoot = path.join(participantRoot, 'Projektmaterialien', 'aufgaben', project);
    const participantWorkspaceRoot = path.join(participantAssignmentRoot, 'Ausgangssituation');
    const overview = fs.readFileSync(path.join(participantAssignmentRoot, 'aufgabenpakete.html'), 'utf8');

    assert.match(
      fs.readFileSync(path.join(participantRoot, 'Projektmaterialien', 'index.html'), 'utf8'),
      new RegExp(`href="aufgaben/${project}/aufgabenpakete\\.html"`)
    );
    assert.match(overview, /href="Ausgangssituation\/index\.html"/);
    assert.doesNotMatch(overview, /data-open-editor/);
    assert.match(overview, /href="Ausgangssituation\/arbeitsdatei\.html"/);
    assert.match(overview, /href="Ausgangssituation\/arbeitsdatei\.css"/);
    assert.doesNotMatch(overview, /\.\.\/\.\.\/loesungen\//);
    assert.doesNotMatch(overview, /Original-Loesung|Teilloesung/);
    workspaceFiles.forEach((fileName) => {
      assert.equal(fs.existsSync(path.join(participantWorkspaceRoot, fileName)), true, `participant ${project} Ausgangssituation ${fileName}`);
    });
    assert.equal(fs.existsSync(path.join(participantRoot, 'Projektmaterialien', 'loesungen')), false, 'participant loesungen folder must not exist');
  });
  assert.equal(fs.existsSync(path.join(teacherProjectMaterialRoot, 'zip')), false, 'teacher zip folder must not exist');

  [
    { root: participantRoot, role: 'teilnehmer', hasSolutions: false },
    { root: teacherRoot, role: 'dozent', hasSolutions: true }
  ].forEach(({ root, role, hasSolutions }) => {
    const materialRoot = path.join(root, 'Projektmaterialien');
    const overview = fs.readFileSync(path.join(materialRoot, 'index.html'), 'utf8');

    expectedProjects.forEach((project) => {
      const projectRoot = path.join(materialRoot, project);
      const materialIndex = path.join(projectRoot, 'material', 'index.html');
      const materialContent = fs.readFileSync(materialIndex, 'utf8');

      assert.equal(fs.existsSync(materialIndex), true, `${role} ${project} material`);
      assert.match(materialContent, /Was soll ich hier machen\?/);
      assert.match(materialContent, /href="\.\.\/vorbereitende_aufgaben\/einfach\/01_/);
      assert.match(materialContent, /href="\.\.\/vorbereitende_aufgaben\/schwer\/01_/);
      ['einfach', 'schwer'].forEach((difficulty) => {
        const taskDir = path.join(projectRoot, 'vorbereitende_aufgaben', difficulty);
        const taskFiles = fs.readdirSync(taskDir)
          .filter((fileName) => /^\d{2}_.+\.html$/.test(fileName))
          .filter((fileName) => !/_(?:aufgabe|loesung)\.html$/.test(fileName));
        const sortedTaskFiles = [...taskFiles].sort((left, right) => left.localeCompare(right, 'de'));

        assert.equal(taskFiles.length, 4, `${role} ${project} ${difficulty} task count`);
        assert.deepEqual(taskFiles, sortedTaskFiles, `${role} ${project} ${difficulty} sorted`);
        taskFiles.forEach((fileName, index) => {
          assert.match(fileName, new RegExp(`^${String(index + 1).padStart(2, '0')}_`));
          const taskPath = path.join(taskDir, fileName);
          const taskContent = fs.readFileSync(taskPath, 'utf8');
          const stem = fileName.replace(/\.html$/, '');
          const starterHtml = path.join(taskDir, `${stem}_aufgabe.html`);
          const starterCss = path.join(taskDir, `${stem}_aufgabe.css`);
          const solutionHtml = path.join(taskDir, `${stem}_loesung.html`);

          assert.match(taskContent, /Was soll ich hier machen\?|Zielbild/);
          assert.match(taskContent, /Benoetigte HTML-Tags/);
          assert.match(taskContent, /CSS-Selektoren und Attribute/);
          assert.match(taskContent, /class="info-card"/);
          assert.match(taskContent, /Klick fuer Info/);
          assert.match(taskContent, /Offizielle Doku oeffnen/);
          assert.match(taskContent, /developer\.mozilla\.org/);
          assert.match(taskContent, /class="code-sample"/);
          assert.match(taskContent, /summary:hover/);
          assert.match(taskContent, /Ergebnis anzeigen/);
          assert.match(taskContent, new RegExp(`href="${stem}_aufgabe\\.html"`));
          assert.match(taskContent, new RegExp(`href="${stem}_aufgabe\\.css"`));
          assert.match(taskContent, new RegExp(`href="${stem}_loesung\\.html"`));
          assert.equal(/Loesungshinweise/.test(taskContent), hasSolutions);
          assert.equal(fs.existsSync(starterHtml), true, `${role} ${project} ${difficulty} ${stem} starter html`);
          assert.equal(fs.existsSync(starterCss), true, `${role} ${project} ${difficulty} ${stem} starter css`);
          assert.equal(fs.existsSync(solutionHtml), true, `${role} ${project} ${difficulty} ${stem} solution html`);
          assert.match(fs.readFileSync(starterHtml, 'utf8'), /Auftrag:/);
          assert.match(fs.readFileSync(starterCss, 'utf8'), /Auftrag:/);
          assert.match(fs.readFileSync(solutionHtml, 'utf8'), /Loesungsdatei fuer:/);
        });
      });
      assert.match(overview, new RegExp(`${project}/material/index\\.html`));
      assert.match(overview, new RegExp(`${project}/vorbereitende_aufgaben/einfach/01_`));
      assert.match(overview, new RegExp(`${project}/vorbereitende_aufgaben/schwer/01_`));
    });
  });
});

test('original project showcases and solution steps keep their own project layout', () => {
  const protectedProjectRoots = [
    path.join(teacherRoot, 'Projektmaterialien', 'loesungen'),
    path.join(teacherRoot, 'Projektmaterialien', 'aufgaben', 'akkordeon', 'Ausgangssituation'),
    path.join(teacherRoot, 'Projektmaterialien', 'aufgaben', 'wunderland', 'Ausgangssituation'),
    path.join(teacherRoot, 'Projektmaterialien', 'projektvorbereitung', 'akkordeon', 'loesungen'),
    path.join(teacherRoot, 'Projektmaterialien', 'projektvorbereitung', 'akkordeon', 'material'),
    path.join(teacherRoot, 'Projektmaterialien', 'projektvorbereitung', 'akkordeon', 'projektaufgaben', 'Ausgangssituation'),
    path.join(teacherRoot, 'Projektmaterialien', 'projektvorbereitung', 'wunderland', 'loesungen'),
    path.join(teacherRoot, 'Projektmaterialien', 'projektvorbereitung', 'wunderland', 'material'),
    path.join(teacherRoot, 'Projektmaterialien', 'projektvorbereitung', 'wunderland', 'projektaufgaben', 'Ausgangssituation'),
    path.join(teacherRoot, 'Projektmaterialien', '01_ausgangssituation_responsive', 'material'),
    path.join(teacherRoot, 'Projektmaterialien', '02_wunderland', 'material'),
    path.join(teacherRoot, 'Projektmaterialien', '03_akkordeon', 'material'),
    path.join(participantRoot, 'Projektmaterialien', 'aufgaben', 'akkordeon', 'Ausgangssituation'),
    path.join(participantRoot, 'Projektmaterialien', 'aufgaben', 'wunderland', 'Ausgangssituation'),
    path.join(participantRoot, 'Projektmaterialien', '01_ausgangssituation_responsive', 'material'),
    path.join(participantRoot, 'Projektmaterialien', '02_wunderland', 'material'),
    path.join(participantRoot, 'Projektmaterialien', '03_akkordeon', 'material')
  ];
  const offenders = [];

  protectedProjectRoots
    .filter((root) => fs.existsSync(root))
    .flatMap((root) => walkFiles(root, (filePath) => /\.html$/i.test(filePath)))
    .forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      if (/unified-layout\.css|<link\s+rel=["']stylesheet["']\s+href=["']["']\s*>/i.test(content)) {
        offenders.push(path.relative(repoRoot, filePath));
      }
    });

  assert.deepEqual(offenders, []);
});

test('deployment packaging scripts and required documentation are present', () => {
  const requiredFiles = [
    'README.md',
    'SOFTWARE.md',
    'LFZQ8a_Workflow_Uebersicht.html',
    'LFZQ8a-Dozent-Startview-testen.cmd',
    'deployment/build-packages.ps1',
    'deployment/common/install-check.ps1',
    'deployment/dozent/Start-LFZQ8a-Dozent.cmd',
    'deployment/teilnehmer/Start-LFZQ8a-Teilnehmer.cmd'
  ];

  requiredFiles.forEach((filePath) => {
    assert.equal(fs.existsSync(path.join(repoRoot, filePath)), true, filePath);
  });

  const buildScript = fs.readFileSync(path.join(repoRoot, 'deployment', 'build-packages.ps1'), 'utf8');
  const installScript = fs.readFileSync(path.join(repoRoot, 'deployment', 'common', 'install-check.ps1'), 'utf8');
  const rootStarterFiles = fs.readdirSync(repoRoot).filter((fileName) => /^LFZQ8a-.+\.cmd$/i.test(fileName)).sort();
  const teacherStartviewStarter = fs.readFileSync(path.join(repoRoot, 'LFZQ8a-Dozent-Startview-testen.cmd'), 'utf8');
  const teacherStarter = fs.readFileSync(path.join(repoRoot, 'deployment', 'dozent', 'Start-LFZQ8a-Dozent.cmd'), 'utf8');
  const participantStarter = fs.readFileSync(path.join(repoRoot, 'deployment', 'teilnehmer', 'Start-LFZQ8a-Teilnehmer.cmd'), 'utf8');
  const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');

  assert.deepEqual(rootStarterFiles, ['LFZQ8a-Dozent-Startview-testen.cmd']);
  assert.match(buildScript, /LFZQ8a-Dozent\.zip/);
  assert.match(buildScript, /LFZQ8a-Teilnehmer\.zip/);
  assert.doesNotMatch(buildScript, /Wizard-Test|Wizard-Test\.cmd/);
  assert.match(buildScript, /Copy-RootDocs/);
  assert.match(installScript, /OpenJS\.NodeJS\.LTS/);
  assert.match(installScript, /Microsoft\.VisualStudioCode/);
  assert.match(installScript, /Ensure-AppDependencies/);
  assert.match(installScript, /TeacherStartviewTest/);
  assert.match(installScript, /--teacher-startview/);
  assert.match(teacherStartviewStarter, /dozent\\index_dozent\.html/);
  assert.match(teacherStartviewStarter, /install-check\.ps1/);
  assert.match(teacherStartviewStarter, /-TeacherStartviewTest/);
  assert.match(teacherStarter, /install-check\.ps1/);
  assert.match(teacherStarter, /-Role Dozent -Start/);
  assert.match(teacherStarter, /--check/);
  assert.match(participantStarter, /-Role Teilnehmer -Start/);
  assert.match(participantStarter, /--check/);
  assert.match(gitignore, /dist\//);

  ['README.md', 'SOFTWARE.md', 'LFZQ8a_Workflow_Uebersicht.html'].forEach((filePath) => {
    const content = fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
    assert.match(content, /deployment|Bereitstellung|Paket|Software/i, filePath);
  });
});
