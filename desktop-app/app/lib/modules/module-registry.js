const { validateModuleManifest } = require('./module-types');
const { learningContainer: lfzq8aContainer } = require('./lfzq8a-container');
const { systemContainer: contentFactoryContainer } = require('./content-factory-container');
const { systemContainer: releaseCenterContainer } = require('./release-center-container');
const { systemContainer: teacherCreateContainer } = require('./teacher-create-container');
const { systemContainer: participantCreateContainer } = require('./participant-create-container');
const { systemContainer: courseManagementContainer } = require('./course-management-container');
const { adminToolContainers } = require('./admin-tool-containers');

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
  }

  registerModule(module) {
    const manifest = validateModuleManifest(module?.manifest || module);
    const normalized = module.manifest ? module : { id: manifest.id, manifest, status: manifest.status };
    this.modules.set(manifest.id, normalized);
    return normalized;
  }

  getAllModules() {
    return Array.from(this.modules.values());
  }

  getVisibleLauncherModules() {
    return this.getAllModules()
      .filter((module) => module.manifest.visibleInLauncher === true)
      .filter((module) => ['active', 'placeholder'].includes(module.manifest.status));
  }

  getModuleById(id) {
    return this.modules.get(id) || null;
  }

  getActiveModules() {
    return this.getAllModules().filter((module) => module.manifest.status === 'active');
  }

  getModulesByCategory(category) {
    return this.getAllModules().filter((module) => module.manifest.category === category);
  }
}

const moduleRegistry = new ModuleRegistry();
moduleRegistry.registerModule(lfzq8aContainer);
moduleRegistry.registerModule(contentFactoryContainer);
moduleRegistry.registerModule(releaseCenterContainer);
moduleRegistry.registerModule(teacherCreateContainer);
moduleRegistry.registerModule(participantCreateContainer);
moduleRegistry.registerModule(courseManagementContainer);
adminToolContainers.forEach((container) => moduleRegistry.registerModule(container));

module.exports = {
  ModuleRegistry,
  moduleRegistry
};
