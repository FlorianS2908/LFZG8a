const fs = require('fs');
const path = require('path');

function migrateLegacyUserData({ newUserDataDir, legacyUserDataDirs = [], logger = console } = {}) {
  if (!newUserDataDir) throw new Error('CourseForge-Benutzerdatenpfad fehlt.');
  const targetProjects = path.join(newUserDataDir, 'projects');
  const marker = path.join(newUserDataDir, '.courseforge-migration-v1.json');
  fs.mkdirSync(newUserDataDir, { recursive: true });
  if (fs.existsSync(marker)) return { migrated: false, reason: 'already_checked', activeProjectsDir: targetProjects, completion: Promise.resolve() };
  const sourceProjects = legacyUserDataDirs.filter(Boolean).map((legacyDir) => path.join(legacyDir, 'projects')).find((candidate) => path.resolve(candidate) !== path.resolve(targetProjects) && fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());
  if (!sourceProjects) {
    writeMarker(marker, false); logger.info?.('[CourseForge Migration]', { event: 'no_legacy_projects_found' });
    return { migrated: false, reason: 'not_found', activeProjectsDir: targetProjects, completion: Promise.resolve() };
  }
  fs.mkdirSync(targetProjects, { recursive: true });
  const completion = new Promise((resolve) => {
    fs.cp(sourceProjects, targetProjects, { recursive: true, force: false, errorOnExist: false }, (error) => {
      if (error) { logger.warn?.('[CourseForge Migration]', { event: 'legacy_copy_failed', errorCode: error.code || 'COPY_FAILED' }); resolve({ migrated: false, errorCode: error.code }); return; }
      writeMarker(marker, true); logger.info?.('[CourseForge Migration]', { event: 'legacy_projects_copied' }); resolve({ migrated: true });
    });
  });
  // Der Altbestand bleibt bis zum nächsten Start die aktive Quelle. So blockiert
  // eine große Migration weder App-Start noch bestehende Projekte.
  return { migrated: false, reason: 'copy_started', activeProjectsDir: sourceProjects, completion };
}

function writeMarker(marker, migratedProjects) { fs.writeFileSync(marker, JSON.stringify({ schemaVersion: 1, checkedAt: new Date().toISOString(), migratedProjects }, null, 2), 'utf8'); }

module.exports = { migrateLegacyUserData };
