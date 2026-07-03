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

function createClassroomServer({ appData, participantRoot, port = 0 }) {
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
