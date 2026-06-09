import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, 'site');
const htmlRoot = path.join(__dirname, 'html');
const port = Number(process.env.PORT || 3002);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function safePath(root, requestPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const normalized = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(root, normalized);
  const relative = path.relative(root, fullPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return fullPath;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes.get(ext) || 'application/octet-stream';
  const cacheControl = filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=300';

  fs.createReadStream(filePath)
    .on('error', () => send(res, 500, 'Internal Server Error', { 'content-type': 'text/plain; charset=utf-8' }))
    .pipe(res.writeHead(200, { 'content-type': contentType, 'cache-control': cacheControl }));
}

function htmlForRoute(urlPath) {
  const route = urlPath.replace(/\/+$/, '') || '/';

  if (route === '/') return path.join(htmlRoot, 'index.html');
  if (route === '/data') return path.join(htmlRoot, 'data.html');
  if (route === '/guides') return path.join(htmlRoot, 'guides.html');
  if (route === '/login') return path.join(htmlRoot, 'login.html');

  const guideMatch = route.match(/^\/guides\/([^/]+)$/);
  if (guideMatch) {
    return path.join(htmlRoot, 'guides', `${guideMatch[1]}.html`);
  }

  return path.join(htmlRoot, '_not-found.html');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const staticPath = safePath(siteRoot, url.pathname);

  if (staticPath && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    serveFile(res, staticPath);
    return;
  }

  const htmlPath = htmlForRoute(url.pathname);
  if (fs.existsSync(htmlPath)) {
    serveFile(res, htmlPath);
    return;
  }

  send(res, 404, 'Not Found', { 'content-type': 'text/plain; charset=utf-8' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`TFTBlog static MVP server listening on ${port}`);
});
