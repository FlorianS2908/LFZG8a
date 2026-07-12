const path = require('path');
const { BLOCKED_DEMO_EXTENSIONS, SAFE_DEMO_EXTENSIONS } = require('./demo-target-types');

function isBlockedDemoExtension(filePath = '') {
  return BLOCKED_DEMO_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

function isSafeDemoExtension(filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  return SAFE_DEMO_EXTENSIONS.includes(ext);
}

function isContainerRelativePath(filePath = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return Boolean(normalized)
    && !path.isAbsolute(normalized)
    && !normalized.split('/').includes('..')
    && !/^[a-z]+:/i.test(normalized);
}

module.exports = {
  isBlockedDemoExtension,
  isSafeDemoExtension,
  isContainerRelativePath
};
