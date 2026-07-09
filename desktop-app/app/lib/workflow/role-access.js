function getRoles(session) {
  return session?.user?.roles || [];
}

function hasRole(session, role) {
  return getRoles(session).includes(role);
}

function isAdmin(session) {
  return hasRole(session, 'Admin') || hasRole(session, 'SuperAdmin');
}

function isCourseManager(session) {
  return hasRole(session, 'course_manager');
}

function isTeacher(session) {
  return hasRole(session, 'Dozent');
}

function isParticipant(session) {
  return hasRole(session, 'Teilnehmer');
}

function getAssignedModuleIds(session) {
  return Array.from(new Set([
    ...(session?.profile?.assignedModuleIds || []),
    ...(session?.courseContainerIds || [])
  ]));
}

function moduleAllowedForSession(module, session) {
  const allowedRoles = module.manifest.allowedRoles || [];
  return allowedRoles.length === 0 || allowedRoles.some((role) => hasRole(session, role));
}

function isAssignableModule(module) {
  return module.manifest.assignable === true && ['active', 'placeholder'].includes(module.manifest.status);
}

function getVisibleModuleManifestsForSession(session, staticModules, generatedContainers = []) {
  if (isAdmin(session)) {
    return staticModules
      .filter((module) => module.manifest.category === 'admin')
      .filter((module) => module.manifest.containerType === 'system')
      .filter((module) => module.manifest.assignable === false)
      .map((module) => module.manifest);
  }

  if (isCourseManager(session)) {
    return staticModules
      .filter((module) => module.manifest.id === 'course-management')
      .filter((module) => module.manifest.status === 'active')
      .map((module) => module.manifest);
  }

  if (isTeacher(session) || isParticipant(session)) {
    const assignedIds = new Set(getAssignedModuleIds(session));
    return [
      ...staticModules.filter((module) => assignedIds.has(module.manifest.id)),
      ...generatedContainers.filter((container) => (
        assignedIds.has(container.manifest.id)
        && container.manifest.visibleInLauncher === true
        && ['active', 'placeholder'].includes(container.manifest.status)
      ))
    ]
      .filter((module) => isAssignableModule(module))
      .filter((module) => moduleAllowedForSession(module, session))
      .map((module) => module.manifest);
  }

  return [];
}

function decideHtmlCssOpenMode(session) {
  if (isAdmin(session)) {
    return 'blocked';
  }
  const assignedIds = new Set(getAssignedModuleIds(session));
  if (!assignedIds.has('lfzq8a')) {
    return 'blocked';
  }
  if (isTeacher(session)) {
    return 'teacher-and-course';
  }
  if (isParticipant(session)) {
    return 'course-only';
  }
  return 'blocked';
}

function canOpenContentFactory(session) {
  return isAdmin(session);
}

function canSeeCourseSettings(session) {
  return isTeacher(session) && getAssignedModuleIds(session).includes('lfzq8a');
}

function getEmptyStateMessage(session) {
  if (isTeacher(session)) {
    return 'Fuer Ihr Dozentenprofil sind aktuell keine Kurse oder Tools freigeschaltet. Bitte wenden Sie sich an den Administrator.';
  }
  if (isParticipant(session)) {
    return 'Fuer Ihr Teilnehmerprofil sind aktuell keine Kurse oder Tools freigeschaltet. Bitte wenden Sie sich an den Administrator oder Ihre Kursleitung.';
  }
  return '';
}

module.exports = {
  getRoles,
  hasRole,
  isAdmin,
  isCourseManager,
  isTeacher,
  isParticipant,
  getAssignedModuleIds,
  isAssignableModule,
  moduleAllowedForSession,
  getVisibleModuleManifestsForSession,
  decideHtmlCssOpenMode,
  canOpenContentFactory,
  canSeeCourseSettings,
  getEmptyStateMessage
};
