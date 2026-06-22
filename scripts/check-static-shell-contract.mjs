import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const root = process.cwd();
const bundleRoot = path.join(root, '.deploy', 'tftblog-static-mvp');
const serverPath = path.join(bundleRoot, 'server.mjs');
const guideShellPath = path.join(bundleRoot, 'html', 'guides', '_shell.html');
const staleGuideHtmlPath = path.join(bundleRoot, 'html', 'guides', 'runtime-guide.html');
const bundledGuideAssetsRoot = path.join(bundleRoot, 'site', 'guides');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-static-shell-contract-'));
const databasePath = path.join(tempRoot, 'content.sqlite');
const port = 40200 + Math.floor(Math.random() * 1000);

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required static shell artifact is missing: ${filePath}`);
  }
}

function hasBundledGuideAssets(dir) {
  if (!fs.existsSync(dir)) return false;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && hasBundledGuideAssets(fullPath)) return true;
    if (entry.isFile()) return true;
  }

  return false;
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => (error ? reject(error) : resolve()));
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function seedDatabase() {
  const db = new sqlite3.Database(databasePath);
  await exec(db, `
    CREATE TABLE guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      cover_url TEXT,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      reading_minutes INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      modified_at TEXT NOT NULL
    );
    CREATE TABLE guide_tags (
      guide_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (guide_id, tag)
    );
  `);

  const now = new Date().toISOString();
  await run(db, `
    INSERT INTO guides (
      slug, title, excerpt, content_markdown, cover_url, source,
      updated_at, published_at, status, reading_minutes, created_at, modified_at
    )
    VALUES (
      'runtime-guide', '运行时攻略', '运行时摘要', '# 运行时攻略\\n\\n正文',
      'https://cdn.example.com/guides/runtime/cover.png', 'contract',
      '2026-06-09', ?, 'published', 2, ?, ?
    )
  `, [now, now, now]);
  await run(db, 'INSERT INTO guide_tags (guide_id, tag) VALUES (1, ?)', ['运行时']);
  await close(db);
}

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, body, contentType: res.headers['content-type'] || '' }));
    });
    req.on('error', reject);
  });
}

async function waitForServer(child) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    if (child.exitCode !== null) {
      throw new Error(`Static bundle server exited before readiness with code ${child.exitCode}`);
    }

    try {
      await request('/api/guides');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error('Static bundle server did not become ready.');
}

function stopChild(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    child.kill();
    setTimeout(resolve, 2000);
  });
}

async function main() {
  requireFile(serverPath);
  requireFile(guideShellPath);
  if (hasBundledGuideAssets(bundledGuideAssetsRoot)) {
    throw new Error('Static deploy bundle should not include guide image assets under site/guides.');
  }
  fs.mkdirSync(path.dirname(staleGuideHtmlPath), { recursive: true });
  fs.writeFileSync(staleGuideHtmlPath, '<html><body>stale static guide html</body></html>', 'utf8');
  await seedDatabase();

  const child = spawn(process.execPath, [serverPath], {
    cwd: bundleRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: `file:${databasePath}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(child);

    const home = await request('/');
    const list = await request('/guides');
    const detail = await request('/guides/runtime-guide');
    const freshDetail = await request('/guides/fresh-guide-not-built');
    const api = await request('/api/guides');
    const apiDetail = await request('/api/guides/runtime-guide');

    for (const [name, response] of Object.entries({ home, list, detail, freshDetail })) {
      if (response.statusCode !== 200 || !response.contentType.includes('text/html')) {
        throw new Error(`${name} did not return static HTML 200: ${JSON.stringify(response)}`);
      }
    }

    if (detail.body.includes('stale static guide html')) {
      throw new Error('/guides/runtime-guide served stale per-slug HTML instead of the runtime guide shell.');
    }

    if (api.statusCode !== 200 || !api.body.includes('runtime-guide')) {
      throw new Error(`/api/guides did not return runtime SQLite content: ${api.body}`);
    }

    if (apiDetail.statusCode !== 200 || !apiDetail.body.includes('contentMarkdown')) {
      throw new Error(`/api/guides/runtime-guide did not return detail content: ${apiDetail.body}`);
    }

    console.log('Static shell contract check passed.');
  } finally {
    await stopChild(child);
    fs.rmSync(staleGuideHtmlPath, { force: true });
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
