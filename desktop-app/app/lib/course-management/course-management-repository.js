const crypto = require('crypto');

class CourseManagementRepository {
  constructor(store) {
    this.store = store;
  }

  readState() {
    return this.store.readState();
  }

  writeState(state) {
    return this.store.writeState(state);
  }

  listCourseInstances() {
    return this.readState().course_instances;
  }

  getCourseInstance(courseInstanceId) {
    return this.listCourseInstances().find((course) => course.id === courseInstanceId) || null;
  }

  listCourseMembers(courseInstanceId = '') {
    const members = this.readState().course_members;
    return courseInstanceId ? members.filter((member) => member.courseInstanceId === courseInstanceId) : members;
  }

  listCourseContainerAssignments(courseInstanceId = '') {
    const assignments = this.readState().course_container_assignments;
    return courseInstanceId ? assignments.filter((entry) => entry.courseInstanceId === courseInstanceId) : assignments;
  }

  listReleaseStates(courseInstanceId = '') {
    const releases = this.readState().course_release_states;
    return courseInstanceId ? releases.filter((entry) => entry.courseInstanceId === courseInstanceId) : releases;
  }

  nextId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  appendSyncAndAudit(state, actorId, action, entity, before, after) {
    const timestamp = new Date().toISOString();
    const event = {
      id: this.nextId('sync'),
      action,
      entity,
      entityId: after?.id || before?.id || '',
      timestamp,
      revision: after?.revision || 1
    };
    const audit = {
      id: this.nextId('audit'),
      actor: actorId || '',
      action,
      entity,
      before: before || null,
      after: after || null,
      timestamp,
      clientId: 'local-electron'
    };
    return {
      ...state,
      sync_events: [event, ...(state.sync_events || [])],
      audit_log: [audit, ...(state.audit_log || [])]
    };
  }
}

module.exports = {
  CourseManagementRepository
};
