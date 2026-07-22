const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = ['app/main.js', 'app/preload.js', 'app/renderer/tool-center', 'app/lib/content-factory', 'app/lib/json-store.js', 'app/lib/env', 'tests'];

function collectJs(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.js') ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => collectJs(path.join(target, entry.name)));
}

for (const file of targets.flatMap((target) => collectJs(path.join(root, target)))) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const forbidden = /auth:login|release-center:|course-management:|admin-tools:|dokutool:|INITIAL_ADMIN_PASSWORD/;
for (const relative of ['app/main.js', 'app/preload.js']) {
  if (forbidden.test(fs.readFileSync(path.join(root, relative), 'utf8'))) {
    console.error(`Verbotene Plattformreferenz in ${relative}`);
    process.exit(1);
  }
}
const textFiles = ['app/main.js', 'app/preload.js', 'app/renderer/tool-center', 'app/lib/content-factory'].flatMap((target) => collectText(path.join(root, target)));
const mojibake = /Ãƒ|Ã¢|ï¿½|\uFFFD/;
for (const file of textFiles) { if (mojibake.test(fs.readFileSync(file, 'utf8'))) { console.error(`Mojibake-Sequenz in ${path.relative(root, file)}`); process.exit(1); } }
console.log('ContentFactory-Prüfungen erfolgreich.');

function collectText(target) { if (!fs.existsSync(target)) return []; const stat = fs.statSync(target); if (stat.isFile()) return /\.(?:js|html|css|json|md|yml)$/i.test(target) ? [target] : []; return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => collectText(path.join(target, entry.name))); }
