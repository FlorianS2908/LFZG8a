const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { createAppData, STANDARD_PASSWORD } = require('../app/lib/app-data');
const { moduleRegistry } = require('../app/lib/modules/module-registry');
const { createContentFactoryService } = require('../app/lib/content-factory/content-factory-service');
const {
  getVisibleModuleManifestsForSession,
  decideHtmlCssOpenMode,
  canOpenContentFactory,
  canSeeCourseSettings,
  getEmptyStateMessage
} = require('../app/lib/workflow/role-access');

const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..');
const checkDataDir = path.join(os.tmpdir(), 'uetool-as-saas-workflow-check');
let passed = 0;
let failed = 0;

function ok(message) {
  passed += 1;
  console.log(`[OK] ${message}`);
}

function fail(message, hint = '') {
  failed += 1;
  console.error(`[FEHLER] ${message}`);
  if (hint) {
    console.error(`[HINWEIS] ${hint}`);
  }
}

function check(message, fn, hint = '') {
  try {
    fn();
    ok(message);
  } catch (error) {
    fail(`${message}: ${error.message}`, hint);
  }
}

function visibleModules(session, service) {
  return getVisibleModuleManifestsForSession(
    session,
    moduleRegistry.getAllModules(),
    service.storage.listGeneratedContainers()
  );
}

check('ueTool_asSaaS Projektstruktur gefunden', () => {
  assert.equal(fs.existsSync(path.join(repoRoot, 'desktop-app')), true);
  assert.equal(fs.existsSync(path.join(appDir, 'package.json')), true);
});

check('Node.js verfuegbar', () => {
  assert.match(process.version, /^v\d+\./);
});

[
  'app/main.js',
  'app/preload.js',
  'app/lib/app-data.js',
  'app/lib/modules/module-registry.js',
  'app/lib/modules/content-factory-container.js',
  'app/lib/modules/release-center-container.js',
  'app/lib/modules/teacher-create-container.js',
  'app/lib/modules/participant-create-container.js',
  'app/lib/modules/course-management-container.js',
  'app/lib/modules/admin-tool-containers.js',
  'app/lib/admin-tools/admin-tool-registry.js',
  'app/lib/admin-tools/admin-tool-config-store.js',
  'app/lib/container-registry/container-registry-service.js',
  'app/lib/course-management/course-management-service.js',
  'app/renderer/tool-center/login.html',
  'app/renderer/tool-center/workspace.html',
  'app/renderer/tool-center/factory.html',
  'app/renderer/tool-center/release-center.html',
  'app/renderer/tool-center/user-create.html',
  'app/renderer/tool-center/admin-tool.html',
  'app/renderer/tool-center/course-management.html',
  'app/renderer/course.html'
].forEach((filePath) => {
  check(`${filePath} vorhanden`, () => {
    assert.equal(fs.existsSync(path.join(appDir, filePath)), true);
  });
});

fs.rmSync(checkDataDir, { recursive: true, force: true });
const appData = createAppData(checkDataDir, { disableHistory: true });
const service = createContentFactoryService({ appData });
appData.ensureDataFiles();

const admin = appData.login('admin@admin.de', STANDARD_PASSWORD);
const dozent = appData.login('dozent@dozent.de', STANDARD_PASSWORD);
const teilnehmer = appData.login('tn@tn.de', STANDARD_PASSWORD);

check('Standardkonto Admin initialisiert', () => assert.equal(admin.authenticated, true));
check('Standardkonto Dozent initialisiert', () => assert.equal(dozent.authenticated, true));
check('Standardkonto Teilnehmer initialisiert', () => assert.equal(teilnehmer.authenticated, true));
check('Login Admin erfolgreich', () => assert.equal(admin.user.roles.includes('Admin'), true));
check('Login Dozent erfolgreich', () => assert.equal(dozent.user.roles.includes('Dozent'), true));
check('Login Teilnehmer erfolgreich', () => assert.equal(teilnehmer.user.roles.includes('Teilnehmer'), true));
check('Falsches Passwort korrekt abgelehnt', () => assert.equal(appData.login('admin@admin.de', 'falsch').authenticated, false));
check('Passwoerter nicht im Klartext gespeichert', () => {
  appData.listUsers().forEach((user) => assert.notEqual(user.passwordHash, STANDARD_PASSWORD));
});
check('Profile werden erstellt', () => assert.equal(appData.listProfiles().length >= 3, true));
check('Registrierung funktioniert mit Vorabfreigabe', () => {
  appData.createPendingRegistration(admin, {
    name: 'Workflow Test',
    email: 'workflow@example.test',
    role: 'teilnehmer'
  });
  const result = appData.registerUser({
    displayName: 'Workflow Test',
    email: 'workflow@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Teilnehmer'
  });
  assert.equal(result.authenticated, true);
});
check('Doppelte Registrierung wird verhindert', () => {
  assert.throws(() => appData.registerUser({
    displayName: 'Workflow Test',
    email: 'workflow@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass'
  }), /Benutzerkonto/);
});
check('Admin-Registrierung wird verhindert', () => {
  assert.throws(() => appData.registerUser({
    displayName: 'Admin Self',
    email: 'admin-self@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Admin'
  }), /nicht erlaubt/);
});

check('Admin sieht ContentFactory', () => {
  assert.equal(visibleModules(admin, service).some((module) => module.id === 'content-factory'), true);
});
check('Admin sieht Freigabezentrum', () => {
  assert.equal(visibleModules(admin, service).some((module) => module.id === 'release-center'), true);
});
check('Admin sieht Kachel Dozent anlegen', () => {
  assert.equal(visibleModules(admin, service).some((module) => module.id === 'teacher-create'), true);
});
check('Admin sieht Kachel Teilnehmer anlegen', () => {
  assert.equal(visibleModules(admin, service).some((module) => module.id === 'participant-create'), true);
});
check('Admin sieht Kachel Kursverwaltung', () => {
  assert.equal(visibleModules(admin, service).some((module) => module.id === 'course-management'), true);
});
check('Admin sieht zentrale Admin-Werkzeugkacheln', () => {
  const visibleIds = visibleModules(admin, service).map((module) => module.id);
  [
    'container-adapter',
    'import-analysis',
    'course-generator',
    'quiz-builder',
    'container-export',
    'ai-provider-config',
    'test-center',
    'system-diagnostics'
  ].forEach((moduleId) => assert.equal(visibleIds.includes(moduleId), true));
});
check('Admin sieht keine normalen Kurskacheln', () => {
  assert.deepEqual(visibleModules(admin, service).filter((module) => module.assignable === true), []);
});
check('Admin-Startseite trennt Systemverwaltung von Tool- und Quizbereichen', () => {
  const workspace = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.html'), 'utf8');
  const workspaceJs = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.js'), 'utf8');
  assert.match(workspace, /data-admin-module-section/);
  assert.match(workspace, /data-admin-module-grid/);
  assert.match(workspace, /data-track-navigation/);
  assert.match(workspaceJs, /trackNavigation\.hidden = adminView/);
  assert.match(workspaceJs, /coursePanel\.hidden = adminView/);
});
check('ContentFactory ist nicht freigebbar', () => {
  assert.equal(moduleRegistry.getModuleById('content-factory').manifest.assignable, false);
});
check('Freigabezentrum ist nicht freigebbar', () => {
  assert.equal(moduleRegistry.getModuleById('release-center').manifest.assignable, false);
});
check('Admin-Kacheln sind nicht freigebbar', () => {
  [
    'content-factory',
    'release-center',
    'teacher-create',
    'participant-create',
    'course-management',
    'container-adapter',
    'import-analysis',
    'course-generator',
    'quiz-builder',
    'container-export',
    'ai-provider-config',
    'test-center',
    'system-diagnostics'
  ].forEach((moduleId) => {
    assert.equal(moduleRegistry.getModuleById(moduleId).manifest.assignable, false);
  });
});
check('Admin-Werkzeuge erscheinen nicht als freigebbare Module', () => {
  const assignableIds = [
    ...moduleRegistry.getAllModules(),
    ...service.storage.listGeneratedContainers()
  ].filter((module) => module.manifest.assignable === true).map((module) => module.manifest.id);
  ['container-adapter', 'test-center', 'system-diagnostics', 'ai-provider-config'].forEach((moduleId) => {
    assert.equal(assignableIds.includes(moduleId), false);
  });
});
check('Kursverwaltung sieht nur Kursverwaltungskachel', () => {
  const courseManagerSession = { authenticated: true, user: { roles: ['course_manager'] }, profile: {} };
  assert.deepEqual(visibleModules(courseManagerSession, service).map((module) => module.id), ['course-management']);
});
check('Dozent ohne Freigabe sieht keine Kacheln', () => {
  assert.deepEqual(visibleModules(dozent, service), []);
});
check('Dozent sieht keine Admin-Kacheln', () => {
  assert.equal(visibleModules(dozent, service).some((module) => module.category === 'admin'), false);
});
check('Dozent ohne Freigabe erhaelt passenden Hinweis', () => {
  assert.match(getEmptyStateMessage(dozent), /Dozentenprofil/);
});
check('Teilnehmer sieht keine Kacheln', () => {
  assert.deepEqual(visibleModules(teilnehmer, service), []);
});
check('Teilnehmer sieht keine Admin-Kacheln', () => {
  assert.equal(visibleModules(teilnehmer, service).some((module) => module.category === 'admin'), false);
});
check('Teilnehmer ohne Freigabe erhaelt passenden Hinweis', () => {
  assert.match(getEmptyStateMessage(teilnehmer), /Teilnehmerprofil/);
});
check('ContentFactory ist nur fuer Admin erreichbar', () => {
  assert.equal(canOpenContentFactory(admin), true);
  assert.equal(canOpenContentFactory(dozent), false);
  assert.equal(canOpenContentFactory(teilnehmer), false);
});
check('ContentFactory enthaelt Container Duplizierung', () => {
  const html = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/factory.html'), 'utf8');
  assert.match(html, /Container Duplizierung/);
});
check('ContentFactory enthaelt Container Erstellung', () => {
  const html = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/factory.html'), 'utf8');
  assert.match(html, /Container Erstellung/);
});
check('Admin kann HTML/CSS fuer Dozent freigeben', () => {
  appData.setAssignedModules(dozent.user.id, ['lfzq8a']);
  const nextSession = appData.login('dozent@dozent.de', STANDARD_PASSWORD);
  assert.equal(visibleModules(nextSession, service).some((module) => module.name === 'HTML/CSS'), true);
});
check('Admin kann Dozent-Vorabfreigabe erstellen', () => {
  const pending = appData.createPendingRegistration(admin, {
    name: 'Workflow Dozent',
    email: 'workflow.dozent@example.test',
    role: 'dozent'
  });
  assert.equal(pending.role, 'dozent');
  assert.equal(pending.status, 'pending');
});
check('Admin kann Teilnehmer-Vorabfreigabe erstellen', () => {
  const pending = appData.createPendingRegistration(admin, {
    name: 'Workflow Teilnehmer',
    email: 'workflow.tn@example.test',
    role: 'teilnehmer'
  });
  assert.equal(pending.role, 'teilnehmer');
  assert.equal(pending.status, 'pending');
});
check('Nicht-Admin kann keine Vorabfreigabe erstellen', () => {
  assert.throws(() => appData.createPendingRegistration(dozent, {
    name: 'Nicht Admin',
    email: 'nicht.admin@example.test',
    role: 'dozent'
  }), /Admin-Rechte/);
});
check('Registrierung als Dozent ohne Vorabfreigabe wird abgelehnt', () => {
  assert.throws(() => appData.registerUser({
    displayName: 'Ohne Dozent',
    email: 'ohne.dozent@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Dozent'
  }), /keine Registrierungsfreigabe/);
});
check('Registrierung als Teilnehmer ohne Vorabfreigabe wird abgelehnt', () => {
  assert.throws(() => appData.registerUser({
    displayName: 'Ohne Teilnehmer',
    email: 'ohne.tn@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Teilnehmer'
  }), /keine Registrierungsfreigabe/);
});
check('Registrierung mit falscher Rolle wird abgelehnt', () => {
  assert.throws(() => appData.registerUser({
    displayName: 'Workflow Dozent',
    email: 'workflow.dozent@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Teilnehmer'
  }), /nicht fuer diese Rolle/);
});
let acceptedTeacherRegistration = null;
check('Registrierung als Dozent mit Vorabfreigabe funktioniert', () => {
  acceptedTeacherRegistration = appData.registerUser({
    displayName: 'Workflow Dozent',
    email: 'workflow.dozent@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Dozent'
  });
  assert.equal(acceptedTeacherRegistration.authenticated, true);
  assert.equal(acceptedTeacherRegistration.user.roles.includes('Dozent'), true);
});
check('Vorabfreigabe wird nach Registrierung auf accepted gesetzt', () => {
  const accepted = appData.listPendingRegistrations(admin)
    .find((entry) => entry.email === 'workflow.dozent@example.test');
  assert.equal(accepted.status, 'accepted');
  assert.equal(Boolean(accepted.acceptedAt), true);
  assert.equal(accepted.registeredUserId, acceptedTeacherRegistration.user.id);
});
check('Registrierung als Teilnehmer mit Vorabfreigabe funktioniert', () => {
  const result = appData.registerUser({
    displayName: 'Workflow Teilnehmer',
    email: 'workflow.tn@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Teilnehmer'
  });
  assert.equal(result.authenticated, true);
  assert.equal(result.user.roles.includes('Teilnehmer'), true);
});
check('Widerrufene Vorabfreigabe blockiert Registrierung', () => {
  const pending = appData.createPendingRegistration(admin, {
    name: 'Widerruf Test',
    email: 'widerruf@example.test',
    role: 'teilnehmer'
  });
  appData.revokePendingRegistration(admin, pending.id);
  assert.throws(() => appData.registerUser({
    displayName: 'Widerruf Test',
    email: 'widerruf@example.test',
    password: 'workflow-pass',
    confirmation: 'workflow-pass',
    role: 'Teilnehmer'
  }), /widerrufen/);
});
check('Standardkonten bleiben funktionsfaehig', () => {
  assert.equal(appData.login('admin@admin.de', STANDARD_PASSWORD).authenticated, true);
  assert.equal(appData.login('dozent@dozent.de', STANDARD_PASSWORD).authenticated, true);
  assert.equal(appData.login('tn@tn.de', STANDARD_PASSWORD).authenticated, true);
});
check('Admin kann HTML/CSS fuer Teilnehmer freigeben', () => {
  appData.setAssignedModules(teilnehmer.user.id, ['lfzq8a']);
  const nextSession = appData.login('tn@tn.de', STANDARD_PASSWORD);
  assert.equal(visibleModules(nextSession, service).some((module) => module.name === 'HTML/CSS'), true);
});
check('Admin kann Freigabe wieder entziehen', () => {
  appData.setAssignedModules(dozent.user.id, []);
  const nextSession = appData.login('dozent@dozent.de', STANDARD_PASSWORD);
  assert.deepEqual(visibleModules(nextSession, service), []);
});
check('Freigaben werden lokal im Profil gespeichert', () => {
  appData.setAssignedModules(dozent.user.id, ['lfzq8a']);
  const reloaded = createAppData(checkDataDir, { disableHistory: true });
  const profile = reloaded.listProfiles().find((entry) => entry.userId === dozent.user.id);
  assert.deepEqual(profile.assignedModuleIds, ['lfzq8a']);
});
const dozentWithRelease = appData.login('dozent@dozent.de', STANDARD_PASSWORD);
const teilnehmerWithRelease = appData.login('tn@tn.de', STANDARD_PASSWORD);
check('Dozenten-Kurssettings speicherbar', () => {
  appData.saveCourseSettings('html-css', { courseViewMonitorIndex: 2 });
  assert.equal(appData.getCourseSettings('html-css').courseViewMonitorIndex, 2);
});
check('Default-Pausen vorhanden', () => {
  assert.equal(appData.getCourseSettings('html-css').breaks.length, 4);
});
check('Admin sieht keine Pausen-/Kurssettings', () => {
  assert.equal(canSeeCourseSettings(admin), false);
});
check('Dozent sieht Pausen-/Kurssettings nur bei freigegebenem Kurs', () => {
  assert.equal(canSeeCourseSettings(dozentWithRelease), true);
});
check('Teilnehmer sieht keine Kurssettings', () => {
  assert.equal(canSeeCourseSettings(teilnehmer), false);
});
check('Routing-Entscheidung Dozent ergibt Dozentenbereich und Kursview', () => {
  assert.equal(decideHtmlCssOpenMode(dozentWithRelease), 'teacher-and-course');
});
check('Routing-Entscheidung Teilnehmer ergibt nur Kursview', () => {
  assert.equal(decideHtmlCssOpenMode(teilnehmerWithRelease), 'course-only');
});
check('Routing-Entscheidung Admin blockiert HTML/CSS', () => {
  assert.equal(decideHtmlCssOpenMode(admin), 'blocked');
});
check('Plattformbenennung ueTool_asSaaS geprueft', () => {
  const workspace = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.html'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  assert.match(workspace, /ueTool_asSaaS/);
  assert.equal(packageJson.productName, 'ueTool_asSaaS');
});
check('Kursbenennung HTML/CSS geprueft', () => {
  assert.equal(moduleRegistry.getModuleById('lfzq8a').manifest.name, 'HTML/CSS');
});
check('Alte sichtbare HTML/CSS-Kachelbezeichnung entfernt', () => {
  const workspace = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.html'), 'utf8');
  assert.doesNotMatch(workspace, />[^<]*LFZQ8a[^<]*</);
});
check('Wizard ist keine Landingpage-Kachel', () => {
  const workspace = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.html'), 'utf8');
  assert.doesNotMatch(workspace, /data-open-module="wizard"|Wizard<\/strong>/);
});
check('Wizard ist im Profilbereich versteckt', () => {
  const workspace = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.html'), 'utf8');
  assert.match(workspace, /data-profile-wizard/);
});
check('Admin kann den Kurs-Wizard nicht aus dem Profil oeffnen', () => {
  const workspaceJs = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.js'), 'utf8');
  const mainSource = fs.readFileSync(path.join(appDir, 'app/main.js'), 'utf8');
  assert.match(workspaceJs, /roles\.includes\('Dozent'\) && assigned\.includes\('lfzq8a'\)/);
  assert.match(mainSource, /Der Wizard ist nur fuer freigegebene Dozentenkurse verfuegbar/);
});
check('Loginformular ist initial sichtbar', () => {
  const loginHtml = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/login.html'), 'utf8');
  assert.match(loginHtml, /data-login-form data-auth-panel="login"/);
  assert.doesNotMatch(loginHtml, /data-login-form data-auth-panel="login" hidden/);
});
check('Registrierungsformular ist hinter Button versteckt', () => {
  const loginHtml = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/login.html'), 'utf8');
  assert.match(loginHtml, /data-register-form data-auth-panel="register" hidden/);
});
check('Login und Registrierung werden per Switch exklusiv angezeigt', () => {
  const loginCss = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/workspace.css'), 'utf8');
  const loginJs = fs.readFileSync(path.join(appDir, 'app/renderer/tool-center/login.js'), 'utf8');
  assert.match(loginCss, /\[hidden\]\s*\{[\s\S]+display: none !important/);
  assert.match(loginJs, /panel\.hidden = panel\.dataset\.authPanel !== nextMode/);
});

console.log('============================================================');
console.log('ueTool_asSaaS Workflow-Check abgeschlossen');
console.log(`Bestanden: ${passed}`);
console.log(`Fehlgeschlagen: ${failed}`);
console.log(`Status: ${failed === 0 ? 'OK' : 'FEHLER'}`);
console.log('============================================================');

process.exit(failed === 0 ? 0 : 1);
