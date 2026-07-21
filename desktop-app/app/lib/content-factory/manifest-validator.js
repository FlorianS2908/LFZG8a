const manifestStatuses = ['active', 'placeholder', 'disabled', 'archived', 'draft'];
const manifestCategories = ['course', 'admin', 'tool', 'quiz', 'standalone', 'project'];
const containerTypes = ['learning-content', 'management', 'reporting', 'system', 'tool', 'quiz', 'standalone-app', 'factory-generated'];
const departments = ['FIAE', 'FISI', 'KABUE', 'KITS', 'ALLGEMEIN'];

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('Container manifest is required.');
  ['id', 'name', 'description', 'category', 'icon', 'route', 'status', 'version', 'containerType'].forEach((field) => {
    if (!manifest[field]) throw new Error(`Container manifest field "${field}" is required.`);
  });
  manifest.displayName ||= manifest.name;
  manifest.courseName ||= manifest.displayName || manifest.name;
  manifest.courseId ||= manifest.id;
  manifest.department ||= manifest.category === 'admin' ? 'ALLGEMEIN' : 'FIAE';
  if (!manifestStatuses.includes(manifest.status)) throw new Error(`Unsupported manifest status "${manifest.status}".`);
  if (!manifestCategories.includes(manifest.category)) throw new Error(`Unsupported manifest category "${manifest.category}".`);
  if (!containerTypes.includes(manifest.containerType)) throw new Error(`Unsupported container type "${manifest.containerType}".`);
  if (!departments.includes(manifest.department)) throw new Error(`Unsupported department "${manifest.department}".`);
  if (manifest.category === 'admin' && manifest.assignable !== false) throw new Error('Admin manifests must not be assignable.');
  return manifest;
}

module.exports = { manifestStatuses, manifestCategories, containerTypes, departments, validateManifest };
