const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ensureDir, readJson, writeJson } = require('./json-store');
const { normalizeLanguage } = require('./i18n');
const taskPackageRegistry = require('./task-packages.json');

const INITIAL_ADMIN_EMAIL = 'admin@admin.de';
const INITIAL_ADMIN_PASSWORD = '$$Klaus2908$$';
const PROTECTED_ADMIN_ID = 'local-admin';
const STANDARD_PASSWORD = '$$Klaus2908$$';
const STANDARD_USERS = [
  {
    id: PROTECTED_ADMIN_ID,
    email: INITIAL_ADMIN_EMAIL,
    displayName: 'Lokaler Admin',
    roles: ['SuperAdmin', 'Admin'],
    isProtected: true,
    firstName: 'Lokaler',
    lastName: 'Admin'
  },
  {
    id: 'local-dozent',
    email: 'dozent@dozent.de',
    displayName: 'Dozent',
    roles: ['Dozent'],
    isProtected: false,
    firstName: 'Demo',
    lastName: 'Dozent'
  },
  {
    id: 'local-teilnehmer',
    email: 'tn@tn.de',
    displayName: 'Teilnehmer',
    roles: ['Teilnehmer'],
    isProtected: false,
    firstName: 'Demo',
    lastName: 'Teilnehmer'
  }
];
const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha256';
const PASSWORD_HASH_ITERATIONS = 100000;
const PASSWORD_HASH_KEY_LENGTH = 32;
const pendingRoleMap = {
  dozent: 'Dozent',
  teacher: 'Dozent',
  teilnehmer: 'Teilnehmer',
  participant: 'Teilnehmer'
};

const defaultSettings = {
  configured: false,
  courseSetupStartedAt: '',
  courseSetupCompletedAt: '',
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
  courseSettingsByCourseId: {
    'html-css': {
      courseId: 'html-css',
      courseName: 'HTML/CSS',
      startTime: '08:30',
      endTime: '16:30',
      monitorIndex: 1,
      courseViewMonitorIndex: 1,
      teacherViewMonitorIndex: 0,
      language: 'de',
      openTeacherOnSecondMonitor: true,
      breaks: [
        { id: 'pause-1', label: 'Pause 1', start: '10:00', end: '10:15' },
        { id: 'pause-2', label: 'Pause 2', start: '11:45', end: '12:15' },
        { id: 'pause-3', label: 'Pause 3', start: '13:45', end: '14:00' },
        { id: 'pause-4', label: 'Pause 4', start: '15:30', end: '15:45' }
      ]
    }
  }
};

const MAX_TOTAL_BREAK_MINUTES = 75;
const COURSE_BREAK_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('base64')) {
  const hash = crypto.pbkdf2Sync(
    String(password || ''),
    salt,
    PASSWORD_HASH_ITERATIONS,
    PASSWORD_HASH_KEY_LENGTH,
    'sha256'
  ).toString('base64');

  return `${PASSWORD_HASH_ALGORITHM}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== PASSWORD_HASH_ALGORITHM) {
    return false;
  }

  const [, iterationsText, salt, expectedHash] = parts;
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100000 || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.pbkdf2Sync(
    String(password || ''),
    salt,
    iterations,
    PASSWORD_HASH_KEY_LENGTH,
    'sha256'
  );
  const expectedBuffer = Buffer.from(expectedHash, 'base64');
  return actualHash.length === expectedBuffer.length && crypto.timingSafeEqual(actualHash, expectedBuffer);
}

function createStandardAccount(definition, now = new Date()) {
  const timestamp = now.toISOString();
  return {
    user: {
      id: definition.id,
      email: definition.email,
      displayName: definition.displayName,
      passwordHash: createPasswordHash(STANDARD_PASSWORD),
      roles: definition.roles,
      isProtected: definition.isProtected === true,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    profile: {
      id: `${definition.id}-profile`,
      userId: definition.id,
      firstName: definition.firstName || '',
      lastName: definition.lastName || '',
      organizationName: 'ueTool_asSaaS lokal',
      avatar: '',
      assignedModuleIds: [],
      settings: {},
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePendingRole(role) {
  return pendingRoleMap[String(role || '').trim().toLowerCase()] || null;
}

function pendingRoleKey(role) {
  const normalized = normalizePendingRole(role);
  return normalized === 'Dozent' ? 'dozent' : normalized === 'Teilnehmer' ? 'teilnehmer' : '';
}

function isAdminSession(session) {
  const roles = session?.user?.roles || [];
  return roles.includes('Admin') || roles.includes('SuperAdmin');
}

function parseTimeToMinutes(timeText) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(timeText || ''));
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return (hours * 60) + minutes;
}

function normalizeBreaks(breaksInput) {
  if (!Array.isArray(breaksInput)) {
    return [];
  }

  const normalizedBreaks = breaksInput
    .map((breakData, index) => {
      const start = String(breakData?.start || '').trim();
      const end = String(breakData?.end || '').trim();
      const startMinutes = parseTimeToMinutes(start);
      const endMinutes = parseTimeToMinutes(end);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return null;
      }
      const duration = endMinutes - startMinutes;
      return {
        id: String(breakData?.id || `custom-break-${index + 1}`),
        label: String(breakData?.label || `Pause ${index + 1}`).trim() || `Pause ${index + 1}`,
        start,
        end,
        duration
      };
    })
    .filter(Boolean);

  const totalMinutes = normalizedBreaks.reduce((sum, breakData) => sum + breakData.duration, 0);
  if (totalMinutes > MAX_TOTAL_BREAK_MINUTES) {
    return [];
  }

  return normalizedBreaks.map(({ duration, ...breakData }) => breakData);
}

function parseDateMs(value) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : null;
}

function isCourseBreakEditingAllowed(settings, now = new Date()) {
  const editableUntil = parseDateMs(settings?.courseBreaksEditableUntil);
  if (editableUntil === null) {
    return true;
  }
  return now.getTime() <= editableUntil;
}

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

const defaultParticipantReleases = {
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
  project_submission: false,
  tool_quiz: false,
  tool_tags: true,
  additional_tasks: false,
  ...Object.fromEntries(individualAssignmentReleaseKeys.map((key) => [key, false]))
};

const defaultTaskReleases = Object.fromEntries(
  taskPackageRegistry.tasks.map((task) => [task.id, {
    taskUnlocked: false,
    solutionUnlocked: false
  }])
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugDate(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function createTestReportHtml(report) {
  const checks = report.results.checks.map((check) => (
    `<tr><td>${escapeHtml(check.name)}</td><td>${escapeHtml(check.status)}</td><td>${escapeHtml(check.details || '')}</td></tr>`
  )).join('');
  const networkRows = report.device.network.length
    ? report.device.network.map((item) => (
      `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.address || '-')}</td><td>${escapeHtml(item.mac || '-')}</td></tr>`
    )).join('')
    : '<tr><td colspan="3">Nicht im Bericht enthalten.</td></tr>';

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>HTML/CSS Testprotokoll ${escapeHtml(report.createdAt)}</title>
  <style>
    body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#173248;background:#f3f8fb;line-height:1.5}
    header{background:#003964;color:#fff;padding:1.5rem}
    main{padding:1.5rem;display:grid;gap:1rem}
    section{background:#fff;border:1px solid #d8e8ee;border-radius:8px;padding:1rem}
    h1,h2{margin:.1rem 0 .6rem}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #d8e8ee;padding:.55rem;text-align:left;vertical-align:top}
    th{color:#003964}
    .status{display:inline-block;padding:.25rem .5rem;border-radius:999px;background:#e8fbff;color:#003964;font-weight:800}
    code{background:#eef8fb;padding:.15rem .35rem;border-radius:4px}
  </style>
</head>
<body>
  <header>
    <h1>HTML/CSS Testprotokoll</h1>
    <p>Erstellt am ${escapeHtml(report.createdAt)} - Status <span class="status">${escapeHtml(report.results.status)}</span></p>
  </header>
  <main>
    <section>
      <h2>Referenzen</h2>
      <p>JSON-Datei: <code>${escapeHtml(report.files.json)}</code></p>
      <p>HTML-Datei: <code>${escapeHtml(report.files.html)}</code></p>
    </section>
    <section>
      <h2>Testergebnisse</h2>
      <table><thead><tr><th>Pruefung</th><th>Status</th><th>Details</th></tr></thead><tbody>${checks}</tbody></table>
    </section>
    <section>
      <h2>Geraete- und Netzwerkdaten</h2>
      <p>Rechnername: ${escapeHtml(report.device.hostname)}</p>
      <table><thead><tr><th>Adapter</th><th>IP-Adresse</th><th>MAC-Adresse</th></tr></thead><tbody>${networkRows}</tbody></table>
    </section>
  </main>
</body>
</html>`;
}

function createAppData(baseDir, options = {}) {
  const disableHistory = options.disableHistory === true;
  const dataDir = path.join(baseDir, 'data');
  const settingsPath = path.join(dataDir, 'settings.json');
  const historyPath = path.join(dataDir, 'history.json');
  const participantReleasesPath = path.join(dataDir, 'participant-releases.json');
  const taskReleasesPath = path.join(dataDir, 'task-releases.json');
  const participantsPath = path.join(dataDir, 'participants.json');
  const usersPath = path.join(dataDir, 'users.json');
  const profilesPath = path.join(dataDir, 'profiles.json');
  const pendingRegistrationsPath = path.join(dataDir, 'pending-registrations.json');
  const sessionPath = path.join(dataDir, 'session.json');
  const testReportsDir = path.join(dataDir, 'testprotokolle');

  function ensureDataFiles() {
    ensureDir(dataDir);
    if (!readJson(settingsPath, null)) {
      writeJson(settingsPath, defaultSettings);
    }
    if (!disableHistory && !readJson(historyPath, null)) {
      writeJson(historyPath, []);
    }
    if (!readJson(participantReleasesPath, null)) {
      writeJson(participantReleasesPath, defaultParticipantReleases);
    }
    if (!readJson(taskReleasesPath, null)) {
      writeJson(taskReleasesPath, defaultTaskReleases);
    }
    if (!readJson(participantsPath, null)) {
      writeJson(participantsPath, []);
    }
    if (!readJson(pendingRegistrationsPath, null)) {
      writeJson(pendingRegistrationsPath, []);
    }
    ensureStandardUsers();
    if (!readJson(sessionPath, null)) {
      writeJson(sessionPath, { userId: '', loggedInAt: '' });
    }
  }

  function ensureProtectedAdmin(now = new Date()) {
    return ensureStandardUsers(now).find((user) => user.email === INITIAL_ADMIN_EMAIL);
  }

  function ensureStandardUsers(now = new Date()) {
    ensureDir(dataDir);
    let users = readJson(usersPath, []);
    let profiles = readJson(profilesPath, []);

    STANDARD_USERS.forEach((definition) => {
      const standardAccount = createStandardAccount(definition, now);
      const existing = users.find((user) => String(user.email || '').toLowerCase() === definition.email.toLowerCase());
      if (existing) {
        users = users.map((user) => {
          if (user.id !== existing.id) {
            return user;
          }
          const roles = definition.isProtected
            ? Array.from(new Set([...(user.roles || []), ...definition.roles]))
            : (Array.isArray(user.roles) && user.roles.length ? user.roles : definition.roles);
          return {
            ...user,
            id: user.id || definition.id,
            email: definition.email,
            displayName: user.displayName || definition.displayName,
            roles,
            isProtected: definition.isProtected === true ? true : user.isProtected === true,
            isActive: definition.isProtected === true ? true : user.isActive !== false,
            updatedAt: user.updatedAt || standardAccount.user.updatedAt
          };
        });
      } else {
        users = [standardAccount.user, ...users];
      }

      const actualUser = users.find((user) => String(user.email || '').toLowerCase() === definition.email.toLowerCase());
      const existingProfile = profiles.find((profile) => profile.userId === actualUser.id);
      if (existingProfile) {
        profiles = profiles.map((profile) => (
          profile.userId === actualUser.id
            ? {
              ...standardAccount.profile,
              ...profile,
              userId: actualUser.id,
              id: profile.id || `${actualUser.id}-profile`,
              assignedModuleIds: Array.isArray(profile.assignedModuleIds) ? profile.assignedModuleIds : []
            }
            : profile
        ));
      } else {
        profiles = [{ ...standardAccount.profile, userId: actualUser.id, id: `${actualUser.id}-profile`, assignedModuleIds: [] }, ...profiles];
      }
    });

    writeJson(usersPath, users);
    writeJson(profilesPath, profiles);
    return users;
  }

  function getSettings() {
    ensureDataFiles();
    const settings = {
      ...defaultSettings,
      ...readJson(settingsPath, {})
    };
    const withCourseSettings = {
      ...settings,
      courseSettingsByCourseId: {
        ...defaultSettings.courseSettingsByCourseId,
        ...(settings.courseSettingsByCourseId || {})
      }
    };
    return {
      ...withCourseSettings,
      teacherLanguage: normalizeLanguage(withCourseSettings.teacherLanguage),
      participantLanguage: normalizeLanguage(withCourseSettings.participantLanguage),
      breaks: normalizeBreaks(withCourseSettings.breaks)
    };
  }

  function getCourseSettings(courseId = 'html-css') {
    const settings = getSettings();
    return settings.courseSettingsByCourseId?.[courseId] || defaultSettings.courseSettingsByCourseId['html-css'];
  }

  function saveCourseSettings(courseId = 'html-css', settingsInput = {}) {
    const settings = getSettings();
    const current = getCourseSettings(courseId);
    const nextCourseSettings = {
      ...current,
      ...settingsInput,
      courseId,
      courseName: courseId === 'html-css' ? 'HTML/CSS' : (settingsInput.courseName || current.courseName || courseId),
      breaks: normalizeBreaks(settingsInput.breaks || current.breaks)
    };
    const saved = saveSettings({
      courseSettingsByCourseId: {
        ...(settings.courseSettingsByCourseId || {}),
        [courseId]: nextCourseSettings
      }
    });
    return saved.courseSettingsByCourseId[courseId];
  }

  function listUsers() {
    ensureDataFiles();
    return readJson(usersPath, []);
  }

  function listProfiles() {
    ensureDataFiles();
    return readJson(profilesPath, []);
  }

  function listPendingRegistrations(session = null) {
    ensureDataFiles();
    if (session && !isAdminSession(session)) {
      throw new Error('Kein Zugriff: Admin-Rechte erforderlich.');
    }
    return readJson(pendingRegistrationsPath, []);
  }

  function findPendingRegistrationByEmailAndRole(email, role) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = normalizePendingRole(role);
    return listPendingRegistrations()
      .find((entry) => entry.email === normalizedEmail && entry.role === pendingRoleKey(normalizedRole)) || null;
  }

  function createPendingRegistration(adminSession, input = {}, now = new Date()) {
    ensureDataFiles();
    if (!isAdminSession(adminSession)) {
      throw new Error('Kein Zugriff: Admin-Rechte erforderlich.');
    }
    const name = String(input.name || input.displayName || '').trim();
    const email = normalizeEmail(input.email);
    const roleName = normalizePendingRole(input.role);
    const role = pendingRoleKey(roleName);
    if (!name) {
      throw new Error('Name ist erforderlich.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Gueltige E-Mail ist erforderlich.');
    }
    if (!role) {
      throw new Error('Nur Dozent oder Teilnehmer koennen vorgemerkt werden.');
    }
    if (listUsers().some((user) => normalizeEmail(user.email) === email)) {
      throw new Error('Fuer diese E-Mail-Adresse existiert bereits ein Benutzerkonto.');
    }
    const pendingRegistrations = listPendingRegistrations();
    const existing = pendingRegistrations.find((entry) => entry.email === email && entry.status === 'pending');
    if (existing) {
      throw new Error('Fuer diese E-Mail-Adresse existiert bereits eine offene Registrierungsfreigabe.');
    }
    const timestamp = now.toISOString();
    const entry = {
      id: `pre_${now.getTime()}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      email,
      role,
      status: 'pending',
      note: String(input.note || '').trim(),
      courseId: String(input.courseId || '').trim(),
      createdBy: normalizeEmail(adminSession.user?.email || ''),
      createdAt: timestamp,
      acceptedAt: null,
      registeredUserId: null
    };
    writeJson(pendingRegistrationsPath, [entry, ...pendingRegistrations]);
    return entry;
  }

  function revokePendingRegistration(adminSession, id, now = new Date()) {
    ensureDataFiles();
    if (!isAdminSession(adminSession)) {
      throw new Error('Kein Zugriff: Admin-Rechte erforderlich.');
    }
    const pendingRegistrations = listPendingRegistrations();
    const entry = pendingRegistrations.find((item) => item.id === id);
    if (!entry) {
      throw new Error('Registrierungsfreigabe wurde nicht gefunden.');
    }
    if (entry.status !== 'pending') {
      return entry;
    }
    const revoked = {
      ...entry,
      status: 'revoked',
      revokedAt: now.toISOString(),
      revokedBy: normalizeEmail(adminSession.user?.email || '')
    };
    writeJson(pendingRegistrationsPath, [
      revoked,
      ...pendingRegistrations.filter((item) => item.id !== id)
    ]);
    return revoked;
  }

  function canRegisterWithRole(email, role) {
    const normalizedEmail = normalizeEmail(email);
    const roleName = normalizePendingRole(role);
    const roleKey = pendingRoleKey(roleName);
    if (!roleKey) {
      return { allowed: false, error: 'Admin-Registrierung ist nicht erlaubt.' };
    }
    if (listUsers().some((user) => normalizeEmail(user.email) === normalizedEmail)) {
      return { allowed: false, error: 'Fuer diese E-Mail-Adresse existiert bereits ein Benutzerkonto.' };
    }
    const entries = listPendingRegistrations().filter((entry) => entry.email === normalizedEmail);
    const matching = entries.find((entry) => entry.role === roleKey);
    if (matching?.status === 'pending') {
      return { allowed: true, pendingRegistration: matching, role: roleName };
    }
    if (matching?.status === 'revoked') {
      return {
        allowed: false,
        error: 'Die Registrierungsfreigabe wurde widerrufen. Bitte wenden Sie sich an den Administrator.'
      };
    }
    if (entries.some((entry) => entry.status === 'pending')) {
      return { allowed: false, error: 'Diese E-Mail-Adresse ist nicht fuer diese Rolle freigegeben.' };
    }
    return {
      allowed: false,
      error: 'Fuer diese E-Mail-Adresse liegt keine Registrierungsfreigabe vor. Bitte wenden Sie sich an den Administrator.'
    };
  }

  function getCurrentSession() {
    ensureDataFiles();
    const session = readJson(sessionPath, { userId: '', loggedInAt: '' });
    const user = listUsers().find((entry) => entry.id === session.userId && entry.isActive !== false);
    if (!user) {
      return { authenticated: false, user: null, profile: null };
    }
    return {
      authenticated: true,
      loggedInAt: session.loggedInAt,
      user: sanitizeUser(user),
      profile: listProfiles().find((profile) => profile.userId === user.id) || null
    };
  }

  function login(email, password, now = new Date()) {
    ensureDataFiles();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = listUsers().find((entry) => String(entry.email || '').toLowerCase() === normalizedEmail);
    if (!user || user.isActive === false || !verifyPassword(password, user.passwordHash)) {
      return {
        authenticated: false,
        error: 'E-Mail oder Passwort ist falsch.'
      };
    }

    writeJson(sessionPath, {
      userId: user.id,
      loggedInAt: now.toISOString()
    });
    return getCurrentSession();
  }

  function registerUser(input = {}, now = new Date()) {
    ensureDataFiles();
    const email = normalizeEmail(input.email);
    const displayName = String(input.displayName || input.name || '').trim();
    const password = String(input.password || '');
    const confirmation = String(input.confirmation || input.passwordConfirmation || '');
    const requestedRole = String(input.role || 'Teilnehmer');
    const registrationCheck = canRegisterWithRole(email, requestedRole);
    const role = registrationCheck.role || normalizePendingRole(requestedRole);
    if (!displayName) {
      throw new Error('Name ist erforderlich.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Gueltige E-Mail ist erforderlich.');
    }
    if (requestedRole === 'Admin' || requestedRole === 'SuperAdmin') {
      throw new Error('Admin-Registrierung ist nicht erlaubt.');
    }
    if (!registrationCheck.allowed) {
      throw new Error(registrationCheck.error);
    }
    if (password.length < 8) {
      throw new Error('Das Passwort muss mindestens 8 Zeichen haben.');
    }
    if (password !== confirmation) {
      throw new Error('Die Passwortbestaetigung stimmt nicht.');
    }
    const timestamp = now.toISOString();
    const id = `local-user-${now.getTime()}-${crypto.randomBytes(4).toString('hex')}`;
    const user = {
      id,
      email,
      displayName,
      passwordHash: createPasswordHash(password),
      roles: [role],
      isProtected: false,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const profile = {
      id: `${id}-profile`,
      userId: id,
      firstName: displayName.split(/\s+/)[0] || displayName,
      lastName: displayName.split(/\s+/).slice(1).join(' '),
      organizationName: '',
      avatar: '',
      assignedModuleIds: [],
      settings: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
    writeJson(usersPath, [user, ...listUsers()]);
    writeJson(profilesPath, [profile, ...listProfiles()]);
    const pendingRegistrations = listPendingRegistrations();
    const accepted = {
      ...registrationCheck.pendingRegistration,
      name: registrationCheck.pendingRegistration.name || displayName,
      status: 'accepted',
      acceptedAt: timestamp,
      registeredUserId: id
    };
    writeJson(pendingRegistrationsPath, [
      accepted,
      ...pendingRegistrations.filter((entry) => entry.id !== registrationCheck.pendingRegistration.id)
    ]);
    writeJson(sessionPath, { userId: id, loggedInAt: timestamp });
    return getCurrentSession();
  }

  function logout() {
    ensureDataFiles();
    writeJson(sessionPath, { userId: '', loggedInAt: '' });
    return { authenticated: false, user: null, profile: null };
  }

  function assertAuthenticated() {
    const session = getCurrentSession();
    if (!session.authenticated) {
      throw new Error('Login erforderlich.');
    }
    return session;
  }

  function saveUserProfile(userId, profileInput = {}, now = new Date()) {
    ensureDataFiles();
    const users = listUsers();
    const profiles = listProfiles();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error('Benutzer wurde nicht gefunden.');
    }

    const displayName = String(profileInput.displayName || user.displayName || '').trim() || user.displayName;
    const organizationName = String(profileInput.organizationName || '').trim();
    const updatedAt = now.toISOString();
    const nextUsers = users.map((entry) => (
      entry.id === userId
        ? { ...entry, displayName, updatedAt }
        : entry
    ));
    const previousProfile = profiles.find((entry) => entry.userId === userId) || {
      id: `${userId}-profile`,
      userId,
      firstName: '',
      lastName: '',
      organizationName: '',
      avatar: '',
      assignedModuleIds: [],
      settings: {},
      createdAt: updatedAt
    };
    const nextProfile = {
      ...previousProfile,
      firstName: String(profileInput.firstName || previousProfile.firstName || '').trim(),
      lastName: String(profileInput.lastName || previousProfile.lastName || '').trim(),
      organizationName: organizationName || previousProfile.organizationName || '',
      avatar: profileInput.avatar || previousProfile.avatar || '',
      assignedModuleIds: Array.isArray(previousProfile.assignedModuleIds) ? previousProfile.assignedModuleIds : [],
      settings: {
        ...(previousProfile.settings || {}),
        ...(profileInput.settings || {})
      },
      updatedAt
    };
    writeJson(usersPath, nextUsers);
    writeJson(profilesPath, [
      nextProfile,
      ...profiles.filter((entry) => entry.userId !== userId)
    ]);
    return getCurrentSession();
  }

  function setAssignedModules(userId, moduleIds = [], now = new Date()) {
    ensureDataFiles();
    const profiles = listProfiles();
    const profile = profiles.find((entry) => entry.userId === userId);
    if (!profile) {
      throw new Error('Profil wurde nicht gefunden.');
    }
    const nextProfile = {
      ...profile,
      assignedModuleIds: Array.from(new Set((moduleIds || []).map(String).filter(Boolean))),
      updatedAt: now.toISOString()
    };
    writeJson(profilesPath, [
      nextProfile,
      ...profiles.filter((entry) => entry.userId !== userId)
    ]);
    return nextProfile;
  }

  function changePassword(userId, oldPassword, newPassword, confirmation, now = new Date()) {
    ensureDataFiles();
    const users = listUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
      throw new Error('Das alte Passwort ist nicht korrekt.');
    }
    if (!newPassword || String(newPassword).length < 8) {
      throw new Error('Das neue Passwort muss mindestens 8 Zeichen haben.');
    }
    if (newPassword !== confirmation) {
      throw new Error('Die Passwortbestaetigung stimmt nicht.');
    }
    writeJson(usersPath, users.map((entry) => (
      entry.id === userId
        ? { ...entry, passwordHash: createPasswordHash(newPassword), updatedAt: now.toISOString() }
        : entry
    )));
    return true;
  }

  function deleteUser(userId) {
    ensureDataFiles();
    const users = listUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      return false;
    }
    if (user.isProtected) {
      throw new Error('Geschuetzte lokale Benutzer koennen nicht geloescht werden.');
    }
    const remainingAdmins = users.filter((entry) => (
      entry.id !== userId
      && entry.isActive !== false
      && Array.isArray(entry.roles)
      && entry.roles.includes('Admin')
    ));
    if (remainingAdmins.length === 0) {
      throw new Error('Der letzte Admin kann nicht geloescht werden.');
    }
    writeJson(usersPath, users.filter((entry) => entry.id !== userId));
    writeJson(profilesPath, listProfiles().filter((profile) => profile.userId !== userId));
    return true;
  }

  function setUserActive(userId, isActive) {
    ensureDataFiles();
    const users = listUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      return false;
    }
    if (user.isProtected && isActive === false) {
      throw new Error('Geschuetzte lokale Benutzer koennen nicht deaktiviert werden.');
    }
    if (isActive === false) {
      const remainingAdmins = users.filter((entry) => (
        entry.id !== userId
        && entry.isActive !== false
        && Array.isArray(entry.roles)
        && entry.roles.includes('Admin')
      ));
      if (remainingAdmins.length === 0) {
        throw new Error('Der letzte Admin kann nicht deaktiviert werden.');
      }
    }
    writeJson(usersPath, users.map((entry) => (
      entry.id === userId ? { ...entry, isActive: isActive !== false, updatedAt: new Date().toISOString() } : entry
    )));
    return true;
  }

  function saveSettings(nextSettings = {}, options = {}) {
    const now = options.now || new Date();
    const currentSettings = getSettings();
    const nextHasBreaks = Object.prototype.hasOwnProperty.call(nextSettings || {}, 'breaks');
    const breakEditingAllowed = isCourseBreakEditingAllowed(currentSettings, now);
    const merged = {
      ...currentSettings,
      ...nextSettings,
      configured: true
    };
    if (nextHasBreaks && !breakEditingAllowed) {
      merged.breaks = currentSettings.breaks;
    }
    merged.teacherProfile = {
      ...defaultSettings.teacherProfile,
      ...currentSettings.teacherProfile,
      ...(nextSettings?.teacherProfile || {})
    };
    merged.teacherLanguage = normalizeLanguage(merged.teacherLanguage);
    merged.participantLanguage = normalizeLanguage(merged.participantLanguage);
    merged.breaks = normalizeBreaks(merged.breaks);
    if (merged.configured && !merged.courseSetupCompletedAt) {
      merged.courseSetupCompletedAt = now.toISOString();
    }
    writeJson(settingsPath, merged);
    return merged;
  }

  function markCourseSetupStarted(now = new Date()) {
    const settings = getSettings();
    if (settings.courseSetupStartedAt && settings.courseBreaksEditableUntil) {
      return {
        settings,
        startedNow: false,
        breakEditingAllowed: isCourseBreakEditingAllowed(settings, now),
        breakEditingRemainingMs: Math.max(0, (parseDateMs(settings.courseBreaksEditableUntil) || now.getTime()) - now.getTime())
      };
    }

    const startedAt = now.toISOString();
    const editableUntil = new Date(now.getTime() + COURSE_BREAK_EDIT_WINDOW_MS).toISOString();
    const nextSettings = {
      ...settings,
      courseSetupStartedAt: startedAt,
      courseBreaksEditableUntil: editableUntil
    };
    writeJson(settingsPath, nextSettings);
    return {
      settings: nextSettings,
      startedNow: true,
      breakEditingAllowed: true,
      breakEditingRemainingMs: COURSE_BREAK_EDIT_WINDOW_MS
    };
  }

  function getCourseSetupState(now = new Date()) {
    const settings = getSettings();
    const editableUntil = parseDateMs(settings.courseBreaksEditableUntil);
    return {
      started: Boolean(settings.courseSetupStartedAt),
      startedAt: settings.courseSetupStartedAt,
      completedAt: settings.courseSetupCompletedAt,
      breakEditingAllowed: isCourseBreakEditingAllowed(settings, now),
      breakEditingEditableUntil: settings.courseBreaksEditableUntil,
      breakEditingRemainingMs: editableUntil === null ? null : Math.max(0, editableUntil - now.getTime())
    };
  }

  function listHistory() {
    ensureDataFiles();
    if (disableHistory) {
      return [];
    }
    return readJson(historyPath, []);
  }

  function addHistoryEntry(entry, now = new Date()) {
    ensureDataFiles();
    if (disableHistory) {
      return [];
    }
    const history = listHistory();
    const nextHistory = [{
      id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
      createdAt: now.toISOString(),
      ...entry
    }, ...history].slice(0, 500);
    writeJson(historyPath, nextHistory);
    return nextHistory;
  }

  function resetHistory() {
    ensureDataFiles();
    if (disableHistory) {
      return [];
    }
    writeJson(historyPath, []);
    return [];
  }

  function getParticipantReleases() {
    ensureDataFiles();
    return {
      ...defaultParticipantReleases,
      ...readJson(participantReleasesPath, {})
    };
  }

  function saveParticipantReleases(nextReleases) {
    const merged = {
      ...getParticipantReleases(),
      ...Object.fromEntries(
        Object.entries(nextReleases || {}).map(([key, value]) => [key, value === true])
      )
    };
    writeJson(participantReleasesPath, merged);
    return merged;
  }

  function getTaskReleases() {
    ensureDataFiles();
    const stored = readJson(taskReleasesPath, {});
    return Object.fromEntries(taskPackageRegistry.tasks.map((task) => {
      const release = stored[task.id] || {};
      return [task.id, {
        taskUnlocked: release.taskUnlocked === true,
        solutionUnlocked: release.solutionUnlocked === true
      }];
    }));
  }

  function saveTaskRelease(taskId, releaseInput) {
    const current = getTaskReleases();
    if (!current[taskId]) {
      return current;
    }
    current[taskId] = {
      ...current[taskId],
      taskUnlocked: releaseInput.taskUnlocked === undefined ? current[taskId].taskUnlocked : releaseInput.taskUnlocked === true,
      solutionUnlocked: releaseInput.solutionUnlocked === undefined ? current[taskId].solutionUnlocked : releaseInput.solutionUnlocked === true
    };
    writeJson(taskReleasesPath, current);
    return current;
  }

  function bulkUpdateTaskReleases(filterInput = {}, valuesInput = {}) {
    const current = getTaskReleases();
    taskPackageRegistry.tasks
      .filter((task) => (
        (!filterInput.project || task.project === filterInput.project)
        && (!filterInput.category || task.category === filterInput.category)
        && (!filterInput.packageType || task.packageType === filterInput.packageType)
        && (!filterInput.day || task.day === Number(filterInput.day))
        && (!filterInput.difficulty || task.difficulty === filterInput.difficulty)
      ))
      .forEach((task) => {
        current[task.id] = {
          ...current[task.id],
          taskUnlocked: valuesInput.taskUnlocked === undefined ? current[task.id].taskUnlocked : valuesInput.taskUnlocked === true,
          solutionUnlocked: valuesInput.solutionUnlocked === undefined ? current[task.id].solutionUnlocked : valuesInput.solutionUnlocked === true
        };
      });
    writeJson(taskReleasesPath, current);
    return current;
  }

  function resetTaskReleases() {
    writeJson(taskReleasesPath, defaultTaskReleases);
    return getTaskReleases();
  }

  function writeParticipantReleaseScript(scriptPath, releases = getParticipantReleases()) {
    ensureDir(path.dirname(scriptPath));
    const content = [
      `window.LFZQ8A_PARTICIPANT_RELEASES = ${JSON.stringify(releases, null, 2)};`,
      `window.LFZQ8A_PARTICIPANT_LANGUAGE = ${JSON.stringify(getSettings().participantLanguage)};`,
      ''
    ].join('\n');
    fs.writeFileSync(scriptPath, content, 'utf8');
    return scriptPath;
  }

  function listParticipants(now = new Date()) {
    ensureDataFiles();
    const currentTime = now.getTime();
    return readJson(participantsPath, []).map((participant) => {
      const lastSeen = participant.lastSeenAt ? new Date(participant.lastSeenAt).getTime() : 0;
      return {
        ...participant,
        online: currentTime - lastSeen < 45000
      };
    });
  }

  function saveParticipantProfile(profileInput, now = new Date()) {
    ensureDataFiles();
    const existingParticipants = readJson(participantsPath, []);
    const profile = profileInput || {};
    const participantId = profile.participantId || `tn-${now.getTime()}-${Math.random().toString(16).slice(2)}`;
    const previous = existingParticipants.find((participant) => participant.participantId === participantId) || {};
    const nextParticipant = {
      participantId,
      displayName: profile.displayName || previous.displayName || 'Teilnehmer',
      shortName: profile.shortName || previous.shortName || '',
      email: profile.email || previous.email || '',
      teamsName: profile.teamsName || previous.teamsName || '',
      avatarDataUrl: profile.avatarDataUrl || previous.avatarDataUrl || '',
      joinedAt: previous.joinedAt || now.toISOString(),
      lastSeenAt: now.toISOString(),
      status: previous.status || {
        currentTask: '',
        progress: 0,
        state: 'online',
        needsHelp: false
      }
    };
    const nextParticipants = [
      nextParticipant,
      ...existingParticipants.filter((participant) => participant.participantId !== participantId)
    ];

    writeJson(participantsPath, nextParticipants);
    return nextParticipant;
  }

  function updateParticipantProgress(participantId, statusInput, now = new Date()) {
    ensureDataFiles();
    const existingParticipants = readJson(participantsPath, []);
    const previous = existingParticipants.find((participant) => participant.participantId === participantId);

    if (!previous) {
      return null;
    }

    const status = statusInput || {};
    const nextParticipant = {
      ...previous,
      lastSeenAt: now.toISOString(),
      status: {
        ...previous.status,
        currentTask: status.currentTask ?? previous.status?.currentTask ?? '',
        progress: Number.isFinite(Number(status.progress)) ? Math.max(0, Math.min(100, Number(status.progress))) : previous.status?.progress ?? 0,
        state: status.state || previous.status?.state || 'online',
        needsHelp: status.needsHelp === true
      }
    };
    const nextParticipants = existingParticipants.map((participant) => (
      participant.participantId === participantId ? nextParticipant : participant
    ));

    writeJson(participantsPath, nextParticipants);
    return nextParticipant;
  }

  function saveTestReport(reportInput, now = new Date()) {
    ensureDataFiles();
    ensureDir(testReportsDir);

    const id = `testlauf-${slugDate(now)}`;
    const jsonFileName = `${id}.json`;
    const htmlFileName = `${id}.html`;
    const settings = getSettings();
    const report = {
      id,
      createdAt: now.toISOString(),
      files: {
        json: jsonFileName,
        html: htmlFileName
      },
      device: {
        hostname: reportInput.device?.hostname || 'Nicht erfasst',
        network: settings.includeDeviceNetworkData ? (reportInput.device?.network || []) : []
      },
      results: {
        status: reportInput.results?.status || 'ok',
        checks: reportInput.results?.checks || []
      }
    };

    const jsonPath = path.join(testReportsDir, jsonFileName);
    const htmlPath = path.join(testReportsDir, htmlFileName);
    writeJson(jsonPath, report);
    fs.writeFileSync(htmlPath, createTestReportHtml(report), 'utf8');

    return {
      ...report,
      paths: {
        json: jsonPath,
        html: htmlPath
      }
    };
  }

  function listTestReports() {
    ensureDataFiles();
    ensureDir(testReportsDir);
    return fs.readdirSync(testReportsDir)
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => readJson(path.join(testReportsDir, fileName), null))
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  return {
    dataDir,
    settingsPath,
    historyPath,
    participantReleasesPath,
    taskReleasesPath,
    participantsPath,
    usersPath,
    profilesPath,
    sessionPath,
    testReportsDir,
    ensureDataFiles,
    ensureProtectedAdmin,
    ensureStandardUsers,
    listUsers,
    listProfiles,
    listPendingRegistrations,
    createPendingRegistration,
    revokePendingRegistration,
    findPendingRegistrationByEmailAndRole,
    canRegisterWithRole,
    getCurrentSession,
    login,
    registerUser,
    logout,
    assertAuthenticated,
    saveUserProfile,
    setAssignedModules,
    changePassword,
    deleteUser,
    setUserActive,
    getSettings,
    getCourseSettings,
    saveCourseSettings,
    saveSettings,
    markCourseSetupStarted,
    getCourseSetupState,
    listHistory,
    addHistoryEntry,
    resetHistory,
    getParticipantReleases,
    saveParticipantReleases,
    getTaskReleases,
    saveTaskRelease,
    bulkUpdateTaskReleases,
    resetTaskReleases,
    writeParticipantReleaseScript,
    listParticipants,
    saveParticipantProfile,
    updateParticipantProgress,
    saveTestReport,
    listTestReports
  };
}

module.exports = {
  createAppData,
  defaultSettings,
  INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_PASSWORD,
  STANDARD_PASSWORD,
  STANDARD_USERS,
  PASSWORD_HASH_ALGORITHM,
  createPasswordHash,
  verifyPassword,
  normalizeBreaks,
  isCourseBreakEditingAllowed,
  COURSE_BREAK_EDIT_WINDOW_MS,
  defaultParticipantReleases,
  defaultTaskReleases
};
