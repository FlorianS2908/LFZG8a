import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CourseContainerAssignmentService,
  CourseInstanceService,
  CourseMembershipService,
  CourseReleaseService,
  CourseVisibilityService,
  DuplicateEntityError,
  InMemoryAuditLogRepository,
  InMemoryContentContainerRepository,
  InMemoryCourseContainerAssignmentRepository,
  InMemoryCourseInstanceRepository,
  InMemoryCourseMemberRepository,
  InMemoryCourseReleaseStateRepository,
  InMemorySyncEventRepository,
  ValidationError,
  VersionConflictError
} from '../src/index.ts';
import type { ContentContainer, CourseInstance } from '../src/index.ts';

const actor = { actorUserId: 'teacher-1', clientId: 'domain-test' };

function activeContainer(overrides: Partial<ContentContainer> = {}): ContentContainer {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? 'container-html-css',
    courseName: overrides.courseName ?? 'HTML/CSS',
    courseId: overrides.courseId ?? 'html-css',
    department: overrides.department ?? 'FIAE',
    category: overrides.category ?? 'course',
    containerType: overrides.containerType ?? 'learning-content',
    version: overrides.version ?? '1.0.0',
    status: overrides.status ?? 'active',
    assignable: overrides.assignable ?? true,
    manifestPath: overrides.manifestPath,
    catalogPath: overrides.catalogPath,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now
  };
}

function activeCourse(overrides: Partial<CourseInstance> = {}): CourseInstance {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? 'course-1',
    courseInstanceId: overrides.courseInstanceId ?? 'html-css-2026-b',
    title: overrides.title ?? 'HTML/CSS Kurs Gruppe B',
    department: overrides.department ?? 'FIAE',
    startDate: overrides.startDate,
    endDate: overrides.endDate,
    status: overrides.status ?? 'active',
    version: overrides.version ?? 1,
    createdBy: overrides.createdBy ?? 'course-manager-1',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now
  };
}

function createHarness(seed: {
  courses?: CourseInstance[];
  containers?: ContentContainer[];
} = {}) {
  const courseInstanceRepository = new InMemoryCourseInstanceRepository(seed.courses);
  const contentContainerRepository = new InMemoryContentContainerRepository(seed.containers);
  const courseMemberRepository = new InMemoryCourseMemberRepository();
  const courseContainerAssignmentRepository = new InMemoryCourseContainerAssignmentRepository();
  const courseReleaseStateRepository = new InMemoryCourseReleaseStateRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();
  const syncEventRepository = new InMemorySyncEventRepository();

  return {
    courseInstanceRepository,
    contentContainerRepository,
    courseMemberRepository,
    courseContainerAssignmentRepository,
    courseReleaseStateRepository,
    auditLogRepository,
    syncEventRepository,
    courseInstanceService: new CourseInstanceService({
      courseInstanceRepository,
      auditLogRepository,
      syncEventRepository
    }),
    membershipService: new CourseMembershipService({
      courseMemberRepository,
      auditLogRepository,
      syncEventRepository
    }),
    assignmentService: new CourseContainerAssignmentService({
      contentContainerRepository,
      courseContainerAssignmentRepository,
      auditLogRepository,
      syncEventRepository
    }),
    releaseService: new CourseReleaseService({
      courseMemberRepository,
      courseReleaseStateRepository,
      auditLogRepository,
      syncEventRepository
    }),
    visibilityService: new CourseVisibilityService({
      contentContainerRepository,
      courseInstanceRepository,
      courseMemberRepository,
      courseContainerAssignmentRepository
    })
  };
}

test('CourseInstance: course can be created and courseInstanceId is unique', async () => {
  const h = createHarness();
  const course = await h.courseInstanceService.createCourseInstance(actor, {
    courseInstanceId: 'lf05-fiae-2026-09',
    title: 'LF05 FIAE September 2026',
    department: 'FIAE',
    status: 'planned'
  });

  assert.equal(course.version, 1);
  assert.equal(course.createdBy, actor.actorUserId);
  await assert.rejects(
    () => h.courseInstanceService.createCourseInstance(actor, {
      courseInstanceId: 'lf05-fiae-2026-09',
      title: 'Duplicate',
      department: 'FIAE'
    }),
    DuplicateEntityError
  );
});

test('CourseInstance: update increases version and detects parallel update conflict', async () => {
  const h = createHarness({ courses: [activeCourse()] });
  const updated = await h.courseInstanceService.updateCourseInstance(actor, 'course-1', { title: 'HTML/CSS Kurs A' }, 1);

  assert.equal(updated.version, 2);
  await assert.rejects(
    () => h.courseInstanceService.setStatus(actor, 'course-1', 'completed', 1),
    VersionConflictError
  );
});

test('CourseMembership: teacher and participant can be assigned, deactivated, and not assigned twice actively', async () => {
  const h = createHarness();
  const teacher = await h.membershipService.assignTeacher(actor, 'course-1', 'teacher-1');
  const participant = await h.membershipService.assignParticipant(actor, 'course-1', 'participant-1');

  assert.equal(teacher.roleInCourse, 'teacher');
  assert.equal(participant.roleInCourse, 'participant');
  await assert.rejects(
    () => h.membershipService.assignParticipant(actor, 'course-1', 'participant-1'),
    DuplicateEntityError
  );

  const inactive = await h.membershipService.deactivateMember(actor, participant.id);
  assert.equal(inactive.status, 'inactive');
});

test('CourseContainerAssignment: active container can be assigned, disabled container cannot, assignment can deactivate', async () => {
  const h = createHarness({
    containers: [
      activeContainer({ id: 'active-container' }),
      activeContainer({ id: 'disabled-container', courseId: 'disabled', status: 'disabled' })
    ]
  });
  const assignment = await h.assignmentService.assignContainer(actor, 'course-1', 'active-container');

  assert.equal(assignment.status, 'active');
  await assert.rejects(
    () => h.assignmentService.assignContainer(actor, 'course-1', 'disabled-container'),
    ValidationError
  );

  const inactive = await h.assignmentService.deactivateAssignment(actor, assignment.id);
  assert.equal(inactive.status, 'inactive');
});

test('CourseReleaseState: key can be released and locked per CourseInstance with optimistic locking', async () => {
  const h = createHarness();
  await h.membershipService.assignTeacher(actor, 'course-1', 'teacher-1');
  await h.membershipService.assignTeacher(actor, 'course-2', 'teacher-1');
  await h.membershipService.assignParticipant(actor, 'course-1', 'participant-1');

  const released = await h.releaseService.releaseKey(actor, {
    courseInstanceId: 'course-1',
    contentContainerId: 'container-html-css',
    releaseKey: 'tag-01.task-01'
  });
  const otherCourse = await h.releaseService.releaseKey(actor, {
    courseInstanceId: 'course-2',
    contentContainerId: 'container-html-css',
    releaseKey: 'tag-01.task-01'
  });
  await h.releaseService.releaseKey(actor, {
    courseInstanceId: 'course-1',
    contentContainerId: 'container-html-css',
    releaseKey: 'tag-01.solution-01'
  });
  assert.deepEqual(
    await h.releaseService.listReleasedKeysForParticipant('participant-1', 'course-1', 'container-html-css'),
    ['tag-01.task-01']
  );
  const locked = await h.releaseService.lockKey(actor, {
    courseInstanceId: 'course-1',
    contentContainerId: 'container-html-css',
    releaseKey: 'tag-01.task-01',
    expectedVersion: 1
  });

  assert.equal(released.isReleased, true);
  assert.equal(otherCourse.courseInstanceId, 'course-2');
  assert.equal(locked.isReleased, false);
  assert.equal(locked.version, 2);
  await assert.rejects(
    () => h.releaseService.releaseKey(actor, {
      courseInstanceId: 'course-1',
      contentContainerId: 'container-html-css',
      releaseKey: 'tag-01.task-01',
      expectedVersion: 1
    }),
    VersionConflictError
  );
});

test('CourseVisibility: teacher and participant see own active course tile only', async () => {
  const h = createHarness({
    courses: [
      activeCourse({ id: 'course-1', status: 'active' }),
      activeCourse({ id: 'course-2', courseInstanceId: 'inactive-course', status: 'completed' })
    ],
    containers: [
      activeContainer({ id: 'container-html-css' }),
      activeContainer({ id: 'container-disabled', courseId: 'disabled-container', status: 'disabled' }),
      activeContainer({ id: 'container-admin', courseId: 'admin-tool', category: 'admin', containerType: 'system' })
    ]
  });
  await h.membershipService.assignTeacher(actor, 'course-1', 'teacher-1');
  await h.membershipService.assignParticipant(actor, 'course-1', 'participant-1');
  await h.membershipService.assignParticipant(actor, 'course-1', 'participant-foreign');
  const foreignMember = (await h.courseMemberRepository.findActive('course-1', 'participant-foreign', 'participant'))!;
  await h.membershipService.deactivateMember(actor, foreignMember.id);
  await h.membershipService.assignParticipant(actor, 'course-2', 'participant-2');
  await h.assignmentService.assignContainer(actor, 'course-1', 'container-html-css');
  await assert.rejects(() => h.assignmentService.assignContainer(actor, 'course-1', 'container-disabled'), ValidationError);
  await assert.rejects(() => h.assignmentService.assignContainer(actor, 'course-1', 'container-admin'), ValidationError);

  const teacherTiles = await h.visibilityService.listVisibleCourseTiles('teacher-1', 'teacher');
  const participantTiles = await h.visibilityService.listVisibleCourseTiles('participant-1', 'participant');
  const foreignTiles = await h.visibilityService.listVisibleCourseTiles('participant-foreign', 'participant');
  const inactiveCourseTiles = await h.visibilityService.listVisibleCourseTiles('participant-2', 'participant');

  assert.deepEqual(teacherTiles.map((tile) => tile.contentContainer.id), ['container-html-css']);
  assert.deepEqual(participantTiles.map((tile) => tile.contentContainer.id), ['container-html-css']);
  assert.equal(foreignTiles.length, 0);
  assert.equal(inactiveCourseTiles.length, 0);
});

test('Audit/Sync: course creation, assignment, and release changes create entries', async () => {
  const h = createHarness({ containers: [activeContainer()] });
  const course = await h.courseInstanceService.createCourseInstance(actor, {
    courseInstanceId: 'audit-course',
    title: 'Audit Course',
    department: 'ALLGEMEIN',
    status: 'active'
  });
  await h.membershipService.assignTeacher(actor, course.id, 'teacher-1');
  await h.assignmentService.assignContainer(actor, course.id, 'container-html-css');
  await h.releaseService.releaseKey(actor, {
    courseInstanceId: course.id,
    contentContainerId: 'container-html-css',
    releaseKey: 'tag-01.task-01'
  });

  const auditActions = (await h.auditLogRepository.list()).map((entry) => entry.action);
  const syncEvents = (await h.syncEventRepository.list()).map((entry) => entry.eventType);

  assert.ok(auditActions.includes('course_instance.created'));
  assert.ok(auditActions.includes('course_member.assigned'));
  assert.ok(auditActions.includes('course_container.assigned'));
  assert.ok(auditActions.includes('course_release.changed'));
  assert.equal(syncEvents.length, auditActions.length);
});
