const { validateManifest } = require('./manifest-validator');

function createSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'container';
}

function normalizeCategory(value, containerType = 'learning-content') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['admin'].includes(normalized)) {
    return 'admin';
  }
  if (['tool', 'werkzeug'].includes(normalized)) {
    return 'tool';
  }
  if (['quiz', 'test'].includes(normalized)) {
    return 'quiz';
  }
  if (['standalone', 'standalone-app'].includes(normalized)) {
    return 'standalone';
  }
  if (containerType === 'quiz') {
    return 'quiz';
  }
  if (containerType === 'standalone-app') {
    return 'standalone';
  }
  return 'course';
}

function createManifest(options, now = new Date()) {
  const id = createSlug(options.id || options.name);
  const timestamp = now.toISOString();
  const containerType = options.containerType || 'learning-content';
  const category = normalizeCategory(options.category, containerType);
  return validateManifest({
    id,
    name: String(options.name || id).trim(),
    displayName: String(options.displayName || options.name || id).trim(),
    courseName: String(options.courseName || options.name || id).trim(),
    courseId: String(options.courseId || id).trim(),
    department: options.department || 'FIAE',
    description: String(options.description || '').trim(),
    category,
    icon: options.icon || 'Code',
    route: `/modules/${id}`,
    visibleInLauncher: options.visibleInLauncher === true,
    status: options.status || 'draft',
    version: options.version || '0.1.0',
    containerType,
    tags: Array.isArray(options.tags) ? options.tags : [],
    requiredPermissions: options.requiredPermissions || [`module.${id}.view`],
    requiredLicense: options.requiredLicense || 'starter',
    sourceContainerId: options.sourceContainerId || '',
    catalogRef: options.catalogRef || '',
    storageMode: options.storageMode || 'generated',
    standaloneEntry: options.standaloneEntry || '',
    exportable: options.exportable === true,
    legacyRoutes: options.legacyRoutes || [],
    createdBy: options.createdBy || 'local-admin',
    createdAt: options.createdAt || timestamp,
    updatedAt: timestamp
  });
}

function cloneManifestForDuplicate(sourceManifest, options, now = new Date()) {
  return createManifest({
    id: options.newId,
    name: options.newName,
    description: options.newDescription,
    category: sourceManifest.category,
    icon: sourceManifest.icon,
    visibleInLauncher: options.visibleInLauncher === true,
    status: 'draft',
    version: '0.1.0',
    containerType: sourceManifest.containerType,
    tags: options.tags || sourceManifest.tags || [],
    requiredPermissions: [`module.${options.newId}.view`],
    requiredLicense: sourceManifest.requiredLicense,
    sourceContainerId: sourceManifest.id,
    createdBy: options.createdBy
  }, now);
}

module.exports = {
  createSlug,
  createManifest,
  cloneManifestForDuplicate
};
