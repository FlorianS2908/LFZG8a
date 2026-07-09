const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const {
  createAppData,
  defaultSettings,
  defaultParticipantReleases,
  defaultTaskReleases,
  INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_PASSWORD,
  STANDARD_PASSWORD,
  STANDARD_USERS,
  PASSWORD_HASH_ALGORITHM,
  createPasswordHash,
  verifyPassword,
  normalizeBreaks,
  COURSE_BREAK_EDIT_WINDOW_MS
} = require('../app/lib/app-data');
const taskPackageRegistry = require('../app/lib/task-packages.json');

function createTempAppData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-app-data-'));
  return {
    appData: createAppData(dir),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

test('app data creates default settings and empty history', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();

    assert.deepEqual(appData.getSettings(), defaultSettings);
    assert.deepEqual(appData.listHistory(), []);
  } finally {
    cleanup();
  }
});

test('app data creates protected local admin with hashed password', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();

    const admin = appData.listUsers().find((user) => user.email === INITIAL_ADMIN_EMAIL);
    const adminProfile = appData.listProfiles().find((profile) => profile.userId === admin.id);

    assert.equal(admin.isProtected, true);
    assert.equal(admin.isActive, true);
    assert.equal(admin.roles.includes('Admin'), true);
    assert.match(admin.passwordHash, new RegExp(`^${PASSWORD_HASH_ALGORITHM}\\$`));
    assert.notEqual(admin.passwordHash, INITIAL_ADMIN_PASSWORD);
    assert.equal(adminProfile.userId, admin.id);
  } finally {
    cleanup();
  }
});

test('app data creates standard admin teacher and participant accounts', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();
    const users = appData.listUsers();
    const profiles = appData.listProfiles();

    STANDARD_USERS.forEach((definition) => {
      const user = users.find((entry) => entry.email === definition.email);
      assert.equal(Boolean(user), true);
      assert.equal(user.roles[0] === definition.roles[0] || user.roles.includes(definition.roles[0]), true);
      assert.equal(user.passwordHash.includes(STANDARD_PASSWORD), false);
      assert.equal(profiles.some((profile) => profile.userId === user.id), true);
      assert.equal(appData.login(definition.email, STANDARD_PASSWORD).authenticated, true);
    });
  } finally {
    cleanup();
  }
});

test('app data registers local users only after admin prerelease and blocks duplicate email and admin signup', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const admin = appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
    const pending = appData.createPendingRegistration(admin, {
      name: 'Neue Teilnehmerin',
      email: 'neu@example.test',
      role: 'teilnehmer',
      note: 'Demo'
    });
    const result = appData.registerUser({
      displayName: 'Neue Teilnehmerin',
      email: 'neu@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Teilnehmer'
    });

    assert.equal(result.authenticated, true);
    assert.equal(result.user.roles.includes('Teilnehmer'), true);
    assert.equal(appData.listProfiles().some((profile) => profile.userId === result.user.id), true);
    const accepted = appData.listPendingRegistrations(admin).find((entry) => entry.id === pending.id);
    assert.equal(accepted.status, 'accepted');
    assert.equal(Boolean(accepted.acceptedAt), true);
    assert.equal(accepted.registeredUserId, result.user.id);
    assert.throws(() => appData.registerUser({
      displayName: 'Nochmal',
      email: 'neu@example.test',
      password: 'passwort123',
      confirmation: 'passwort123'
    }), /existiert bereits ein Benutzerkonto/);
    assert.throws(() => appData.registerUser({
      displayName: 'Admin Self',
      email: 'self-admin@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Admin'
    }), /nicht erlaubt/);
  } finally {
    cleanup();
  }
});

test('app data manages pending registrations for teachers and participants', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const admin = appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
    const teacher = appData.login('dozent@dozent.de', STANDARD_PASSWORD);
    assert.throws(() => appData.createPendingRegistration(teacher, {
      name: 'Ohne Admin',
      email: 'noadmin@example.test',
      role: 'dozent'
    }), /Admin-Rechte/);
    assert.throws(() => appData.createPendingRegistration(admin, {
      name: '',
      email: 'leer@example.test',
      role: 'dozent'
    }), /Name/);
    assert.throws(() => appData.createPendingRegistration(admin, {
      name: 'Falsch',
      email: 'ungueltig',
      role: 'dozent'
    }), /E-Mail/);
    assert.throws(() => appData.createPendingRegistration(admin, {
      name: 'Schon da',
      email: 'dozent@dozent.de',
      role: 'dozent'
    }), /Benutzerkonto/);

    const pendingTeacher = appData.createPendingRegistration(admin, {
      name: 'Neue Dozentin',
      email: 'teacher-new@example.test',
      role: 'dozent'
    });
    const pendingParticipant = appData.createPendingRegistration(admin, {
      name: 'Neuer Teilnehmer',
      email: 'tn-new@example.test',
      role: 'teilnehmer'
    });

    assert.equal(pendingTeacher.role, 'dozent');
    assert.equal(pendingTeacher.status, 'pending');
    assert.equal(pendingParticipant.role, 'teilnehmer');
    assert.throws(() => appData.createPendingRegistration(admin, {
      name: 'Doppelt',
      email: 'teacher-new@example.test',
      role: 'teilnehmer'
    }), /offene Registrierungsfreigabe/);
    assert.throws(() => appData.listPendingRegistrations(teacher), /Admin-Rechte/);

    const revoked = appData.revokePendingRegistration(admin, pendingParticipant.id);
    assert.equal(revoked.status, 'revoked');
    assert.throws(() => appData.registerUser({
      displayName: 'Neuer Teilnehmer',
      email: 'tn-new@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Teilnehmer'
    }), /widerrufen/);
  } finally {
    cleanup();
  }
});

test('app data blocks registration without matching prerelease', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const admin = appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
    appData.createPendingRegistration(admin, {
      name: 'Rollen Test',
      email: 'rolle@example.test',
      role: 'dozent'
    });
    assert.throws(() => appData.registerUser({
      displayName: 'Keine Freigabe',
      email: 'frei@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Teilnehmer'
    }), /keine Registrierungsfreigabe/);
    assert.throws(() => appData.registerUser({
      displayName: 'Rollen Test',
      email: 'rolle@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Teilnehmer'
    }), /nicht fuer diese Rolle/);
    const result = appData.registerUser({
      displayName: 'Rollen Test',
      email: 'rolle@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Dozent'
    });
    assert.equal(result.authenticated, true);
    assert.equal(result.user.roles.includes('Dozent'), true);
    assert.throws(() => appData.registerUser({
      displayName: 'Rollen Test',
      email: 'rolle@example.test',
      password: 'passwort123',
      confirmation: 'passwort123',
      role: 'Dozent'
    }), /Benutzerkonto/);
  } finally {
    cleanup();
  }
});

test('app data stores course settings for html css with default breaks', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const defaults = appData.getCourseSettings('html-css');
    assert.equal(defaults.courseName, 'HTML/CSS');
    assert.deepEqual(defaults.breaks.map((breakData) => `${breakData.start}-${breakData.end}`), [
      '10:00-10:15',
      '11:45-12:15',
      '13:45-14:00',
      '15:30-15:45'
    ]);

    const saved = appData.saveCourseSettings('html-css', { courseViewMonitorIndex: 2 });
    assert.equal(saved.courseViewMonitorIndex, 2);
    assert.equal(createAppData(path.dirname(appData.dataDir)).getCourseSettings('html-css').courseViewMonitorIndex, 2);
  } finally {
    cleanup();
  }
});

test('app data stores assigned module ids per profile and persists them', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();
    const teacher = appData.listUsers().find((user) => user.email === 'dozent@dozent.de');
    const savedProfile = appData.setAssignedModules(teacher.id, ['lfzq8a', 'lfzq8a']);

    assert.deepEqual(savedProfile.assignedModuleIds, ['lfzq8a']);
    const reloaded = createAppData(path.dirname(appData.dataDir));
    const profile = reloaded.listProfiles().find((entry) => entry.userId === teacher.id);
    assert.deepEqual(profile.assignedModuleIds, ['lfzq8a']);
  } finally {
    cleanup();
  }
});

test('app data authenticates admin and rejects wrong passwords', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const rejected = appData.login(INITIAL_ADMIN_EMAIL, 'falsch');
    assert.equal(rejected.authenticated, false);

    const accepted = appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
    assert.equal(accepted.authenticated, true);
    assert.equal(accepted.user.email, INITIAL_ADMIN_EMAIL);
    assert.equal(accepted.user.passwordHash, undefined);
    assert.equal(appData.getCurrentSession().authenticated, true);

    appData.logout();
    assert.equal(appData.getCurrentSession().authenticated, false);
  } finally {
    cleanup();
  }
});

test('app data protects the initial admin from deletion and deactivation', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();
    const admin = appData.listUsers().find((user) => user.email === INITIAL_ADMIN_EMAIL);

    assert.throws(() => appData.deleteUser(admin.id), /geschuetzte lokale Benutzer/i);
    assert.throws(() => appData.setUserActive(admin.id, false), /geschuetzte lokale Benutzer/i);
  } finally {
    cleanup();
  }
});

test('app data verifies password hashes and rejects malformed hashes', () => {
  const hash = createPasswordHash('lokal-test-passwort');
  const saltedHash = createPasswordHash('lokal-test-passwort', 'test-salt');

  assert.equal(verifyPassword('lokal-test-passwort', hash), true);
  assert.equal(verifyPassword('lokal-test-passwort', saltedHash), true);
  assert.equal(verifyPassword('anderes-passwort', hash), false);
  assert.equal(verifyPassword('lokal-test-passwort', 'klartext'), false);
  assert.equal(verifyPassword('lokal-test-passwort', 'pbkdf2-sha256$10$salt$hash'), false);
  assert.equal(verifyPassword('lokal-test-passwort', 'anderer$120000$salt$hash'), false);
  assert.equal(verifyPassword('lokal-test-passwort', 'pbkdf2-sha256$abc$salt$hash'), false);
});

test('app data updates the current local profile without exposing password hashes', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
    const session = appData.getCurrentSession();
    const updated = appData.saveUserProfile(session.user.id, {
      displayName: 'Admin Demo',
      organizationName: 'Ploglan Test'
    });

    assert.equal(updated.user.displayName, 'Admin Demo');
    assert.equal(updated.user.passwordHash, undefined);
    assert.equal(updated.profile.organizationName, 'Ploglan Test');
    assert.equal(appData.listUsers().find((user) => user.id === session.user.id).displayName, 'Admin Demo');
  } finally {
    cleanup();
  }
});

test('app data can change a local password only with old password and confirmation', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD);
    const session = appData.getCurrentSession();

    assert.throws(() => appData.changePassword(session.user.id, 'falsch', 'neuesPasswort1', 'neuesPasswort1'), /alte Passwort/i);
    assert.throws(() => appData.changePassword(session.user.id, INITIAL_ADMIN_PASSWORD, 'kurz', 'kurz'), /mindestens 8/);
    assert.throws(() => appData.changePassword(session.user.id, INITIAL_ADMIN_PASSWORD, 'neuesPasswort1', 'anders'), /Passwortbestaetigung/);
    assert.equal(appData.changePassword(session.user.id, INITIAL_ADMIN_PASSWORD, 'neuesPasswort1', 'neuesPasswort1'), true);
    appData.logout();

    assert.equal(appData.login(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD).authenticated, false);
    assert.equal(appData.login(INITIAL_ADMIN_EMAIL, 'neuesPasswort1').authenticated, true);
  } finally {
    cleanup();
  }
});

test('app data protects the last admin but can deactivate and delete normal users', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();
    const now = new Date().toISOString();
    const users = appData.listUsers();
    const normalUser = {
      id: 'local-user',
      email: 'user@example.test',
      displayName: 'User',
      passwordHash: createPasswordHash('user-password'),
      roles: ['Dozent'],
      isProtected: false,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    fs.writeFileSync(appData.usersPath, JSON.stringify([...users, normalUser], null, 2));
    fs.writeFileSync(appData.profilesPath, JSON.stringify([
      ...appData.listProfiles(),
      {
        id: 'local-user-profile',
        userId: 'local-user',
        firstName: 'Demo',
        lastName: 'User',
        organizationName: 'Test',
        avatar: '',
        settings: {},
        createdAt: now,
        updatedAt: now
      }
    ], null, 2));

    assert.equal(appData.setUserActive('local-user', false), true);
    assert.equal(appData.listUsers().find((user) => user.id === 'local-user').isActive, false);
    assert.equal(appData.deleteUser('local-user'), true);
    assert.equal(appData.listUsers().some((user) => user.id === 'local-user'), false);
    assert.throws(() => appData.assertAuthenticated(), /Login erforderlich/);
  } finally {
    cleanup();
  }
});

test('app data covers local auth error branches and admin repair paths', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();
    const admin = appData.listUsers().find((user) => user.email === INITIAL_ADMIN_EMAIL);
    fs.writeFileSync(appData.usersPath, JSON.stringify([{
      ...admin,
      roles: [],
      isProtected: false,
      isActive: false,
      updatedAt: ''
    }], null, 2));
    fs.writeFileSync(appData.profilesPath, JSON.stringify([], null, 2));

    const repaired = appData.ensureProtectedAdmin();
    const repairedAdmin = appData.listUsers().find((user) => user.email === INITIAL_ADMIN_EMAIL);
    assert.equal(repaired.email, INITIAL_ADMIN_EMAIL);
    assert.equal(repairedAdmin.roles.includes('Admin'), true);
    assert.equal(repairedAdmin.isProtected, true);
    assert.equal(repairedAdmin.isActive, true);
    assert.equal(appData.listProfiles().some((profile) => profile.userId === repaired.id), true);

    assert.equal(appData.login(INITIAL_ADMIN_EMAIL, 'falsch').authenticated, false);
    assert.equal(appData.deleteUser('fehlt'), false);
    assert.equal(appData.setUserActive('fehlt', false), false);
    assert.throws(() => appData.saveUserProfile('fehlt', {}), /nicht gefunden/);
    assert.throws(() => appData.changePassword('fehlt', 'alt', 'neuesPasswort1', 'neuesPasswort1'), /alte Passwort|nicht korrekt/);
  } finally {
    cleanup();
  }
});

test('app data can disable history file creation for wizard tests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-app-data-'));
  const appData = createAppData(dir, { disableHistory: true });

  try {
    appData.ensureDataFiles();

    assert.equal(fs.existsSync(appData.settingsPath), true);
    assert.equal(fs.existsSync(appData.historyPath), false);
    assert.deepEqual(appData.listHistory(), []);
    assert.deepEqual(appData.addHistoryEntry({ title: 'Test' }), []);
    assert.deepEqual(appData.resetHistory(), []);
    assert.equal(fs.existsSync(appData.historyPath), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('app data saves setup without losing existing settings', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ monitorIndex: 2 });
    const settings = appData.saveSettings({ openTeacherOnSecondMonitor: false });

    assert.deepEqual(settings, {
      configured: true,
      courseSetupStartedAt: '',
      courseSetupCompletedAt: settings.courseSetupCompletedAt,
      courseBreaksEditableUntil: '',
      monitorIndex: 2,
      openTeacherOnSecondMonitor: false,
      saveLocalTestReports: true,
      includeDeviceNetworkData: false,
      teacherLanguage: 'de',
      participantLanguage: 'de',
      breaks: [],
      teacherProfile: {
        displayName: 'Dozent',
        email: '',
        avatarDataUrl: ''
      },
      courseSettingsByCourseId: defaultSettings.courseSettingsByCourseId
    });
    assert.match(settings.courseSetupCompletedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    cleanup();
  }
});

test('app data adds newest history entries first and keeps a maximum of 500 entries', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    for (let index = 0; index < 505; index += 1) {
      appData.addHistoryEntry(
        { type: 'lesson', title: `Eintrag ${index}` },
        new Date(2026, 0, 1, 12, 0, index)
      );
    }

    const history = appData.listHistory();
    assert.equal(history.length, 500);
    assert.equal(history[0].title, 'Eintrag 504');
    assert.equal(history[499].title, 'Eintrag 5');
  } finally {
    cleanup();
  }
});

test('app data resets only history and keeps settings untouched', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ monitorIndex: 1 });
    appData.addHistoryEntry({ type: 'teacher-info', title: 'Dozenteninfo' });
    appData.resetHistory();

    assert.deepEqual(appData.listHistory(), []);
    assert.deepEqual(appData.getSettings(), {
      configured: true,
      courseSetupStartedAt: '',
      courseSetupCompletedAt: appData.getSettings().courseSetupCompletedAt,
      courseBreaksEditableUntil: '',
      monitorIndex: 1,
      openTeacherOnSecondMonitor: true,
      saveLocalTestReports: true,
      includeDeviceNetworkData: false,
      teacherLanguage: 'de',
      participantLanguage: 'de',
      breaks: [],
      teacherProfile: {
        displayName: 'Dozent',
        email: '',
        avatarDataUrl: ''
      },
      courseSettingsByCourseId: defaultSettings.courseSettingsByCourseId
    });
  } finally {
    cleanup();
  }
});

test('course setup starts on first course open and keeps breaks editable for 24 hours', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const start = new Date('2026-07-07T08:00:00.000Z');
    const setup = appData.markCourseSetupStarted(start);
    const settings = appData.getSettings();

    assert.equal(setup.startedNow, true);
    assert.equal(settings.configured, false);
    assert.equal(settings.courseSetupStartedAt, start.toISOString());
    assert.equal(settings.courseBreaksEditableUntil, new Date(start.getTime() + COURSE_BREAK_EDIT_WINDOW_MS).toISOString());
    assert.equal(appData.getCourseSetupState(new Date('2026-07-08T07:59:00.000Z')).breakEditingAllowed, true);
    assert.equal(appData.getCourseSetupState(new Date('2026-07-08T08:01:00.000Z')).breakEditingAllowed, false);

    const secondOpen = appData.markCourseSetupStarted(new Date('2026-07-07T09:00:00.000Z'));
    assert.equal(secondOpen.startedNow, false);
    assert.equal(secondOpen.settings.courseSetupStartedAt, start.toISOString());
  } finally {
    cleanup();
  }
});

test('app data preserves stored breaks after the 24 hour course edit window', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const start = new Date('2026-07-07T08:00:00.000Z');
    appData.markCourseSetupStarted(start);
    const saved = appData.saveSettings({
      breaks: [
        { label: 'Vormittag', start: '10:00', end: '10:15' }
      ]
    }, { now: new Date('2026-07-07T09:00:00.000Z') });
    const afterLock = appData.saveSettings({
      breaks: [
        { label: 'Zu spaet', start: '10:00', end: '10:30' }
      ]
    }, { now: new Date('2026-07-08T09:00:00.000Z') });

    assert.deepEqual(saved.breaks, [
      { id: 'custom-break-1', label: 'Vormittag', start: '10:00', end: '10:15' }
    ]);
    assert.deepEqual(afterLock.breaks, saved.breaks);
  } finally {
    cleanup();
  }
});

test('app data stores valid custom breaks and rejects over-limit schedules', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const validSettings = appData.saveSettings({
      breaks: [
        { label: 'Vormittag', start: '10:00', end: '10:15' },
        { label: 'Mittag', start: '11:45', end: '12:45' }
      ]
    });

    assert.deepEqual(validSettings.breaks, [
      { id: 'custom-break-1', label: 'Vormittag', start: '10:00', end: '10:15' },
      { id: 'custom-break-2', label: 'Mittag', start: '11:45', end: '12:45' }
    ]);

    const overLimitSettings = appData.saveSettings({
      breaks: [
        { label: 'Zu lang', start: '10:00', end: '11:16' }
      ]
    });

    assert.deepEqual(overLimitSettings.breaks, []);
  } finally {
    cleanup();
  }
});

test('break normalization keeps only complete valid schedules', () => {
  assert.deepEqual(normalizeBreaks(null), []);
  assert.deepEqual(normalizeBreaks({ start: '10:00', end: '10:15' }), []);
  assert.deepEqual(normalizeBreaks([{ end: '10:15' }]), []);
  assert.deepEqual(normalizeBreaks([{ start: '10:00' }]), []);
  assert.deepEqual(normalizeBreaks([{ start: '10:00', end: '10:00' }]), []);
  assert.deepEqual(normalizeBreaks([{ start: '99:00', end: '10:15' }]), []);
  assert.deepEqual(normalizeBreaks([{ start: '10:00', end: '11:16' }]), []);
  assert.deepEqual(normalizeBreaks([{ start: '10:00', end: '10:15' }]), [
    { id: 'custom-break-1', label: 'Pause 1', start: '10:00', end: '10:15' }
  ]);
  assert.deepEqual(normalizeBreaks([
    { label: 'Gueltig', start: '10:00', end: '10:15' },
    { label: 'Ungueltig', start: '10:30', end: '10:20' }
  ]), [
    { id: 'custom-break-1', label: 'Gueltig', start: '10:00', end: '10:15' }
  ]);
  assert.deepEqual(normalizeBreaks([{ id: 'b1', label: '', start: '10:00', end: '10:15' }]), [
    { id: 'b1', label: 'Pause 1', start: '10:00', end: '10:15' }
  ]);
});

test('app data stores teacher profile settings with defaults', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const defaults = appData.saveSettings();
    const settings = appData.saveSettings({
      teacherProfile: {
        displayName: 'Florian Schaffer',
        email: 'florian@example.test',
        avatarDataUrl: 'data:image/png;base64,abc'
      }
    });
    const persisted = appData.getSettings();

    assert.equal(defaults.configured, true);
    assert.deepEqual(defaults.teacherProfile, defaultSettings.teacherProfile);
    assert.deepEqual(settings.teacherProfile, {
      displayName: 'Florian Schaffer',
      email: 'florian@example.test',
      avatarDataUrl: 'data:image/png;base64,abc'
    });
    assert.deepEqual(persisted.teacherProfile, settings.teacherProfile);
  } finally {
    cleanup();
  }
});

test('app data stores teacher and participant language settings with fallback', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const saved = appData.saveSettings({
      teacherLanguage: 'en',
      participantLanguage: 'tr'
    });
    const fallback = appData.saveSettings({
      teacherLanguage: 'fr',
      participantLanguage: 'xx'
    });

    assert.equal(saved.teacherLanguage, 'en');
    assert.equal(saved.participantLanguage, 'tr');
    assert.equal(fallback.teacherLanguage, 'de');
    assert.equal(fallback.participantLanguage, 'de');
  } finally {
    cleanup();
  }
});

test('app data saves referenced json and html test reports', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ includeDeviceNetworkData: true });
    const report = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-01',
        network: [{ name: 'Ethernet', address: '192.168.1.10', mac: 'aa:bb:cc:dd:ee:ff' }]
      },
      results: {
        status: 'ok',
        checks: [{ name: 'Start', status: 'ok', details: 'Workshop geprueft' }]
      }
    }, new Date('2026-07-01T12:30:00.000Z'));

    assert.equal(fs.existsSync(report.paths.json), true);
    assert.equal(fs.existsSync(report.paths.html), true);

    const json = JSON.parse(fs.readFileSync(report.paths.json, 'utf8'));
    const html = fs.readFileSync(report.paths.html, 'utf8');

    assert.equal(json.files.json, path.basename(report.paths.json));
    assert.equal(json.files.html, path.basename(report.paths.html));
    assert.match(html, new RegExp(path.basename(report.paths.json)));
    assert.match(html, new RegExp(path.basename(report.paths.html)));
    assert.equal(json.device.network[0].mac, 'aa:bb:cc:dd:ee:ff');
    assert.equal(appData.listTestReports().length, 1);
  } finally {
    cleanup();
  }
});

test('app data omits network identifiers from test reports unless enabled', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const report = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-02',
        network: [{ name: 'WLAN', address: '10.0.0.15', mac: '11:22:33:44:55:66' }]
      },
      results: {
        status: 'ok',
        checks: []
      }
    }, new Date('2026-07-01T12:35:00.000Z'));

    const json = JSON.parse(fs.readFileSync(report.paths.json, 'utf8'));

    assert.deepEqual(json.device.network, []);

    appData.saveSettings({ includeDeviceNetworkData: true });
    const reportWithoutNetwork = appData.saveTestReport({
      device: { hostname: 'CLIENT-03' },
      results: { status: 'ok', checks: [] }
    }, new Date('2026-07-01T12:36:00.000Z'));
    const jsonWithoutNetwork = JSON.parse(fs.readFileSync(reportWithoutNetwork.paths.json, 'utf8'));

    assert.deepEqual(jsonWithoutNetwork.device.network, []);
  } finally {
    cleanup();
  }
});

test('app data sorts test reports newest first and escapes html content', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ includeDeviceNetworkData: true });
    appData.saveTestReport({
      device: {
        hostname: 'CLIENT <A> & "B"',
        network: [{ name: 'LAN <1>', address: '10.0.0.1', mac: 'aa:bb' }]
      },
      results: {
        status: 'ok',
        checks: [{ name: 'Check <1>', status: 'ok', details: 'A & B "C"' }]
      }
    }, new Date('2026-07-01T12:00:00.000Z'));
    const newer = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-NEW',
        network: [{ name: 'LAN 2', address: '10.0.0.2', mac: 'cc:dd' }]
      },
      results: {
        status: 'warnung',
        checks: [{ name: 'Neu', status: 'warnung', details: 'Spaeter erstellt' }]
      }
    }, new Date('2026-07-01T13:00:00.000Z'));

    const reports = appData.listTestReports();
    const oldHtml = fs.readFileSync(path.join(appData.testReportsDir, reports[1].files.html), 'utf8');

    assert.equal(reports.length, 2);
    assert.equal(reports[0].id, newer.id);
    assert.match(oldHtml, /CLIENT &lt;A&gt; &amp; &quot;B&quot;/);
    assert.match(oldHtml, /Check &lt;1&gt;/);
    assert.match(oldHtml, /A &amp; B &quot;C&quot;/);
  } finally {
    cleanup();
  }
});

test('app data creates a minimal test report with fallback values', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const report = appData.saveTestReport({}, new Date('2026-07-01T14:00:00.000Z'));
    const json = JSON.parse(fs.readFileSync(report.paths.json, 'utf8'));
    const html = fs.readFileSync(report.paths.html, 'utf8');

    assert.equal(json.device.hostname, 'Nicht erfasst');
    assert.deepEqual(json.device.network, []);
    assert.equal(json.results.status, 'ok');
    assert.deepEqual(json.results.checks, []);
    assert.match(html, /Nicht im Bericht enthalten/);
  } finally {
    cleanup();
  }
});

test('app data keeps report html readable when network fields are incomplete', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveSettings({ includeDeviceNetworkData: true });
    const report = appData.saveTestReport({
      device: {
        hostname: 'CLIENT-03',
        network: [{ name: 'LAN ohne Werte' }]
      },
      results: {
        status: 'ok',
        checks: [{ name: 'Optionaler Check', status: 'ok' }]
      }
    }, new Date('2026-07-01T14:30:00.000Z'));
    const html = fs.readFileSync(report.paths.html, 'utf8');

    assert.match(html, /LAN ohne Werte/);
    assert.match(html, /<td>-<\/td><td>-<\/td>/);
    assert.match(html, /Optionaler Check/);
  } finally {
    cleanup();
  }
});

test('app data stores participant releases and writes participant script', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.ensureDataFiles();
    assert.deepEqual(appData.getParticipantReleases(), defaultParticipantReleases);

    const releases = appData.saveParticipantReleases({
      tag_02: true,
      tool_quiz: true,
      tool_tags: false,
      unknown_key: true
    });
    appData.saveSettings({ participantLanguage: 'en' });
    const unchangedReleases = appData.saveParticipantReleases(null);
    const scriptPath = path.join(appData.dataDir, 'freigaben.js');
    const defaultScriptPath = path.join(appData.dataDir, 'freigaben-default.js');

    appData.writeParticipantReleaseScript(scriptPath, releases);
    appData.writeParticipantReleaseScript(defaultScriptPath);
    const script = fs.readFileSync(scriptPath, 'utf8');
    const defaultScript = fs.readFileSync(defaultScriptPath, 'utf8');

    assert.equal(releases.tag_01, false);
    assert.equal(releases.tag_02, true);
    assert.equal(releases.tag_01_task_html_css_tag_overview, false);
    assert.equal(releases.tag_02_task_wunderland_hero_button, false);
    assert.equal(releases.tag_01_task_wunderland_custom_properties, false);
    assert.equal(releases.tag_04_task_akkordeon_responsive, false);
    assert.equal(releases.tool_quiz, true);
    assert.equal(releases.tool_tags, false);
    assert.equal(releases.unknown_key, true);
    assert.equal(unchangedReleases.tag_02, true);
    assert.match(script, /window\.LFZQ8A_PARTICIPANT_RELEASES/);
    assert.match(script, /window\.LFZQ8A_PARTICIPANT_LANGUAGE = "en"/);
    assert.match(script, /"tag_02": true/);
    assert.match(defaultScript, /"tool_quiz": true/);
  } finally {
    cleanup();
  }
});

test('app data stores task and solution releases separately', () => {
  const { appData, cleanup } = createTempAppData();
  const task = taskPackageRegistry.tasks[0];

  try {
    appData.ensureDataFiles();

    assert.deepEqual(appData.getTaskReleases()[task.id], defaultTaskReleases[task.id]);

    let releases = appData.saveTaskRelease(task.id, { taskUnlocked: true });
    assert.equal(releases[task.id].taskUnlocked, true);
    assert.equal(releases[task.id].solutionUnlocked, false);

    releases = appData.saveTaskRelease(task.id, { solutionUnlocked: true });
    assert.equal(releases[task.id].taskUnlocked, true);
    assert.equal(releases[task.id].solutionUnlocked, true);

    const persisted = createAppData(path.dirname(appData.dataDir)).getTaskReleases();
    assert.equal(persisted[task.id].taskUnlocked, true);
    assert.equal(persisted[task.id].solutionUnlocked, true);
  } finally {
    cleanup();
  }
});

test('app data supports task release bulk updates and reset', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const releases = appData.bulkUpdateTaskReleases(
      { project: 'akkordeon', packageType: 'zusatzaufgaben', day: 1, difficulty: 'normal' },
      { taskUnlocked: true }
    );
    const affectedTasks = taskPackageRegistry.tasks.filter((task) => (
      task.project === 'akkordeon'
      && task.packageType === 'zusatzaufgaben'
      && task.day === 1
      && task.difficulty === 'normal'
    ));

    assert.equal(affectedTasks.length, 5);
    affectedTasks.forEach((task) => {
      assert.equal(releases[task.id].taskUnlocked, true);
      assert.equal(releases[task.id].solutionUnlocked, false);
    });

    const solutionReleases = appData.bulkUpdateTaskReleases(
      { project: 'akkordeon', packageType: 'zusatzaufgaben', day: 1 },
      { solutionUnlocked: true }
    );
    affectedTasks.forEach((task) => {
      assert.equal(solutionReleases[task.id].solutionUnlocked, true);
    });

    appData.resetTaskReleases();
    const generalReleases = appData.bulkUpdateTaskReleases(
      { category: 'allgemein', day: 1 },
      { taskUnlocked: true }
    );
    const generalTasks = taskPackageRegistry.tasks.filter((task) => task.category === 'allgemein' && task.day === 1);
    const projectTasks = taskPackageRegistry.tasks.filter((task) => task.category === 'projekt' && task.day === 1);
    assert.equal(generalTasks.length > 0, true);
    assert.equal(generalTasks.every((task) => generalReleases[task.id].taskUnlocked), true);
    assert.equal(projectTasks.every((task) => !generalReleases[task.id].taskUnlocked), true);

    const reset = appData.resetTaskReleases();
    affectedTasks.forEach((task) => {
      assert.equal(reset[task.id].taskUnlocked, false);
      assert.equal(reset[task.id].solutionUnlocked, false);
    });
  } finally {
    cleanup();
  }
});

test('app data ignores invalid task release ids and can bulk update all tasks', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const unchanged = appData.saveTaskRelease('does-not-exist', { taskUnlocked: true });
    assert.equal(Object.values(unchanged).some((release) => release.taskUnlocked), false);

    const allReleased = appData.bulkUpdateTaskReleases({}, {
      taskUnlocked: true,
      solutionUnlocked: true
    });
    assert.equal(Object.keys(allReleased).length, taskPackageRegistry.tasks.length);
    assert.equal(Object.values(allReleased).every((release) => release.taskUnlocked && release.solutionUnlocked), true);

    const onlyTasksLocked = appData.bulkUpdateTaskReleases({}, { taskUnlocked: false });
    assert.equal(Object.values(onlyTasksLocked).every((release) => !release.taskUnlocked && release.solutionUnlocked), true);
  } finally {
    cleanup();
  }
});

test('app data stores participant profiles and progress', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const profile = appData.saveParticipantProfile({
      participantId: 'tn-1',
      displayName: 'Max Mueller',
      shortName: 'MM',
      email: 'max@example.test',
      teamsName: 'Max M.'
    }, new Date('2026-07-01T10:00:00.000Z'));
    const progress = appData.updateParticipantProgress('tn-1', {
      currentTask: 'Akkordeon Aufgabe 3',
      progress: 55,
      state: 'in Bearbeitung',
      needsHelp: true
    }, new Date('2026-07-01T10:05:00.000Z'));

    assert.equal(profile.participantId, 'tn-1');
    assert.equal(progress.status.currentTask, 'Akkordeon Aufgabe 3');
    assert.equal(progress.status.progress, 55);
    assert.equal(progress.status.needsHelp, true);
    assert.equal(appData.updateParticipantProgress('fehlt', {}, new Date('2026-07-01T10:06:00.000Z')), null);
    assert.equal(appData.listParticipants(new Date('2026-07-01T10:05:20.000Z'))[0].online, true);
    assert.equal(appData.listParticipants(new Date('2026-07-01T10:06:00.000Z'))[0].online, false);
  } finally {
    cleanup();
  }
});

test('app data keeps participant defaults and progress fallbacks stable', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const generated = appData.saveParticipantProfile(null, new Date('2026-07-01T11:00:00.000Z'));
    const refreshed = appData.saveParticipantProfile({
      participantId: generated.participantId,
      displayName: ''
    }, new Date('2026-07-01T11:01:00.000Z'));
    const clamped = appData.updateParticipantProgress(generated.participantId, {
      progress: 150
    }, new Date('2026-07-01T11:02:00.000Z'));
    const fallback = appData.updateParticipantProgress(generated.participantId, null, new Date('2026-07-01T11:03:00.000Z'));

    fs.writeFileSync(appData.participantsPath, JSON.stringify([{ participantId: 'tn-alt', displayName: 'Alt' }]), 'utf8');
    const legacyFallback = appData.updateParticipantProgress('tn-alt', {}, new Date('2026-07-01T11:04:00.000Z'));

    assert.match(generated.participantId, /^tn-/);
    assert.equal(refreshed.displayName, 'Teilnehmer');
    assert.equal(clamped.status.progress, 100);
    assert.equal(fallback.status.currentTask, '');
    assert.equal(fallback.status.state, 'online');
    assert.equal(legacyFallback.status.currentTask, '');
    assert.equal(legacyFallback.status.progress, 0);
    assert.equal(legacyFallback.status.state, 'online');
    assert.equal(appData.listParticipants(new Date('2026-07-01T11:05:00.000Z'))[0].online, false);
  } finally {
    cleanup();
  }
});

test('app data refreshes participant profiles without losing existing optional fields', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const initial = appData.saveParticipantProfile({
      participantId: 'tn-2',
      displayName: 'Erika Muster',
      shortName: 'EM',
      email: 'erika@example.test',
      teamsName: 'Erika M.',
      avatarDataUrl: 'data:image/png;base64,abc'
    }, new Date('2026-07-01T12:00:00.000Z'));
    const refreshed = appData.saveParticipantProfile({
      participantId: 'tn-2',
      displayName: 'Erika Aktualisiert'
    }, new Date('2026-07-01T12:05:00.000Z'));

    assert.equal(initial.joinedAt, refreshed.joinedAt);
    assert.equal(refreshed.displayName, 'Erika Aktualisiert');
    assert.equal(refreshed.shortName, 'EM');
    assert.equal(refreshed.email, 'erika@example.test');
    assert.equal(refreshed.teamsName, 'Erika M.');
    assert.equal(refreshed.avatarDataUrl, 'data:image/png;base64,abc');
    assert.equal(appData.listParticipants(new Date('2026-07-01T12:05:20.000Z'))[0].online, true);
  } finally {
    cleanup();
  }
});

test('app data clamps low progress and keeps previous progress on invalid input', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    appData.saveParticipantProfile({ participantId: 'tn-3' }, new Date('2026-07-01T13:00:00.000Z'));
    const negative = appData.updateParticipantProgress('tn-3', {
      progress: -10,
      state: '',
      needsHelp: false
    }, new Date('2026-07-01T13:01:00.000Z'));
    const invalid = appData.updateParticipantProgress('tn-3', {
      progress: 'kein-wert',
      currentTask: '',
      state: ''
    }, new Date('2026-07-01T13:02:00.000Z'));

    assert.equal(negative.status.progress, 0);
    assert.equal(negative.status.state, 'online');
    assert.equal(negative.status.needsHelp, false);
    assert.equal(invalid.status.progress, 0);
    assert.equal(invalid.status.currentTask, '');
  } finally {
    cleanup();
  }
});

test('app data ignores broken test report json files while listing reports', () => {
  const { appData, cleanup } = createTempAppData();

  try {
    const valid = appData.saveTestReport({
      results: {
        status: 'ok',
        checks: [{ name: 'Valide', status: 'ok' }]
      }
    }, new Date('2026-07-01T15:00:00.000Z'));
    fs.writeFileSync(path.join(appData.testReportsDir, 'kaputt.json'), '{kaputt', 'utf8');

    const reports = appData.listTestReports();

    assert.equal(reports.length, 1);
    assert.equal(reports[0].id, valid.id);
  } finally {
    cleanup();
  }
});
