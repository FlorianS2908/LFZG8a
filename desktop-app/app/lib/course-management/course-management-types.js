const roles = ['participant', 'teacher', 'admin', 'course_manager'];
const departments = ['FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'];
const courseStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
const memberRoles = ['teacher', 'participant'];

function normalizeCourseId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasCourseManagerRights(session) {
  const userRoles = session?.user?.roles || [];
  return userRoles.includes('course_manager') || userRoles.includes('Admin') || userRoles.includes('SuperAdmin');
}

function hasAdminToolRights(session) {
  const userRoles = session?.user?.roles || [];
  return userRoles.includes('Admin') || userRoles.includes('SuperAdmin');
}

module.exports = {
  roles,
  departments,
  courseStatuses,
  memberRoles,
  normalizeCourseId,
  hasCourseManagerRights,
  hasAdminToolRights
};
