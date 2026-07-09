const { createCentralCourseStore } = require('./central-course-store');
const { CourseManagementRepository } = require('./course-management-repository');
const {
  departments,
  courseStatuses,
  memberRoles,
  normalizeCourseId,
  hasCourseManagerRights
} = require('./course-management-types');

function createCourseManagementService({ dataDir, moduleRegistry }) {
  const repository = new CourseManagementRepository(createCentralCourseStore(dataDir));

  function assertCourseManager(session) {
    if (!hasCourseManagerRights(session)) {
      throw new Error('Kein Zugriff: Kursverwaltung erforderlich.');
    }
    return session;
  }

  function activeAssignableContainers() {
    return moduleRegistry.getAllModules()
      .map((module) => module.manifest)
      .filter((manifest) => manifest.assignable === true)
      .filter((manifest) => ['course', 'tool', 'quiz', 'standalone'].includes(manifest.category))
      .filter((manifest) => ['active', 'placeholder'].includes(manifest.status));
  }

  function createCourseInstance(session, input = {}) {
    assertCourseManager(session);
    const state = repository.readState();
    const courseName = String(input.courseName || '').trim();
    const courseId = normalizeCourseId(input.courseId || courseName);
    const department = String(input.department || 'FIAE').toUpperCase();
    const status = input.status || 'draft';
    if (!courseName) {
      throw new Error('Kursname ist erforderlich.');
    }
    if (!courseId) {
      throw new Error('Kurs-ID ist erforderlich.');
    }
    if (!departments.includes(department)) {
      throw new Error('Ungueltiger Fachbereich.');
    }
    if (!courseStatuses.includes(status)) {
      throw new Error('Ungueltiger Kursstatus.');
    }
    if (state.course_instances.some((course) => course.courseId === courseId)) {
      throw new Error('Kurs-ID existiert bereits.');
    }
    const timestamp = new Date().toISOString();
    const course = {
      id: courseId,
      courseId,
      courseName,
      department,
      startDate: input.startDate || '',
      endDate: input.endDate || '',
      status,
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const next = repository.appendSyncAndAudit({
      ...state,
      course_instances: [course, ...state.course_instances]
    }, session.user?.id, 'course.created', 'course_instance', null, course);
    repository.writeState(next);
    return course;
  }

  function updateCourseStatus(session, courseInstanceId, status, expectedRevision) {
    assertCourseManager(session);
    if (!courseStatuses.includes(status)) {
      throw new Error('Ungueltiger Kursstatus.');
    }
    const state = repository.readState();
    const course = state.course_instances.find((entry) => entry.id === courseInstanceId);
    if (!course) {
      throw new Error('Kurs wurde nicht gefunden.');
    }
    if (expectedRevision && course.revision !== expectedRevision) {
      const error = new Error('Konflikt: Der Kurs wurde zwischenzeitlich geaendert.');
      error.current = course;
      throw error;
    }
    const updated = {
      ...course,
      status,
      revision: course.revision + 1,
      updatedAt: new Date().toISOString()
    };
    const next = repository.appendSyncAndAudit({
      ...state,
      course_instances: [updated, ...state.course_instances.filter((entry) => entry.id !== courseInstanceId)]
    }, session.user?.id, 'course.statusChanged', 'course_instance', course, updated);
    repository.writeState(next);
    return updated;
  }

  function assignMember(session, courseInstanceId, userId, roleInCourse) {
    assertCourseManager(session);
    if (!memberRoles.includes(roleInCourse)) {
      throw new Error('Ungueltige Kursrolle.');
    }
    const state = repository.readState();
    const course = state.course_instances.find((entry) => entry.id === courseInstanceId);
    if (!course) {
      throw new Error('Kurs wurde nicht gefunden.');
    }
    const existing = state.course_members.find((member) => (
      member.courseInstanceId === courseInstanceId
      && member.userId === userId
      && member.roleInCourse === roleInCourse
    ));
    if (existing) {
      return existing;
    }
    const timestamp = new Date().toISOString();
    const member = {
      id: repository.nextId('member'),
      courseInstanceId,
      userId,
      roleInCourse,
      status: 'active',
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const next = repository.appendSyncAndAudit({
      ...state,
      course_members: [member, ...state.course_members]
    }, session.user?.id, 'course.memberAssigned', 'course_member', null, member);
    repository.writeState(next);
    return member;
  }

  function assignContainer(session, courseInstanceId, contentContainerId) {
    assertCourseManager(session);
    const state = repository.readState();
    if (!state.course_instances.some((course) => course.id === courseInstanceId)) {
      throw new Error('Kurs wurde nicht gefunden.');
    }
    const container = activeAssignableContainers().find((manifest) => manifest.id === contentContainerId);
    if (!container) {
      throw new Error('Container ist nicht aktiv oder nicht freigebbar.');
    }
    const existing = state.course_container_assignments.find((assignment) => (
      assignment.courseInstanceId === courseInstanceId
      && assignment.contentContainerId === contentContainerId
    ));
    if (existing) {
      return existing;
    }
    const timestamp = new Date().toISOString();
    const assignment = {
      id: repository.nextId('course_container'),
      courseInstanceId,
      contentContainerId,
      status: 'active',
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const next = repository.appendSyncAndAudit({
      ...state,
      course_container_assignments: [assignment, ...state.course_container_assignments]
    }, session.user?.id, 'course.containerAssigned', 'course_container_assignment', null, assignment);
    repository.writeState(next);
    return assignment;
  }

  function setReleaseState(session, input = {}) {
    const state = repository.readState();
    const teacherMembership = state.course_members.find((member) => (
      member.courseInstanceId === input.courseInstanceId
      && member.userId === session.user?.id
      && member.roleInCourse === 'teacher'
      && member.status === 'active'
    ));
    if (!teacherMembership && !hasCourseManagerRights(session)) {
      throw new Error('Dozenten duerfen nur eigene Kurse freigeben.');
    }
    const assignment = state.course_container_assignments.find((entry) => (
      entry.courseInstanceId === input.courseInstanceId
      && entry.contentContainerId === input.contentContainerId
      && entry.status === 'active'
    ));
    if (!assignment) {
      throw new Error('Container ist dem Kurs nicht zugeordnet.');
    }
    const previous = state.course_release_states.find((entry) => (
      entry.courseInstanceId === input.courseInstanceId
      && entry.contentContainerId === input.contentContainerId
      && entry.releaseKey === input.releaseKey
    ));
    const timestamp = new Date().toISOString();
    const release = {
      ...(previous || {}),
      id: previous?.id || repository.nextId('release'),
      courseInstanceId: input.courseInstanceId,
      contentContainerId: input.contentContainerId,
      releaseKey: String(input.releaseKey || '').trim(),
      isReleased: input.isReleased === true,
      releasedFor: input.releasedFor || 'all',
      releasedBy: session.user?.id || '',
      releasedAt: input.isReleased === true ? timestamp : previous?.releasedAt || '',
      revision: (previous?.revision || 0) + 1,
      updatedAt: timestamp,
      createdAt: previous?.createdAt || timestamp
    };
    if (!release.releaseKey) {
      throw new Error('ReleaseKey ist erforderlich.');
    }
    const next = repository.appendSyncAndAudit({
      ...state,
      course_release_states: [
        release,
        ...state.course_release_states.filter((entry) => entry.id !== release.id)
      ]
    }, session.user?.id, 'course.releaseChanged', 'course_release_state', previous || null, release);
    repository.writeState(next);
    return release;
  }

  function getVisibleContainerIdsForUser(userId) {
    const state = repository.readState();
    const courseIds = new Set(state.course_members
      .filter((member) => member.userId === userId && member.status === 'active')
      .map((member) => member.courseInstanceId));
    return Array.from(new Set(state.course_container_assignments
      .filter((assignment) => courseIds.has(assignment.courseInstanceId) && assignment.status === 'active')
      .map((assignment) => assignment.contentContainerId)));
  }

  function getReleasedKeysForParticipant(userId, courseInstanceId, contentContainerId) {
    const state = repository.readState();
    const membership = state.course_members.find((member) => (
      member.userId === userId
      && member.courseInstanceId === courseInstanceId
      && member.roleInCourse === 'participant'
      && member.status === 'active'
    ));
    if (!membership) {
      return [];
    }
    return state.course_release_states
      .filter((release) => (
        release.courseInstanceId === courseInstanceId
        && release.contentContainerId === contentContainerId
        && release.isReleased === true
        && release.releaseKey
      ))
      .filter((release) => !/loesung|lösung|solution/i.test(release.releaseKey))
      .map((release) => release.releaseKey);
  }

  function getState(session) {
    assertCourseManager(session);
    const state = repository.readState();
    return {
      courses: state.course_instances,
      members: state.course_members,
      assignments: state.course_container_assignments,
      releases: state.course_release_states,
      syncEvents: state.sync_events.slice(0, 25),
      auditLog: state.audit_log.slice(0, 25),
      assignableContainers: activeAssignableContainers()
    };
  }

  return {
    repository,
    getState,
    createCourseInstance,
    updateCourseStatus,
    assignMember,
    assignContainer,
    setReleaseState,
    getVisibleContainerIdsForUser,
    getReleasedKeysForParticipant,
    activeAssignableContainers
  };
}

module.exports = {
  createCourseManagementService
};
