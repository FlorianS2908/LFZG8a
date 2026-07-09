const { suggestUniqueContainerId } = require('./container-id-service');

class ContainerRepository {
  constructor(store) {
    this.store = store;
  }

  async listContainers() {
    return this.store.readIndex();
  }

  async getContainerById(containerId) {
    return (await this.listContainers()).find((container) => container.id === containerId) || null;
  }

  async existsContainerId(containerId) {
    return Boolean(await this.getContainerById(containerId));
  }

  async existsCourseId(courseId) {
    return (await this.listContainers()).some((container) => container.courseId === courseId);
  }

  async createContainer(metadata) {
    const containers = await this.listContainers();
    const id = metadata.id || suggestUniqueContainerId(metadata, (candidate) => containers.some((container) => container.id === candidate));
    if (containers.some((container) => container.id === id)) {
      throw new Error(`Container-ID "${id}" existiert bereits.`);
    }
    if (metadata.courseId && containers.some((container) => container.courseId === metadata.courseId)) {
      throw new Error(`Course-ID "${metadata.courseId}" existiert bereits.`);
    }
    const timestamp = new Date().toISOString();
    const container = {
      ...metadata,
      id,
      status: metadata.status || 'draft',
      createdAt: metadata.createdAt || timestamp,
      updatedAt: metadata.updatedAt || timestamp
    };
    this.store.writeIndex([container, ...containers]);
    return container;
  }

  async updateContainer(containerId, patch) {
    const containers = await this.listContainers();
    const existing = containers.find((container) => container.id === containerId);
    if (!existing) {
      throw new Error('Container wurde nicht gefunden.');
    }
    const updated = {
      ...existing,
      ...(patch || {}),
      id: existing.id,
      updatedAt: new Date().toISOString()
    };
    this.store.writeIndex([updated, ...containers.filter((container) => container.id !== containerId)]);
    return updated;
  }

  async archiveContainer(containerId) {
    const containers = await this.listContainers();
    const existing = containers.find((container) => container.id === containerId);
    if (!existing) {
      throw new Error('Container wurde nicht gefunden.');
    }
    const archived = {
      ...existing,
      status: 'archived',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.store.writeIndex(containers.filter((container) => container.id !== containerId));
    this.store.writeArchived([archived, ...this.store.readArchived()]);
    return archived;
  }
}

module.exports = {
  ContainerRepository
};
