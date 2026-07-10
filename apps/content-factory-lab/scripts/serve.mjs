import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const startPort = Number(process.env.PORT || 5174);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = normalize(join(root, relative));
  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < startPort + 20) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`ContentFactory Lab: http://localhost:${port}`);
  });
}

listen(startPort);
