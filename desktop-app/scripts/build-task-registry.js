const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const teacherTaskRoot = path.join(repoRoot, 'dozent', 'aufgaben');
const teacherSolutionRoot = path.join(repoRoot, 'dozent', 'loesungen');

const dayTopics = {
  1: {
    title: 'HTML-Grundstruktur und CSS-Basics',
    tags: ['html', 'head', 'title', 'meta', 'link', 'body', 'header', 'main', 'section', 'article', 'footer', 'h1', 'h2', 'p', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span'],
    css: ['CSS einbinden', 'Box-Modell', 'Custom Properties', 'DevTools']
  },
  2: {
    title: 'Navigation, Buttons und Flexbox',
    tags: ['nav', 'header', 'button', 'a', 'ul', 'li', 'div', 'section', 'article'],
    css: ['Flexbox', 'Komponenten', 'Hover', 'Navigation']
  },
  3: {
    title: 'Struktur, Karten und Grid',
    tags: ['main', 'aside', 'section', 'article', 'div', 'header', 'footer', 'figure', 'figcaption'],
    css: ['CSS Grid', 'Kartenlayout', 'Layoutvergleich', 'Abstaende']
  },
  4: {
    title: 'Responsive HTML-Elemente',
    tags: ['meta viewport', 'picture', 'source', 'img', 'nav', 'button', 'section', 'main'],
    css: ['Responsive Design', 'Media Queries', 'Mobile First', 'Bildoptimierung']
  },
  5: {
    title: 'Formulare, Webfonts und CSS-Struktur',
    tags: ['style', 'link', 'form', 'label', 'input', 'textarea', 'select', 'option', 'button', 'fieldset', 'legend'],
    css: ['Formulare', 'Webfonts', 'CSS-Struktur', 'Refactoring']
  }
};

const packageSources = [
  {
    category: 'allgemein',
    project: null,
    targetArea: 'allgemein/normal',
    packageType: 'allgemein',
    packageLabel: 'Allgemeine Aufgaben',
    idPrefix: 'allgemein-normal',
    sourceFile: 'dozent/Projektmaterialien/aufgaben/tage_01_bis_05/aufgabenpakete.html',
    fallbackSolutionFile: 'dozent/Projektmaterialien/aufgaben/tage_01_bis_05/loesungen.html'
  },
  {
    category: 'projekt',
    project: 'akkordeon',
    targetArea: 'projekt_akkordeon',
    packageType: 'hauptaufgaben',
    packageLabel: 'Akkordeon Hauptaufgaben',
    idPrefix: 'akkordeon',
    sourceFile: 'dozent/Projektmaterialien/aufgaben/akkordeon/aufgabenpaket_tage_01_bis_05/aufgabenpakete.html',
    fallbackSolutionFile: 'dozent/Projektmaterialien/aufgaben/akkordeon/aufgabenpaket_tage_01_bis_05/loesungen.html'
  },
  {
    category: 'projekt',
    project: 'akkordeon',
    targetArea: 'projekt_akkordeon',
    packageType: 'zusatzaufgaben',
    packageLabel: 'Akkordeon Zusatzaufgaben',
    idPrefix: 'akkordeon-zusatz',
    sourceFile: 'dozent/Projektmaterialien/aufgaben/akkordeon/aufgabenpaket_tage_01_bis_05/zusatz_10_aufgaben_pro_tag/zusatzaufgaben_10_pro_tag.html',
    fallbackSolutionFile: 'dozent/Projektmaterialien/aufgaben/akkordeon/aufgabenpaket_tage_01_bis_05/zusatz_10_aufgaben_pro_tag/loesungen_zusatzaufgaben_10_pro_tag.html'
  },
  {
    category: 'projekt',
    project: 'wunderland',
    targetArea: 'projekt_wunderland',
    packageType: 'hauptaufgaben',
    packageLabel: 'Wunderland Hauptaufgaben',
    idPrefix: 'wunderland',
    sourceFile: 'dozent/Projektmaterialien/aufgaben/wunderland/aufgabenpaket_tage_01_bis_05/aufgabenpakete.html',
    fallbackSolutionFile: 'dozent/Projektmaterialien/aufgaben/wunderland/aufgabenpaket_tage_01_bis_05/loesungen.html'
  },
  {
    category: 'projekt',
    project: 'wunderland',
    targetArea: 'projekt_wunderland',
    packageType: 'zusatzaufgaben',
    packageLabel: 'Wunderland Zusatzaufgaben',
    idPrefix: 'wunderland-zusatz',
    sourceFile: 'dozent/Projektmaterialien/aufgaben/wunderland/aufgabenpaket_tage_01_bis_05/zusatz_10_aufgaben_pro_tag/zusatzaufgaben_10_pro_tag.html',
    fallbackSolutionFile: 'dozent/Projektmaterialien/aufgaben/wunderland/aufgabenpaket_tage_01_bis_05/zusatz_10_aufgaben_pro_tag/loesungen_zusatzaufgaben_10_pro_tag.html'
  }
];

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&auml;/g, 'ae')
    .replace(/&ouml;/g, 'oe')
    .replace(/&uuml;/g, 'ue')
    .replace(/&Auml;/g, 'Ae')
    .replace(/&Ouml;/g, 'Oe')
    .replace(/&Uuml;/g, 'Ue')
    .replace(/&szlig;/g, 'ss')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'aufgabe';
}

function minutesFromMeta(meta) {
  const normalized = String(meta || '').replace(/â€“/g, '-');
  const range = /(\d+)\s*[-–]\s*(\d+)\s*Min/i.exec(normalized);
  if (range) {
    return Math.round((Number(range[1]) + Number(range[2])) / 2);
  }
  const single = /(\d+)\s*Min/i.exec(normalized);
  return single ? Number(single[1]) : 30;
}

function relatedTags(day, title) {
  const topic = dayTopics[day] || dayTopics[1];
  const text = String(title || '').toLowerCase();
  const picked = topic.tags.filter((tag) => text.includes(tag.replace('meta ', '')));
  return [...new Set([...(picked.length ? picked : topic.tags.slice(0, 5))])];
}

function inferTags(task) {
  const topic = dayTopics[task.day] || dayTopics[1];
  const tags = new Set([task.category === 'projekt' ? 'projekt' : 'allgemein', task.packageType, ...topic.css]);
  if (task.project) {
    tags.add(task.project);
  }
  const text = `${task.title} ${task.shortInfo}`.toLowerCase();
  ['html', 'css', 'flexbox', 'grid', 'responsive', 'formular', 'webfont', 'navigation', 'button', 'hover', 'fokus', 'bild'].forEach((term) => {
    if (text.includes(term)) {
      tags.add(term === 'webfont' ? 'webfonts' : term);
    }
  });
  return [...tags].slice(0, 10);
}

function ensureTaskAnchors(html, absoluteTaskFile) {
  let changed = false;
  let nextHtml = html.replace(/<li\s+class="([^"]*\btask\b[^"]*)"(?!\s+id=)/g, (match, className, offset, full) => {
    const before = full.slice(0, offset);
    const dayMatch = [...before.matchAll(/<section\s+class="day"\s+id="tag-?(\d{1,2})"/g)].pop();
    const day = dayMatch ? dayMatch[1].padStart(2, '0') : '01';
    const sectionStart = dayMatch ? dayMatch.index : 0;
    const previous = before.slice(sectionStart).match(/<li\s+class="[^"]*\btask\b[^"]*"/g) || [];
    const anchor = `t${day}-p${String(previous.length + 1).padStart(2, '0')}`;
    changed = true;
    return `<li class="${className}" id="${anchor}"`;
  });
  nextHtml = nextHtml.replace(/<li\s+class="([^"]*\btask\b[^"]*)"\s+id="([^"]+)"/g, '<li class="$1" id="$2"');
  if (changed) {
    fs.writeFileSync(absoluteTaskFile, nextHtml, 'utf8');
  }
  return nextHtml;
}

function solutionFileFromHref(source, href, anchor) {
  if (!href) {
    return `${source.fallbackSolutionFile}#${anchor}`;
  }
  const taskDir = path.posix.dirname(source.sourceFile);
  return `${path.posix.normalize(path.posix.join(taskDir, href.split('#')[0]))}#${href.includes('#') ? href.split('#')[1] : anchor}`;
}

function shortInfoFromBody(body) {
  const paragraph = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(body);
  return decodeHtml(paragraph && paragraph[1]).slice(0, 220) || 'Tagesaufgabe aus dem bestehenden Aufgabenpaket.';
}

function parsePackage(source) {
  const absoluteTaskFile = path.join(repoRoot, source.sourceFile);
  if (!fs.existsSync(absoluteTaskFile)) {
    return [];
  }
  const html = ensureTaskAnchors(fs.readFileSync(absoluteTaskFile, 'utf8'), absoluteTaskFile);
  const taskPattern = /<li\s+class="([^"]*\btask\b[^"]*)"\s+id="(t(\d{1,2})-([a-z])(\d{1,2}))"[^>]*>([\s\S]*?)<\/li>/g;
  const tasks = [];
  let match;
  while ((match = taskPattern.exec(html))) {
    const [, className, anchor, dayText, group, number, body] = match;
    const day = Number(dayText);
    if (day < 1 || day > 5) {
      continue;
    }
    const titleMatch = /<h[34][^>]*>([\s\S]*?)<\/h[34]>/i.exec(body);
    const metaMatch = /<(?:div|span)\s+class="task-meta"[^>]*>([\s\S]*?)<\/(?:div|span)>/i.exec(body);
    const solutionMatch = /L(?:Ã¶|ö|oe|o)sung:\s*<a\s+href="([^"]+)"/i.exec(body);
    const title = decodeHtml(titleMatch && titleMatch[1]) || `Aufgabe ${anchor.toUpperCase()}`;
    const meta = decodeHtml(metaMatch && metaMatch[1]);
    const daySlug = String(day).padStart(2, '0');
    const difficulty = className.includes('hard') || group === 's' || /schwer/i.test(meta) ? 'schwer' : 'normal';
    const targetDifficulty = source.category === 'allgemein' ? difficulty : null;
    const id = source.category === 'allgemein'
      ? `tag${daySlug}-allgemein-${difficulty}-${String(tasks.filter((item) => item.day === day && item.difficulty === difficulty).length + 1).padStart(3, '0')}`
      : `tag${daySlug}-${source.idPrefix}-${String(tasks.filter((item) => item.day === day).length + 1).padStart(3, '0')}`;
    const task = {
      id,
      sourceAnchor: anchor,
      day,
      category: source.category,
      project: source.project,
      difficulty,
      packageType: source.packageType,
      packageLabel: source.packageLabel,
      targetArea: targetDifficulty ? `allgemein/${targetDifficulty}` : source.targetArea,
      number: anchor.toUpperCase(),
      title,
      shortInfo: shortInfoFromBody(body),
      estimatedMinutes: minutesFromMeta(meta),
      relatedHtmlTags: relatedTags(day, title),
      taskFile: '',
      solutionFile: '',
      sourceFile: `${source.sourceFile}#${anchor}`,
      sourceSolutionFile: solutionFileFromHref(source, solutionMatch && solutionMatch[1], anchor),
      standalone: true,
      taskUnlocked: false,
      solutionUnlocked: false
    };
    task.tags = inferTags(task);
    tasks.push(task);
  }
  return tasks;
}

function syntheticGeneralHardTasks() {
  return Object.entries(dayTopics).map(([dayText, topic]) => {
    const day = Number(dayText);
    const daySlug = String(day).padStart(2, '0');
    const task = {
      id: `tag${daySlug}-allgemein-schwer-900`,
      sourceAnchor: `tag${daySlug}-hard-synthesis`,
      day,
      category: 'allgemein',
      project: null,
      difficulty: 'schwer',
      packageType: 'allgemein',
      packageLabel: 'Allgemeine Aufgaben schwer',
      targetArea: 'allgemein/schwer',
      number: `T${day}-S`,
      title: `${topic.title}: Transferaufgabe`,
      shortInfo: `Schwere Transferaufgabe passend zum HTML/CSS-Tag-Tool: ${topic.tags.slice(0, 8).join(', ')}.`,
      estimatedMinutes: 60,
      tags: ['allgemein', 'schwer', ...topic.css],
      relatedHtmlTags: topic.tags,
      taskFile: '',
      solutionFile: '',
      sourceFile: 'dozent/tools/html-css-tag-tool-dozent.html',
      sourceSolutionFile: '',
      standalone: true,
      taskUnlocked: false,
      solutionUnlocked: false
    };
    return task;
  });
}

function ensureTargetDirectories() {
  [teacherTaskRoot, teacherSolutionRoot].forEach((root) => {
    for (let day = 1; day <= 5; day += 1) {
      ['allgemein/normal', 'allgemein/schwer', 'projekt_akkordeon', 'projekt_wunderland'].forEach((area) => {
        fs.mkdirSync(path.join(root, `tag_${String(day).padStart(2, '0')}`, area), { recursive: true });
      });
    }
  });
}

function areaLabel(task) {
  if (task.category === 'allgemein') {
    return `Allgemein / ${task.difficulty}`;
  }
  return task.project === 'akkordeon' ? 'Projekt Akkordeon' : 'Projekt Wunderland';
}

function relativeFrom(filePath, targetRel) {
  return path.posix.relative(path.posix.dirname(rel(filePath)), targetRel).replace(/^$/, '.');
}

function taskCardHtml(task, solutionMode = false) {
  const href = solutionMode ? task.sourceSolutionFile : task.sourceFile;
  const safeHref = href ? relativeFrom(path.join(repoRoot, solutionMode ? task.solutionFile.split('#')[0] : task.taskFile.split('#')[0]), href.split('#')[0]) + (href.includes('#') ? `#${href.split('#')[1]}` : '') : '';
  return `<article class="task-card" id="${task.id}">
    <p class="meta">Tag ${task.day} · ${escapeHtml(areaLabel(task))} · ${escapeHtml(task.difficulty)} · ca. ${task.estimatedMinutes} Min.</p>
    <h3>${escapeHtml(task.title)}</h3>
    <p>${escapeHtml(task.shortInfo)}</p>
    <p class="tags">${task.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</p>
    <p class="tags html-tags">${task.relatedHtmlTags.map((tag) => `<code>${escapeHtml(tag)}</code>`).join('')}</p>
    <p><a class="button" href="${escapeHtml(safeHref || '#')}">${solutionMode ? 'Urspruengliche Loesung oeffnen' : 'Urspruengliche Aufgabe oeffnen'}</a></p>
  </article>`;
}

function pageTemplate(title, intro, cards, nav = '') {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--brand:#003964;--accent:#00abc7;--ink:#163044;--muted:#526575;--line:#d8e8ee;--soft:#f3fbff;--card:#fff;--ok:#0b6b3a}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f9fb;color:var(--ink);line-height:1.5}header{background:var(--brand);color:#fff;padding:28px 18px}main{width:min(1180px,100%);margin:auto;padding:18px;display:grid;gap:16px}.wrap{width:min(1180px,100%);margin:auto}.toplink{color:#fff;font-weight:800}.intro,.task-card,.nav-card{border:1px solid var(--line);border-radius:8px;background:var(--card);box-shadow:0 14px 36px rgba(0,57,100,.08);padding:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.task-card{display:grid;gap:8px}.task-card h3{margin:0;color:var(--brand);font-size:20px}.task-card p{margin:0}.meta{color:var(--muted);font-weight:800}.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span,.tags code{padding:4px 7px;border-radius:999px;background:#e8faff;color:var(--brand);font-weight:800;font-size:12px}.html-tags code{font-family:Consolas,monospace}.button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:7px 10px;border-radius:8px;background:var(--brand);color:#fff;text-decoration:none;font-weight:900}.button.secondary{background:#fff;color:var(--brand);border:1px solid var(--line)}nav{display:flex;flex-wrap:wrap;gap:8px}nav a{color:var(--brand);font-weight:900}.section-title{margin:8px 0 0;color:var(--brand)}@media(max-width:720px){.button{width:100%}}
  </style>
</head>
<body>
<header><div class="wrap"><a class="toplink" href="${nav || '../index.html'}">Zurueck</a><h1>${escapeHtml(title)}</h1><p>${escapeHtml(intro)}</p></div></header>
<main>${cards}</main>
</body>
</html>`;
}

function writeAreaPages(tasks) {
  for (let day = 1; day <= 5; day += 1) {
    ['allgemein/normal', 'allgemein/schwer', 'projekt_akkordeon', 'projekt_wunderland'].forEach((area) => {
      const daySlug = String(day).padStart(2, '0');
      const areaTasks = tasks.filter((task) => task.day === day && task.targetArea === area);
      const taskFile = path.join(teacherTaskRoot, `tag_${daySlug}`, area, 'aufgaben.html');
      const solutionFile = path.join(teacherSolutionRoot, `tag_${daySlug}`, area, 'loesungen.html');
      areaTasks.forEach((task) => {
        task.taskFile = `${rel(taskFile)}#${task.id}`;
        task.solutionFile = task.sourceSolutionFile ? `${rel(solutionFile)}#${task.id}` : '';
      });
      const label = area.replace('allgemein/', 'Allgemein ').replace('projekt_akkordeon', 'Projekt Akkordeon').replace('projekt_wunderland', 'Projekt Wunderland');
      fs.writeFileSync(taskFile, pageTemplate(`Aufgaben Tag ${day} - ${label}`, dayTopics[day].title, `<section class="grid">${areaTasks.map((task) => taskCardHtml(task)).join('\n')}</section>`, '../../index.html'), 'utf8');
      fs.writeFileSync(solutionFile, pageTemplate(`Loesungen Tag ${day} - ${label}`, 'Loesungsuebersicht nur fuer den Dozentenbereich.', `<section class="grid">${areaTasks.map((task) => taskCardHtml(task, true)).join('\n')}</section>`, '../../index.html'), 'utf8');
    });
  }
}

function writeDayIndexes(tasks, root, solutionMode = false) {
  for (let day = 1; day <= 5; day += 1) {
    const daySlug = String(day).padStart(2, '0');
    const dayDir = path.join(root, `tag_${daySlug}`);
    const cards = ['allgemein/normal', 'allgemein/schwer', 'projekt_akkordeon', 'projekt_wunderland'].map((area) => {
      const areaTasks = tasks.filter((task) => task.day === day && task.targetArea === area);
      const fileName = solutionMode ? 'loesungen.html' : 'aufgaben.html';
      return `<section class="nav-card"><h2 class="section-title">${escapeHtml(area)}</h2><p>${areaTasks.length} Eintraege</p><p><a class="button secondary" href="${area}/${fileName}">Bereich oeffnen</a></p></section>`;
    }).join('\n');
    fs.writeFileSync(path.join(dayDir, 'index.html'), pageTemplate(`${solutionMode ? 'Loesungen' : 'Aufgaben'} Tag ${day}`, dayTopics[day].title, `<section class="grid">${cards}</section>`, '../index.html'), 'utf8');
  }
  const overview = Array.from({ length: 5 }, (_, index) => {
    const day = index + 1;
    const count = tasks.filter((task) => task.day === day).length;
    return `<section class="nav-card"><h2>Tag ${day}</h2><p>${escapeHtml(dayTopics[day].title)}</p><p>${count} Eintraege</p><p><a class="button secondary" href="tag_${String(day).padStart(2, '0')}/index.html">Tag oeffnen</a></p></section>`;
  }).join('\n');
  fs.writeFileSync(path.join(root, 'index.html'), pageTemplate(solutionMode ? 'Loesungen Gesamtuebersicht' : 'Aufgaben Gesamtuebersicht', 'Zentrale, datengetriebene Struktur fuer die Dozentenansicht.', `<section class="grid">${overview}</section>`, '../index_dozent.html'), 'utf8');
}

function buildReport(tasks) {
  const countsByDay = Object.fromEntries([1, 2, 3, 4, 5].map((day) => [day, tasks.filter((task) => task.day === day).length]));
  const noSolutions = tasks.filter((task) => !task.solutionFile).map((task) => `- ${task.id}: ${task.title}`);
  const duplicateTitles = [...tasks.reduce((map, task) => {
    const key = `${task.day}:${slug(task.title)}`;
    map.set(key, [...(map.get(key) || []), task]);
    return map;
  }, new Map()).values()].filter((items) => items.length > 1);
  return `# Aufgaben-Migrationsbericht

Stand: ${new Date().toISOString()}

## Gefundene Quellen
${packageSources.map((source) => `- ${source.sourceFile}`).join('\n')}
- dozent/tools/html-css-tag-tool-dozent.html (fachliche Tag-Zuordnung und schwere Transferaufgaben)

## Neue Struktur
- dozent/aufgaben/tag_01 bis dozent/aufgaben/tag_05
- dozent/loesungen/tag_01 bis dozent/loesungen/tag_05
- Je Tag: allgemein/normal, allgemein/schwer, projekt_akkordeon, projekt_wunderland

## Mengen
${Object.entries(countsByDay).map(([day, count]) => `- Tag ${day}: ${count} Aufgaben`).join('\n')}
- Allgemein normal: ${tasks.filter((task) => task.category === 'allgemein' && task.difficulty === 'normal').length}
- Allgemein schwer: ${tasks.filter((task) => task.category === 'allgemein' && task.difficulty === 'schwer').length}
- Akkordeon-Aufgaben: ${tasks.filter((task) => task.project === 'akkordeon').length}
- Wunderland-Aufgaben: ${tasks.filter((task) => task.project === 'wunderland').length}
- Zugeordnete Loesungen: ${tasks.filter((task) => task.solutionFile).length}

## Aufgaben ohne Loesung
${noSolutions.length ? noSolutions.join('\n') : '- Keine'}

## Erkannte Duplikate
${duplicateTitles.length ? duplicateTitles.map((items) => `- ${items[0].title}: ${items.map((item) => item.id).join(', ')}`).join('\n') : '- Keine identischen kanonischen Titel pro Tag erkannt.'}

## Erhaltene Standalone-Pfade
${packageSources.map((source) => `- ${source.sourceFile}`).join('\n')}
${packageSources.map((source) => `- ${source.fallbackSolutionFile}`).join('\n')}

## Neue Registry-Dateien
- desktop-app/app/lib/task-packages.json
- teilnehmer/assets/data/task-packages.json (ohne direkte solutionFile-Pfade)

## Tests
- Ausgefuehrt: pnpm test
- Ausgefuehrt: pnpm run verify
- Zusaetzlich geprueft: node --check fuer build-task-registry.js, classroom-server.js und teilnehmer/assets/js/task-packages.js

## Offene Punkte
- Die schweren allgemeinen Transferaufgaben wurden aus der Tag-Struktur des HTML/CSS-Tag-Tools synthetisiert, weil in den vorhandenen allgemeinen Paketquellen vor allem normale Tagespakete enthalten sind.
- Teilnehmer sehen Loesungslinks weiterhin nur ueber die Electron-/Kursserver-Freigabe.
`;
}

function participantSafeRegistry(registry) {
  return {
    ...registry,
    packages: registry.packages.map(({ solutionFile, ...pkg }) => pkg),
    tasks: registry.tasks.map(({ solutionFile, sourceSolutionFile, ...task }) => ({
      ...task,
      solutionFile: undefined
    })).map((task) => {
      const clean = { ...task };
      delete clean.solutionFile;
      return clean;
    })
  };
}

function build() {
  ensureTargetDirectories();
  const parsedTasks = packageSources.flatMap(parsePackage);
  const tasks = [...parsedTasks, ...syntheticGeneralHardTasks()]
    .sort((left, right) => left.day - right.day || left.targetArea.localeCompare(right.targetArea) || left.id.localeCompare(right.id));
  writeAreaPages(tasks);
  writeDayIndexes(tasks, teacherTaskRoot, false);
  writeDayIndexes(tasks, teacherSolutionRoot, true);

  const registry = {
    version: 2,
    generatedAt: new Date().toISOString(),
    sourceMode: 'dozent-aufgaben-structure',
    packages: [
      { id: 'allgemein', category: 'allgemein', project: null, packageType: 'allgemein', label: 'Allgemeine Aufgaben', taskFile: 'dozent/aufgaben/index.html', solutionFile: 'dozent/loesungen/index.html' },
      { id: 'projekt-akkordeon', category: 'projekt', project: 'akkordeon', packageType: 'projekt', label: 'Projekt Akkordeon', taskFile: 'dozent/aufgaben/index.html', solutionFile: 'dozent/loesungen/index.html' },
      { id: 'projekt-wunderland', category: 'projekt', project: 'wunderland', packageType: 'projekt', label: 'Projekt Wunderland', taskFile: 'dozent/aufgaben/index.html', solutionFile: 'dozent/loesungen/index.html' }
    ],
    tasks
  };

  fs.mkdirSync(path.join(repoRoot, 'desktop-app', 'app', 'lib'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'teilnehmer', 'assets', 'data'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'desktop-app', 'app', 'lib', 'task-packages.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(repoRoot, 'teilnehmer', 'assets', 'data', 'task-packages.json'), `${JSON.stringify(participantSafeRegistry(registry), null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(teacherTaskRoot, 'AUFGABEN_MIGRATION_REPORT.md'), buildReport(tasks), 'utf8');
  console.log(`Wrote ${tasks.length} tasks into the canonical dozent/aufgaben structure.`);
}

build();
