const fs = require('fs');
const path = require('path');
const { DEMO_TOOLS, DEMO_LAUNCH_MODES } = require('./demo-target-types');
const { isBlockedDemoExtension, isContainerRelativePath, isSafeDemoExtension } = require('./demo-launch-policy');

function validateDemoTarget(target = {}, containerRoot = '') {
  const errors = [];
  const warnings = [];
  if (!target.id) errors.push('DemoTarget ohne id.');
  if (!Number.isInteger(Number(target.dayNumber))) errors.push(`DemoTarget ${target.id || '-'} ohne dayNumber.`);
  if (!DEMO_TOOLS.includes(target.tool)) errors.push(`DemoTarget ${target.id || '-'} hat unbekanntes Tool: ${target.tool || '-'}.`);
  if (!DEMO_LAUNCH_MODES.includes(target.launchMode)) errors.push(`DemoTarget ${target.id || '-'} hat unbekannten launchMode: ${target.launchMode || '-'}.`);
  if (!isContainerRelativePath(target.filePath)) errors.push(`DemoTarget ${target.id || '-'} nutzt keinen container-relativen Pfad.`);
  if (isBlockedDemoExtension(target.filePath)) errors.push(`DemoTarget ${target.id || '-'} nutzt blockierte Dateiendung: ${target.filePath}.`);
  if (!isSafeDemoExtension(target.filePath)) warnings.push(`DemoTarget ${target.id || '-'} nutzt ungewoehnliche Dateiendung: ${target.filePath}.`);
  if (target.safety?.allowAutoRun === true) errors.push(`DemoTarget ${target.id || '-'} erlaubt Auto-Run.`);
  if (target.safety?.requiresUserClick === false) errors.push(`DemoTarget ${target.id || '-'} erfordert keinen bewussten Klick.`);
  if (target.visibleForParticipants === true && /^dozent\//i.test(target.filePath || '')) {
    errors.push(`Teilnehmerfaehige Demo zeigt auf Dozentenbereich: ${target.id || '-'}.`);
  }
  if (containerRoot && isContainerRelativePath(target.filePath)) {
    const absolute = path.resolve(containerRoot, target.filePath);
    const relative = path.relative(containerRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) errors.push(`DemoTarget ${target.id || '-'} liegt ausserhalb des Containers.`);
    if (!fs.existsSync(absolute)) errors.push(`DemoTarget-Datei fehlt: ${target.filePath}.`);
    if (/\.sql$/i.test(target.filePath)) {
      const content = readText(absolute);
      if (!/wird nicht automatisch ausgefuehrt|nicht automatisch ausgefuehrt/i.test(content)) {
        errors.push(`SQL-Demo enthaelt keinen Hinweis zur Nicht-Ausfuehrung: ${target.filePath}.`);
      }
    }
    if (target.visibleForParticipants === true) {
      const content = readText(absolute);
      if (/loesung|lösung|solution|erwartungshorizont/i.test(content + target.filePath)) {
        errors.push(`Teilnehmerfaehige Demo enthaelt Loesungshinweise: ${target.filePath}.`);
      }
    }
  }
  return { isValid: errors.length === 0, errors, warnings };
}

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

module.exports = {
  validateDemoTarget
};
