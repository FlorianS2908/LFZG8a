const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { buildContainerId, suggestUniqueContainerId } = require('../app/lib/container-registry/container-id-service');
const { createContainerRegistryService } = require('../app/lib/container-registry/container-registry-service');

test('container id service creates stable department aware ids', () => {
  assert.equal(buildContainerId({ courseName: 'HTML/CSS', department: 'FIAE' }), 'html-css-fiae');
  assert.equal(buildContainerId({ courseId: 'lf05', department: 'FIAE' }), 'lf05-fiae');
  assert.equal(suggestUniqueContainerId({ courseId: 'lf05', department: 'FIAE' }, (id) => id === 'lf05-fiae'), 'lf05-fiae-2');
});

test('container registry stores metadata and blocks id and course collisions', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uetool-container-registry-'));
  try {
    const service = createContainerRegistryService(path.join(dir, 'data'));
    const created = await service.repository.createContainer({
      id: 'lf05-fiae',
      courseId: 'lf05',
      courseName: 'LF05',
      department: 'FIAE',
      category: 'course',
      containerType: 'learning-content'
    });
    assert.equal(created.status, 'draft');
    assert.equal(await service.repository.existsContainerId('lf05-fiae'), true);
    await assert.rejects(() => service.repository.createContainer({
      id: 'lf05-fiae',
      courseId: 'lf05-copy',
      courseName: 'LF05 Kopie',
      department: 'FIAE'
    }), /existiert bereits/);
    await assert.rejects(() => service.repository.createContainer({
      id: 'lf05-fiae-copy',
      courseId: 'lf05',
      courseName: 'LF05 Kopie',
      department: 'FIAE'
    }), /Course-ID/);
    const archived = await service.repository.archiveContainer('lf05-fiae');
    assert.equal(archived.status, 'archived');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
