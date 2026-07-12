const fs = require('fs');
const path = require('path');
const { BLOCKED_LAUNCH_EXTENSIONS } = require('./demo-launcher-types');

function resolveDemoPath(demoTarget = {}, containerRoot = '') {
  if (!containerRoot) return { ok: false, errorCategory: 'not-found', message: 'ContainerRoot fehlt.' };
  const filePath = String(demoTarget.filePath || '').replace(/\\/g, '/');
  if (!filePath || path.isAbsolute(filePath) || filePath.includes('..') || /^[a-z]+:/i.test(filePath)) {
    return { ok: false, errorCategory: 'outside-container', message: 'Demo-Pfad muss container-relativ sein.' };
  }
  const root = path.resolve(containerRoot);
  const absolutePath = path.resolve(root, filePath);
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { ok: false, errorCategory: 'outside-container', message: 'Demo-Pfad liegt ausserhalb des Containers.' };
  }
  const ext = path.extname(absolutePath).toLowerCase();
  if (BLOCKED_LAUNCH_EXTENSIONS.includes(ext)) {
    return { ok: false, errorCategory: 'blocked-extension', message: 'Diese Dateiendung darf nicht geoeffnet werden.' };
  }
  if (!fs.existsSync(absolutePath)) {
    return { ok: false, errorCategory: 'not-found', message: 'Demo-Datei wurde nicht gefunden.' };
  }
  return {
    ok: true,
    absolutePath,
    root,
    ext,
    isDirectory: fs.statSync(absolutePath).isDirectory()
  };
}

module.exports = {
  resolveDemoPath
};
