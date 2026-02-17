import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};

  const content = fs.readFileSync(envPath, 'utf8');
  return content.split('\n').reduce((acc, line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return acc;
    const index = clean.indexOf('=');
    if (index === -1) return acc;
    const key = clean.slice(0, index).trim();
    const value = clean.slice(index + 1).trim();
    acc[key] = value;
    return acc;
  }, {});
}

const envValues = loadEnv();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/env.js') {
    const runtimeConfig = {
      VITE_FLOW_URL: envValues.VITE_FLOW_URL || process.env.VITE_FLOW_URL || '',
      VITE_FLOW_KEY: envValues.VITE_FLOW_KEY || process.env.VITE_FLOW_KEY || '',
    };

    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(`window.__APP_CONFIG__ = ${JSON.stringify(runtimeConfig)};`);
    return;
  }

  const requestedPath =
    requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.join(__dirname, requestedPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
