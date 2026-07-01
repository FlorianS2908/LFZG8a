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
  const cleanReference = decodeURI(stripHashAndQuery(reference.trim()));
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

test('teacher tag tool links back to the teacher overview', () => {
  const tagTool = path.join(teacherRoot, 'tools', 'html-tags-css-dozenteninfo.html');
  const content = fs.readFileSync(tagTool, 'utf8');

  assert.match(content, /href="\.\.\/index_dozent\.html"/);
  assert.match(content, /Zurück zur Dozentenübersicht/);
});

test('teacher tag tool opens teacher info automatically when a tag card is opened', () => {
  const tagTool = path.join(teacherRoot, 'tools', 'html-tags-css-dozenteninfo.html');
  const content = fs.readFileSync(tagTool, 'utf8');

  assert.match(content, /function openTeacherInfoForCard\(card\)/);
  assert.match(content, /summary\.addEventListener\('click'/);
  assert.match(content, /if \(!card\.open\)/);
  assert.match(content, /openTeacherInfoForCard\(card\)/);
});

test('teacher tag tool provides five css variants with richer demo content', () => {
  const tagTools = [
    path.join(teacherRoot, 'tools', 'html-tags-css-dozenteninfo.html'),
    path.join(participantRoot, 'tools', 'html-tags-css-uebersicht.html')
  ];

  tagTools.forEach((tagTool) => {
    const content = fs.readFileSync(tagTool, 'utf8');
    const cardCount = (content.match(/<details class="tag-card"/g) || []).length;

    assert.ok(cardCount > 0);
    [1, 2, 3, 4, 5].forEach((variant) => {
      assert.equal((content.match(new RegExp(`class="variant-input v${variant}"`, 'g')) || []).length, cardCount);
      assert.equal((content.match(new RegExp(`class="tab-${variant}"`, 'g')) || []).length, cardCount);
      assert.equal((content.match(new RegExp(`class="code code-${variant}"`, 'g')) || []).length, cardCount);
    });
    assert.equal((content.match(/class="demo-context"/g) || []).length, cardCount);
    assert.match(content, /grid-template-columns/);
    assert.match(content, /box-shadow/);
    assert.match(content, /linear-gradient/);
  });
});

test('additional assignments are integrated by role and day', () => {
  const participantIndex = fs.readFileSync(path.join(participantRoot, 'index_teilnehmer.html'), 'utf8');
  const teacherIndex = fs.readFileSync(path.join(teacherRoot, 'index_dozent.html'), 'utf8');
  const participantAdditionalIndex = path.join(participantRoot, 'zusatzaufgaben', 'index.html');
  const teacherAdditionalIndex = path.join(teacherRoot, 'zusatzaufgaben', 'index.html');
  const expectedDays = [
    'tag_01_html_css_basis',
    'tag_02_navigation_flexbox',
    'tag_03_grid_layout_daten',
    'tag_04_responsive_medien',
    'tag_05_formulare_webfonts_projekt'
  ];

  assert.match(participantIndex, /href="zusatzaufgaben\/index\.html"/);
  assert.match(teacherIndex, /href="zusatzaufgaben\/index\.html"/);
  assert.equal(fs.existsSync(participantAdditionalIndex), true);
  assert.equal(fs.existsSync(teacherAdditionalIndex), true);

  expectedDays.forEach((day) => {
    assert.equal(fs.existsSync(path.join(participantRoot, 'zusatzaufgaben', day, 'aufgaben')), true);
    assert.equal(fs.existsSync(path.join(participantRoot, 'zusatzaufgaben', day, 'loesungen')), false);
    assert.equal(fs.existsSync(path.join(teacherRoot, 'zusatzaufgaben', day, 'aufgaben')), true);
    assert.equal(fs.existsSync(path.join(teacherRoot, 'zusatzaufgaben', day, 'loesungen')), true);
  });

  const participantSolutionFiles = walkFiles(path.join(participantRoot, 'zusatzaufgaben'), () => true)
    .filter((filePath) => /l(ö|oe|o)sung/i.test(path.basename(filePath)));

  assert.deepEqual(participantSolutionFiles.map((filePath) => path.relative(participantRoot, filePath)), []);
});
