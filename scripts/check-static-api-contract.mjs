import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-static-api-contract-'));
const databasePath = path.join(tempRoot, 'content.sqlite');
const port = 39021 + Math.floor(Math.random() * 1000);

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
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
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
      'api-guide', 'API 契约攻略', 'API 摘要', '# API 契约攻略',
      'https://cdn.example.com/guides/api/cover.png', 'contract',
      '2026-06-09', ?, 'published', 2, ?, ?
    )
  `, [now, now, now]);

  await run(db, 'INSERT INTO guide_tags (guide_id, tag) VALUES (1, ?)', ['API']);
  await run(db, 'INSERT INTO guide_tags (guide_id, tag) VALUES (1, ?)', ['SQLite']);
  await close(db);
}

function requestJson(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

async function waitForServer(child) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    if (child.exitCode !== null) {
      throw new Error(`Static server exited before readiness with code ${child.exitCode}`);
    }

    try {
      await requestJson('/api/guides');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error('Static server did not become ready.');
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
  await seedDatabase();
  const child = spawn(process.execPath, ['scripts/static-mvp-server.mjs'], {
    cwd: process.cwd(),
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

    const list = await requestJson('/api/guides');
    if (list.statusCode !== 200 || list.body.guides?.[0]?.slug !== 'api-guide') {
      throw new Error(`Invalid /api/guides response: ${JSON.stringify(list)}`);
    }

    if ('contentMarkdown' in list.body.guides[0]) {
      throw new Error('/api/guides should return summaries, not full markdown.');
    }

    const detail = await requestJson('/api/guides/api-guide');
    if (detail.statusCode !== 200 || detail.body.guide?.contentMarkdown !== '# API 契约攻略') {
      throw new Error(`Invalid /api/guides/api-guide response: ${JSON.stringify(detail)}`);
    }

    const missing = await requestJson('/api/guides/missing');
    if (missing.statusCode !== 404 || missing.body.error !== 'guide_not_found') {
      throw new Error(`Invalid missing guide response: ${JSON.stringify(missing)}`);
    }

    console.log('Static guide API contract check passed.');
  } finally {
    await stopChild(child);
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
