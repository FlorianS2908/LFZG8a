const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { moduleRegistry } = require('../app/lib/modules/module-registry');
const { createCourseManagementService } = require('../app/lib/course-management/course-management-service');
const { getVisibleModuleManifestsForSession } = require('../app/lib/workflow/role-access');

function createTempService() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uetool-course-management-'));
  return {
    service: createCourseManagementService({ dataDir: path.join(dir, 'data'), moduleRegistry }),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

const courseManagerSession = { authenticated: true, user: { id: 'manager-1', roles: ['course_manager'] }, profile: {} };
const adminSession = { authenticated: true, user: { id: 'admin-1', roles: ['Admin', 'SuperAdmin'] }, profile: {} };
const teacherSession = { authenticated: true, user: { id: 'teacher-1', roles: ['Dozent'] }, profile: {} };
const otherTeacherSession = { authenticated: true, user: { id: 'teacher-2', roles: ['Dozent'] }, profile: {} };
const participantSession = { authenticated: true, user: { id: 'participant-1', roles: ['Teilnehmer'] }, profile: {} };

test('course management role sees only course management tile', () => {
  const modules = getVisibleModuleManifestsForSession(courseManagerSession, moduleRegistry.getAllModules(), []);
  assert.deepEqual(modules.map((module) => module.id), ['course-management']);
  assert.equal(modules[0].assignable, false);
});

test('teachers and participants do not see course management tile by default', () => {
  assert.equal(getVisibleModuleManifestsForSession(teacherSession, moduleRegistry.getAllModules(), []).some((module) => module.id === 'course-management'), false);
  assert.equal(getVisibleModuleManifestsForSession(participantSession, moduleRegistry.getAllModules(), []).some((module) => module.id === 'course-management'), false);
});

test('course management creates course instances and assignments with sync and audit', () => {
  const { service, cleanup } = createTempService();
  try {
    const course = service.createCourseInstance(courseManagerSession, {
      courseName: 'HTML/CSS Kurs Gruppe B',
      courseId: 'html-css-gruppe-b',
      department: 'FIAE',
      status: 'active'
    });
    const container = service.assignContainer(courseManagerSession, course.id, 'lfzq8a');
    const teacher = service.assignMember(courseManagerSession, course.id, teacherSession.user.id, 'teacher');
    const participant = service.assignMember(courseManagerSession, course.id, participantSession.user.id, 'participant');
    const state = service.getState(courseManagerSession);

    assert.equal(course.revision, 1);
    assert.equal(container.contentContainerId, 'lfzq8a');
    assert.equal(teacher.roleInCourse, 'teacher');
    assert.equal(participant.roleInCourse, 'participant');
    assert.equal(state.syncEvents.length >= 4, true);
    assert.equal(state.auditLog.length >= 4, true);
  } finally {
    cleanup();
  }
});

test('course tiles are derived from course membership and container assignment', () => {
  const { service, cleanup } = createTempService();
  try {
    const course = service.createCourseInstance(courseManagerSession, {
      courseName: 'HTML/CSS Kurs',
      courseId: 'html-css-kurs',
      department: 'FIAE',
      status: 'active'
    });
    service.assignContainer(courseManagerSession, course.id, 'lfzq8a');
    service.assignMember(courseManagerSession, course.id, teacherSession.user.id, 'teacher');
    service.assignMember(courseManagerSession, course.id, participantSession.user.id, 'participant');

    const teacherModules = getVisibleModuleManifestsForSession({
      ...teacherSession,
      courseContainerIds: service.getVisibleContainerIdsForUser(teacherSession.user.id)
    }, moduleRegistry.getAllModules(), []);
    const participantModules = getVisibleModuleManifestsForSession({
      ...participantSession,
      courseContainerIds: service.getVisibleContainerIdsForUser(participantSession.user.id)
    }, moduleRegistry.getAllModules(), []);

    assert.equal(teacherModules.some((module) => module.id === 'lfzq8a'), true);
    assert.equal(participantModules.some((module) => module.id === 'lfzq8a'), true);
  } finally {
    cleanup();
  }
});

test('teachers can release own course keys but not foreign courses', () => {
  const { service, cleanup } = createTempService();
  try {
    const course = service.createCourseInstance(courseManagerSession, {
      courseName: 'HTML/CSS Kurs',
      courseId: 'html-css-release',
      department: 'FIAE',
      status: 'active'
    });
    service.assignContainer(courseManagerSession, course.id, 'lfzq8a');
    service.assignMember(courseManagerSession, course.id, teacherSession.user.id, 'teacher');
    service.assignMember(courseManagerSession, course.id, participantSession.user.id, 'participant');

    const release = service.setReleaseState(teacherSession, {
      courseInstanceId: course.id,
      contentContainerId: 'lfzq8a',
      releaseKey: 'tag_01',
      isReleased: true
    });
    assert.equal(release.isReleased, true);
    assert.deepEqual(service.getReleasedKeysForParticipant(participantSession.user.id, course.id, 'lfzq8a'), ['tag_01']);
    assert.throws(() => service.setReleaseState(otherTeacherSession, {
      courseInstanceId: course.id,
      contentContainerId: 'lfzq8a',
      releaseKey: 'tag_02',
      isReleased: true
    }), /eigene Kurse/);
  } finally {
    cleanup();
  }
});

test('course management detects optimistic locking conflicts', () => {
  const { service, cleanup } = createTempService();
  try {
    const course = service.createCourseInstance(courseManagerSession, {
      courseName: 'Konflikt Kurs',
      courseId: 'konflikt-kurs',
      department: 'FIAE',
      status: 'draft'
    });
    service.updateCourseStatus(adminSession, course.id, 'active', 1);
    assert.throws(() => service.updateCourseStatus(courseManagerSession, course.id, 'paused', 1), /Konflikt/);
  } finally {
    cleanup();
  }
});
