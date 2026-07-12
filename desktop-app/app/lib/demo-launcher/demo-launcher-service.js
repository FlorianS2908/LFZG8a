const { spawn } = require('child_process');
const { resolveDemoPath } = require('./demo-launcher-policy');

async function openDemoTarget(demoTarget = {}, containerRoot = '', options = {}) {
  const resolved = resolveDemoPath(demoTarget, containerRoot);
  if (!resolved.ok) {
    return { success: false, errorCategory: resolved.errorCategory, message: resolved.message };
  }
  const shell = options.shell || getElectronShell();
  const tool = demoTarget.tool || 'default';
  try {
    if (tool === 'vscode' || tool === 'jupyter') {
      const codeResult = await openInVsCode(resolved.absolutePath, options);
      if (codeResult.success) {
        return { success: true, tool, openedPathType: 'container-relative', message: 'Demo wurde in VS Code geoeffnet.' };
      }
      await shell.openPath(resolved.absolutePath);
      return { success: true, tool, openedPathType: 'container-relative', message: 'Demo wurde mit dem Standardprogramm geoeffnet.' };
    }
    await shell.openPath(resolved.absolutePath);
    return { success: true, tool, openedPathType: 'container-relative', message: 'Demo wurde geoeffnet.' };
  } catch (error) {
    return { success: false, errorCategory: 'unknown', message: error.message || 'Demo konnte nicht geoeffnet werden.' };
  }
}

function getElectronShell() {
  try {
    return require('electron').shell;
  } catch {
    return { openPath: async () => '' };
  }
}

function openInVsCode(targetPath, options = {}) {
  const spawnFn = options.spawn || spawn;
  const command = options.codeCommand || 'code';
  return new Promise((resolve) => {
    const child = spawnFn(command, [targetPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: false
    });
    child.once('error', () => resolve({ success: false }));
    child.once('spawn', () => {
      if (typeof child.unref === 'function') child.unref();
      resolve({ success: true });
    });
  });
}

module.exports = {
  openDemoTarget
};
