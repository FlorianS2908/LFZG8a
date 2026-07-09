const { createContainerMetadataStore } = require('./container-metadata-store');
const { ContainerRepository } = require('./container-repository');
const { suggestUniqueContainerId } = require('./container-id-service');

function createContainerRegistryService(dataDir) {
  const store = createContainerMetadataStore(dataDir);
  const repository = new ContainerRepository(store);

  async function suggestId(input) {
    const containers = await repository.listContainers();
    return suggestUniqueContainerId(input, (candidate) => containers.some((container) => container.id === candidate));
  }

  return {
    store,
    repository,
    suggestId
  };
}

module.exports = {
  createContainerRegistryService
};
