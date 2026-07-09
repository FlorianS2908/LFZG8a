/**
 * Runtime shape reference for local module manifests.
 *
 * ModuleManifest:
 * - id, name, description, category, icon, route, visibleInLauncher
 * - status: active | placeholder | disabled | archived | draft
 * - version, containerType, tags
 * - optional requiredPermissions, requiredLicense, sourceContainerId, createdBy, createdAt, updatedAt
 *
 * LearningContainer:
 * - id, manifest, routes, materials, assets, tasks, solutions, quizzes, status
 */

const moduleStatuses = ['active', 'placeholder', 'disabled', 'archived', 'draft'];
const moduleCategories = ['course', 'admin', 'tool', 'quiz', 'standalone', 'project'];
const containerTypes = ['learning-content', 'management', 'reporting', 'system', 'tool', 'quiz', 'standalone-app', 'factory-generated'];
const departments = ['FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'];

function validateModuleManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Module manifest is required.');
  }
  ['id', 'name', 'description', 'category', 'icon', 'route', 'status', 'version', 'containerType'].forEach((field) => {
    if (!manifest[field]) {
      throw new Error(`Module manifest field "${field}" is required.`);
    }
  });
  if (!manifest.displayName) {
    manifest.displayName = manifest.name;
  }
  if (!manifest.courseName) {
    manifest.courseName = manifest.displayName || manifest.name;
  }
  if (!manifest.courseId) {
    manifest.courseId = manifest.id;
  }
  if (!manifest.department) {
    manifest.department = manifest.category === 'admin' ? 'ALLGEMEIN' : 'FIAE';
  }
  if (!moduleStatuses.includes(manifest.status)) {
    throw new Error(`Unsupported module status "${manifest.status}".`);
  }
  if (!moduleCategories.includes(manifest.category)) {
    throw new Error(`Unsupported module category "${manifest.category}".`);
  }
  if (!containerTypes.includes(manifest.containerType)) {
    throw new Error(`Unsupported container type "${manifest.containerType}".`);
  }
  if (!departments.includes(manifest.department)) {
    throw new Error(`Unsupported module department "${manifest.department}".`);
  }
  if (manifest.category === 'admin' && manifest.assignable !== false) {
    throw new Error('Admin modules must not be assignable.');
  }
  return manifest;
}

module.exports = {
  moduleStatuses,
  moduleCategories,
  containerTypes,
  departments,
  validateModuleManifest
};
