const fs = require('fs');
const path = require('path');

function createSafeLogger({ logPath = '', consoleRef = console, maxBytes = 2 * 1024 * 1024 } = {}) {
  function write(level, event, details = {}) {
    const record = sanitizeRecord({ timestamp: new Date().toISOString(), level, event: String(event || ''), details });
    try { (consoleRef[level] || consoleRef.log)?.(record.event, record.details); } catch (error) { if (error?.code !== 'EPIPE') appendFallback(error); }
    if (logPath) {
      try {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        if (fs.existsSync(logPath) && fs.statSync(logPath).size > maxBytes) fs.renameSync(logPath, `${logPath}.1`);
        fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, 'utf8');
      } catch { /* Logging must never become a domain failure. */ }
    }
  }
  function appendFallback(error) {
    if (!logPath) return;
    try { fs.appendFileSync(logPath, `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', event: 'LOGGER_WRITE_FAILED', details: { code: error?.code || 'LOG_ERROR' } })}\n`, 'utf8'); } catch { /* best effort */ }
  }
  return { info: (event, details) => write('info', event, details), error: (event, details) => write('error', event, details), warn: (event, details) => write('warn', event, details) };
}

function installBrokenPipeGuards(streams = [process.stdout, process.stderr]) {
  streams.filter(Boolean).forEach((stream) => {
    if (stream.__contentFactoryEpipeGuard) return;
    Object.defineProperty(stream, '__contentFactoryEpipeGuard', { value: true });
    stream.on?.('error', (error) => { if (error?.code !== 'EPIPE') process.emitWarning?.(`Ausgabestreamfehler: ${error?.code || error?.message || 'unbekannt'}`); });
  });
}

function sanitizeRecord(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (/api.?key|authorization|secret|token|textPreview|extractedContent|file_data/i.test(key)) return undefined;
    if (typeof item === 'string' && item.length > 500) return `${item.slice(0, 500)}…`;
    return item;
  }));
}

module.exports = { createSafeLogger, installBrokenPipeGuards, sanitizeRecord };
