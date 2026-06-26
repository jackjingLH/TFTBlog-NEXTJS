import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { listDataReferences } from '../lib/data-reference-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(__dirname, 'site');
const htmlRoot = path.join(__dirname, 'html');
const port = Number(process.env.PORT || 3002);
const defaultDatabaseUrl = 'file:./data/tftblog.sqlite';

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

function sendJson(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data), {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
}

function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must use a file: SQLite URL.');
  }

  const filePath = databaseUrl.slice('file:'.length);
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function openGuideDatabase() {
  const databasePath = resolveDatabasePath();
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Guide database not found: ${databasePath}`);
  }

  return new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY);
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function tableColumns(db, tableName) {
  return all(db, `PRAGMA table_info(${tableName})`);
}

function mapGuideRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    coverUrl: row.cover_url,
    source: row.source,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    status: row.status,
    readingMinutes: row.reading_minutes,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    tags: row.tags ? row.tags.split('\n').filter(Boolean) : [],
    pinned: row.pinned === 1,
    pinnedOrder: row.pinned_order,
  };
}

async function selectGuides(db, whereClause = '', params = []) {
  const columns = await tableColumns(db, 'guides');
  const columnNames = new Set(columns.map((column) => column.name));
  const pinnedSelect = columnNames.has('pinned') ? 'g.pinned' : '0';
  const pinnedOrderSelect = columnNames.has('pinned_order') ? 'g.pinned_order' : 'NULL';

  const rows = await all(
    db,
    `
      SELECT
        g.id,
        g.slug,
        g.title,
        g.excerpt,
        g.content_markdown,
        g.cover_url,
        g.source,
        g.updated_at,
        g.published_at,
        g.status,
        g.reading_minutes,
        g.created_at,
        g.modified_at,
        ${pinnedSelect} AS pinned,
        ${pinnedOrderSelect} AS pinned_order,
        group_concat(t.tag, char(10)) AS tags
      FROM guides g
      LEFT JOIN guide_tags t ON t.guide_id = g.id
      ${whereClause}
      GROUP BY g.id
      ORDER BY
        pinned DESC,
        CASE WHEN pinned = 1 THEN pinned_order ELSE NULL END ASC,
        g.updated_at DESC,
        g.id DESC
    `,
    params,
  );
  return rows.map(mapGuideRow);
}

function guideSummary(guide) {
  return {
    slug: guide.slug,
    title: guide.title,
    excerpt: guide.excerpt,
    coverUrl: guide.coverUrl,
    source: guide.source,
    updatedAt: guide.updatedAt,
    publishedAt: guide.publishedAt,
    readingMinutes: guide.readingMinutes,
    tags: guide.tags,
    pinned: guide.pinned,
  };
}

async function handleGuideApi(url, res) {
  if (url.pathname !== '/api/guides' && !url.pathname.startsWith('/api/guides/')) {
    return false;
  }

  let db;
  try {
    db = openGuideDatabase();

    if (url.pathname === '/api/guides') {
      const allGuides = (await selectGuides(db, "WHERE g.status = 'published'")).map(guideSummary);

      // Parse pagination params
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '12', 10);

      // Calculate pagination
      const total = allGuides.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const guides = allGuides.slice(offset, offset + limit);

      sendJson(res, 200, {
        guides,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      });
      return true;
    }

    const slug = decodeURIComponent(url.pathname.replace(/^\/api\/guides\/+/, '').replace(/\/+$/, ''));
    if (!slug || slug.includes('/')) {
      sendJson(res, 404, { error: 'guide_not_found' });
      return true;
    }

    const guide = (await selectGuides(db, "WHERE g.status = 'published' AND g.slug = ?", [slug]))[0];
    if (!guide) {
      sendJson(res, 404, { error: 'guide_not_found' });
      return true;
    }

    sendJson(res, 200, { guide });
    return true;
  } catch (error) {
    sendJson(res, 500, {
      error: 'guide_api_error',
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  } finally {
    if (db) await close(db).catch(() => undefined);
  }
}

async function handleDataApi(url, res) {
  if (url.pathname !== '/api/data') {
    return false;
  }

  try {
    const body = await listDataReferences({
      type: url.searchParams.get('type'),
      q: url.searchParams.get('q'),
    });
    sendJson(res, 200, body);
    return true;
  } catch (error) {
    sendJson(res, 500, {
      error: 'data_api_error',
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
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

  const guideMatch = route.match(/^\/guides\/([^/]+)$/);
  if (guideMatch) {
    return path.join(htmlRoot, 'guides', '_shell.html');
  }

  return path.join(htmlRoot, '_not-found.html');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (await handleGuideApi(url, res)) {
    return;
  }

  if (await handleDataApi(url, res)) {
    return;
  }

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
