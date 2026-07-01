const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const repoRoot = path.resolve(__dirname, '..', '..');
const participantRoot = path.join(repoRoot, 'teilnehmer');
const teacherRoot = path.join(repoRoot, 'dozent');
const ignoredDirs = new Set([
  '.git',
  '.agents',
  '.codex',
  '_archiv',
  'node_modules'
]);

const absolutePathPattern = new RegExp(`(?:^|[^A-Za-z0-9_])[A-Za-z]:[\\\\/][A-Za-z0-9_.-]|file:\\/\\/\\/|(?:href|src)=["']\\/(?!\\/)`, 'i');
const localReferencePattern = /\b(?:href|src)=["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi;
const externalReferencePattern = /^(?:#|data:|https?:|mailto:|tel:|javascript:|about:)/i;

function walkFiles(dir, predicate, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walkFiles(path.join(dir, entry.name), predicate, files);
      }
      return;
    }

    const filePath = path.join(dir, entry.name);
    if (predicate(filePath)) {
      files.push(filePath);
    }
  });
  return files;
}

function isTextFile(filePath) {
  return /\.(?:cmd|css|html|js|json|md|txt)$/i.test(filePath);
}

function isWebFile(filePath) {
  return /\.(?:css|html)$/i.test(filePath);
}

function stripHashAndQuery(reference) {
  return reference.split('#')[0].split('?')[0];
}

function resolveReference(fromFile, reference) {
  const cleanReference = stripHashAndQuery(reference.trim());
  if (!cleanReference || cleanReference.includes('&') || externalReferencePattern.test(cleanReference)) {
    return null;
  }
  return path.resolve(path.dirname(fromFile), cleanReference);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function collectLocalReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const references = [];
  let match = localReferencePattern.exec(content);

  while (match) {
    const reference = match[1] || match[2];
    const resolved = resolveReference(filePath, reference);
    if (resolved) {
      references.push({ reference, resolved });
    }
    match = localReferencePattern.exec(content);
  }

  return references;
}

test('active project files do not contain absolute Windows or root-relative paths', () => {
  const files = walkFiles(repoRoot, isTextFile);
  const offenders = files.filter((filePath) => absolutePathPattern.test(fs.readFileSync(filePath, 'utf8')));

  assert.deepEqual(offenders.map((filePath) => path.relative(repoRoot, filePath)), []);
});

test('participant folder is standalone and does not link outside itself', () => {
  const files = walkFiles(participantRoot, isWebFile);
  const escapingReferences = [];
  const missingReferences = [];

  files.forEach((filePath) => {
    collectLocalReferences(filePath).forEach(({ reference, resolved }) => {
      if (!isInside(participantRoot, resolved)) {
        escapingReferences.push(`${path.relative(repoRoot, filePath)} -> ${reference}`);
        return;
      }
      if (!fs.existsSync(resolved)) {
        missingReferences.push(`${path.relative(repoRoot, filePath)} -> ${reference}`);
      }
    });
  });

  assert.deepEqual(escapingReferences, []);
  assert.deepEqual(missingReferences, []);
});

test('static root does not expose the teacher folder by link', () => {
  const rootIndex = path.join(repoRoot, 'index.html');
  const teacherLinks = collectLocalReferences(rootIndex)
    .filter(({ resolved }) => isInside(teacherRoot, resolved))
    .map(({ reference }) => reference);

  assert.deepEqual(teacherLinks, []);
});

test('electron desktop app starts the teacher overview with a portable project-relative path', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'desktop-app', 'app', 'main.js'), 'utf8');

  assert.match(mainSource, /path\.join\(projectRoot,\s*'dozent',\s*'index_dozent\.html'\)/);
  assert.doesNotMatch(mainSource, /(?:^|[^A-Za-z0-9_])[A-Za-z]:[\\/][A-Za-z0-9_.-]|file:\/\//);
});

test('teacher workplace opens all dashboard links through the desktop window bridge', () => {
  const teacherIndex = path.join(teacherRoot, 'index_dozent.html');
  const content = fs.readFileSync(teacherIndex, 'utf8');
  const anchors = [...content.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  const dashboardLinksWithoutBridge = anchors
    .filter((match) => !externalReferencePattern.test(match[1]))
    .filter((match) => !/\bteacher-open\b/.test(match[0]))
    .map((match) => match[1]);

  assert.match(content, /href="tools\/html-tags-css-dozenteninfo\.html"/);
  assert.match(content, /href="tag_01\/LFZQ8a_tag_01_Webvariante_Dozent\.html"/);
  assert.deepEqual(dashboardLinksWithoutBridge, []);
});
