const assert = require('node:assert/strict');
const { moduleRegistry } = require('../app/lib/modules/module-registry');
const {
  getVisibleModuleManifestsForSession,
  decideHtmlCssOpenMode,
  canOpenContentFactory,
  canSeeCourseSettings,
  getEmptyStateMessage
} = require('../app/lib/workflow/role-access');

const adminSession = { authenticated: true, user: { roles: ['SuperAdmin', 'Admin'] }, profile: { assignedModuleIds: [] } };
const courseManagerSession = { authenticated: true, user: { roles: ['course_manager'] }, profile: { assignedModuleIds: [] } };
const teacherSession = { authenticated: true, user: { roles: ['Dozent'] }, profile: { assignedModuleIds: [] } };
const teacherWithReleaseSession = { authenticated: true, user: { roles: ['Dozent'] }, profile: { assignedModuleIds: ['lfzq8a'] } };
const participantSession = { authenticated: true, user: { roles: ['Teilnehmer'] }, profile: { assignedModuleIds: [] } };
const participantWithReleaseSession = { authenticated: true, user: { roles: ['Teilnehmer'] }, profile: { assignedModuleIds: ['lfzq8a'] } };

test('workflow role visibility shows only admin modules for admins', () => {
  const modules = getVisibleModuleManifestsForSession(adminSession, moduleRegistry.getAllModules(), []);

  assert.deepEqual(modules.map((module) => module.id), [
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
  ]);
  assert.equal(modules.some((module) => module.assignable === true), false);
});

test('workflow role visibility shows only course management for course managers', () => {
  const modules = getVisibleModuleManifestsForSession(courseManagerSession, moduleRegistry.getAllModules(), []);
  assert.deepEqual(modules.map((module) => module.id), ['course-management']);
  assert.equal(modules.some((module) => module.id === 'content-factory'), false);
  assert.equal(modules.some((module) => module.id === 'test-center'), false);
});

test('workflow role visibility shows only assigned modules for teachers', () => {
  const modules = getVisibleModuleManifestsForSession(teacherSession, moduleRegistry.getAllModules(), []);
  const releasedModules = getVisibleModuleManifestsForSession(teacherWithReleaseSession, moduleRegistry.getAllModules(), []);

  assert.deepEqual(modules, []);
  assert.equal(releasedModules.some((module) => module.name === 'HTML/CSS'), true);
  assert.equal(releasedModules.some((module) => module.id === 'content-factory'), false);
  assert.equal(releasedModules.some((module) => module.id === 'release-center'), false);
  assert.equal(releasedModules.some((module) => module.id === 'teacher-create'), false);
  assert.equal(releasedModules.some((module) => module.id === 'participant-create'), false);
  assert.equal(releasedModules.some((module) => module.id === 'container-adapter'), false);
});

test('workflow role visibility shows only assigned modules for participants', () => {
  const modules = getVisibleModuleManifestsForSession(participantSession, moduleRegistry.getAllModules(), []);
  const releasedModules = getVisibleModuleManifestsForSession(participantWithReleaseSession, moduleRegistry.getAllModules(), []);

  assert.deepEqual(modules, []);
  assert.equal(releasedModules.some((module) => module.name === 'HTML/CSS'), true);
  assert.equal(releasedModules.some((module) => module.id === 'content-factory'), false);
  assert.equal(releasedModules.some((module) => module.id === 'release-center'), false);
  assert.equal(releasedModules.some((module) => module.id === 'teacher-create'), false);
  assert.equal(releasedModules.some((module) => module.id === 'participant-create'), false);
  assert.equal(releasedModules.some((module) => module.id === 'test-center'), false);
});

test('workflow role empty state messages are role specific', () => {
  assert.match(getEmptyStateMessage(teacherSession), /Dozentenprofil/);
  assert.match(getEmptyStateMessage(participantSession), /Teilnehmerprofil/);
});

test('workflow module metadata marks admin modules as not assignable', () => {
  assert.equal(moduleRegistry.getModuleById('content-factory').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('release-center').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('teacher-create').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('participant-create').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('course-management').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('container-adapter').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('test-center').manifest.assignable, false);
  assert.equal(moduleRegistry.getModuleById('lfzq8a').manifest.assignable, true);
});

test('workflow role visibility shows html css after assignment', () => {
  const modules = getVisibleModuleManifestsForSession(teacherWithReleaseSession, moduleRegistry.getAllModules(), []);
  assert.equal(modules.some((module) => module.name === 'HTML/CSS'), true);
  assert.equal(modules.some((module) => module.id === 'content-factory'), false);
});

test('workflow role visibility shows no launcher tiles for participants', () => {
  assert.deepEqual(getVisibleModuleManifestsForSession(participantSession, moduleRegistry.getAllModules(), []), []);
});

test('workflow routing decisions follow the current role model', () => {
  assert.equal(decideHtmlCssOpenMode(adminSession), 'blocked');
  assert.equal(decideHtmlCssOpenMode(teacherSession), 'blocked');
  assert.equal(decideHtmlCssOpenMode(teacherWithReleaseSession), 'teacher-and-course');
  assert.equal(decideHtmlCssOpenMode(participantSession), 'blocked');
  assert.equal(decideHtmlCssOpenMode(participantWithReleaseSession), 'course-only');
  assert.equal(canOpenContentFactory(adminSession), true);
  assert.equal(canOpenContentFactory(teacherSession), false);
  assert.equal(canSeeCourseSettings(adminSession), false);
  assert.equal(canSeeCourseSettings(teacherSession), false);
  assert.equal(canSeeCourseSettings(teacherWithReleaseSession), true);
  assert.equal(canSeeCourseSettings(participantSession), false);
});
