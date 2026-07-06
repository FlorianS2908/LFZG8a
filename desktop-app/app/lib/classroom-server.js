const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function getLanAddresses() {
  return Object.values(os.networkInterfaces()).flatMap((addresses) => (
    (addresses || [])
      .filter((address) => !address.internal && address.family === 'IPv4')
      .map((address) => address.address)
  ));
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  response.end(JSON.stringify(data));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error('Request zu gross.'));
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Ungueltiges JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function serveStaticFile(response, rootDir, requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split('?')[0]);
  const relativePath = cleanPath === '/' || cleanPath === '/teilnehmer'
    ? 'index_teilnehmer.html'
    : cleanPath.replace(/^\/teilnehmer\/?/, '');
  const filePath = path.resolve(rootDir, relativePath || 'index_teilnehmer.html');

  if (!isInside(rootDir, filePath) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Nicht gefunden.');
    return;
  }

  response.writeHead(200, {
    'content-type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).pipe(response);
}

function taskPublicView(task, release) {
  return {
    id: task.id,
    category: task.category,
    project: task.project,
    packageType: task.packageType,
    packageLabel: task.packageLabel,
    day: task.day,
    difficulty: task.difficulty,
    number: task.number,
    title: task.title,
    shortInfo: task.shortInfo,
    estimatedMinutes: task.estimatedMinutes,
    tags: task.tags || [],
    relatedHtmlTags: task.relatedHtmlTags || [],
    taskUnlocked: release.taskUnlocked === true,
    solutionUnlocked: release.solutionUnlocked === true
  };
}

function getReleasedTasks(taskPackageRegistry, taskReleases, participantReleases, includeLocked = false) {
  return taskPackageRegistry.tasks
    .filter((task) => participantReleases[`tag_${String(task.day).padStart(2, '0')}_tasks`] === true)
    .map((task) => taskPublicView(task, taskReleases[task.id] || {}))
    .filter((task) => includeLocked || task.taskUnlocked);
}

function renderTaskDocument(task, release, kind) {
  const isSolution = kind === 'solution';
  const allowed = isSolution ? release.solutionUnlocked === true : release.taskUnlocked === true;
  const title = isSolution ? `Loesung: ${task.title}` : task.title;
  const statusText = isSolution
    ? 'Loesung wurde freigegeben.'
    : 'Aufgabe wurde freigegeben.';
  if (!allowed) {
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Gesperrt</title><style>body{font-family:Arial,sans-serif;margin:0;padding:2rem;background:#eef6fa;color:#003964}.card{max-width:820px;margin:auto;background:#fff;border:1px solid #d8e8ee;border-top:6px solid #00abc7;border-radius:8px;padding:1.5rem}</style></head><body><main class="card"><h1>${isSolution ? 'Loesung noch nicht freigegeben.' : 'Diese Aufgabe wurde vom Dozenten noch nicht freigegeben.'}</h1><p>Bitte warte auf die Freigabe im Kurs.</p></main></body></html>`;
  }
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:2rem;background:#eef6fa;color:#003964;line-height:1.5}.card{max-width:920px;margin:auto;background:#fff;border:1px solid #d8e8ee;border-top:6px solid #00abc7;border-radius:8px;padding:1.5rem;box-shadow:0 18px 48px rgba(0,57,100,.1)}.pill{display:inline-flex;margin:.2rem .25rem .2rem 0;padding:.3rem .55rem;border-radius:999px;background:#e8faff;font-weight:800}.ok{color:#0b6b3a;font-weight:900}</style></head><body><main class="card"><p class="ok">${statusText}</p><h1>${title}</h1><p><strong>Projekt:</strong> ${task.project} · <strong>Paket:</strong> ${task.packageLabel} · <strong>Tag:</strong> ${task.day} · <strong>Schwierigkeit:</strong> ${task.difficulty}</p><p><strong>Bearbeitungszeit:</strong> ca. ${task.estimatedMinutes} Minuten</p><p>${(task.tags || []).map((tag) => `<span class="pill">${tag}</span>`).join('')}</p><p>${isSolution ? 'Die konkrete Musterloesung wird vom Dozenten ueber die Kursansicht nachbesprochen. Diese Ansicht zeigt bewusst keine gesperrten Loesungslisten.' : 'Oeffne das passende Aufgabenpaket im Unterricht oder arbeite anhand der Aufgabenbeschreibung in der Kursansicht. Die Loesung bleibt separat steuerbar.'}</p></main></body></html>`;
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8'
  });
  response.end(html);
}

function createClassroomServer({ appData, participantRoot, taskPackageRegistry = { tasks: [] }, port = 0 }) {
  let server = null;
  let info = {
    running: false,
    port: null,
    urls: []
  };

  async function handleRequest(request, response) {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'OPTIONS') {
      sendJson(response, 200, { ok: true });
      return;
    }

    try {
      if (url.pathname === '/api/releases' && request.method === 'GET') {
        sendJson(response, 200, appData.getParticipantReleases());
        return;
      }

      if (url.pathname === '/api/task-packages' && request.method === 'GET') {
        const participantReleases = appData.getParticipantReleases();
        sendJson(response, 200, {
          packages: taskPackageRegistry.packages || [],
          daysOpen: Object.fromEntries([1, 2, 3, 4, 5].map((day) => [
            day,
            participantReleases[`tag_${String(day).padStart(2, '0')}_tasks`] === true
          ])),
          tasks: getReleasedTasks(taskPackageRegistry, appData.getTaskReleases(), participantReleases)
        });
        return;
      }

      if (url.pathname === '/api/task-packages/view' && request.method === 'GET') {
        const taskId = url.searchParams.get('id');
        const kind = url.searchParams.get('kind') === 'solution' ? 'solution' : 'task';
        const task = taskPackageRegistry.tasks.find((item) => item.id === taskId);
        if (!task) {
          sendJson(response, 404, { error: 'Aufgabe nicht gefunden.' });
          return;
        }
        const release = appData.getTaskReleases()[task.id] || {};
        const participantReleases = appData.getParticipantReleases();
        const dayOpen = participantReleases[`tag_${String(task.day).padStart(2, '0')}_tasks`] === true;
        const allowed = dayOpen && (kind === 'solution' ? release.solutionUnlocked === true : release.taskUnlocked === true);
        sendHtml(response, allowed ? 200 : 403, renderTaskDocument(task, release, kind));
        return;
      }

      if (url.pathname === '/api/participants' && request.method === 'GET') {
        sendJson(response, 200, appData.listParticipants());
        return;
      }

      if (url.pathname === '/api/participants/profile' && request.method === 'POST') {
        sendJson(response, 200, appData.saveParticipantProfile(await readRequestBody(request)));
        return;
      }

      if (url.pathname === '/api/participants/progress' && request.method === 'POST') {
        const body = await readRequestBody(request);
        const participant = appData.updateParticipantProgress(body.participantId, body.status);
        sendJson(response, participant ? 200 : 404, participant || { error: 'Teilnehmer nicht gefunden.' });
        return;
      }

      if (url.pathname === '/' || url.pathname.startsWith('/teilnehmer')) {
        serveStaticFile(response, participantRoot, url.pathname);
        return;
      }

      sendJson(response, 404, { error: 'Nicht gefunden.' });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
  }

  function start() {
    if (server) {
      return Promise.resolve(info);
    }

    server = http.createServer((request, response) => {
      handleRequest(request, response);
    });

    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '0.0.0.0', () => {
        const address = server.address();
        const addresses = getLanAddresses();
        info = {
          running: true,
          port: address.port,
          urls: [
            `http://localhost:${address.port}/teilnehmer`,
            ...addresses.map((ipAddress) => `http://${ipAddress}:${address.port}/teilnehmer`)
          ]
        };
        resolve(info);
      });
    });
  }

  function stop() {
    return new Promise((resolve) => {
      if (!server) {
        resolve();
        return;
      }
      server.close(() => {
        server = null;
        info = {
          running: false,
          port: null,
          urls: []
        };
        resolve();
      });
    });
  }

  function getInfo() {
    return info;
  }

  return {
    start,
    stop,
    getInfo
  };
}

module.exports = {
  createClassroomServer,
  getLanAddresses
};
