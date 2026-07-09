const adminToolCategories = ['migration', 'import', 'generator', 'quiz', 'export', 'ai', 'test', 'diagnostics', 'user-admin'];

function isAdminSession(session) {
  const roles = session?.user?.roles || [];
  return roles.includes('Admin') || roles.includes('SuperAdmin');
}

function assertAdminSession(session) {
  if (!isAdminSession(session)) {
    throw new Error('Kein Zugriff: Admin-Rechte erforderlich.');
  }
  return session;
}

module.exports = {
  adminToolCategories,
  isAdminSession,
  assertAdminSession
};
