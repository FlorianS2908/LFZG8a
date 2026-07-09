const path = require('path');
const { ensureDir, readJson, writeJson } = require('../json-store');

const emptyState = {
  users: [],
  roles: ['participant', 'teacher', 'admin', 'course_manager'],
  user_roles: [],
  departments: ['FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'],
  content_containers: [],
  course_instances: [],
  course_container_assignments: [],
  course_members: [],
  course_release_states: [],
  course_settings: [],
  sync_events: [],
  audit_log: []
};

function createCentralCourseStore(dataDir) {
  const storeDir = path.join(dataDir, 'central-course-data');
  const storePath = path.join(storeDir, 'central-course-store.json');

  function readState() {
    ensureDir(storeDir);
    return {
      ...emptyState,
      ...readJson(storePath, {})
    };
  }

  function writeState(state) {
    ensureDir(storeDir);
    writeJson(storePath, {
      ...emptyState,
      ...(state || {})
    });
    return readState();
  }

  return {
    storeDir,
    storePath,
    readState,
    writeState
  };
}

module.exports = {
  emptyState,
  createCentralCourseStore
};
