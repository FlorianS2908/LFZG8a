const fs = require('fs');
const test = require('node:test');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { ensureDir, readJson, writeJson } = require('../app/lib/json-store');

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfzq8a-json-store-'));
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

test('json store creates nested directories and writes formatted json', () => {
  const { dir, cleanup } = createTempDir();
  const filePath = path.join(dir, 'nested', 'settings.json');

  try {
    writeJson(filePath, { configured: true, monitorIndex: 2 });

    assert.equal(fs.existsSync(path.dirname(filePath)), true);
    assert.deepEqual(readJson(filePath, null), {
      configured: true,
      monitorIndex: 2
    });
    assert.match(fs.readFileSync(filePath, 'utf8'), /\n  "configured": true/);
  } finally {
    cleanup();
  }
});

test('json store returns fallback for missing or invalid json files', () => {
  const { dir, cleanup } = createTempDir();
  const invalidFilePath = path.join(dir, 'broken.json');

  try {
    ensureDir(dir);
    fs.writeFileSync(invalidFilePath, '{broken', 'utf8');

    assert.deepEqual(readJson(path.join(dir, 'missing.json'), { fallback: true }), { fallback: true });
    assert.deepEqual(readJson(invalidFilePath, ['fallback']), ['fallback']);
  } finally {
    cleanup();
  }
});
