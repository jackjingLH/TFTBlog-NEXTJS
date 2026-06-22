import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sqlite3 from 'sqlite3';

const defaultDatabaseUrl = 'file:./data/tftblog.sqlite';

function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must use a file: SQLite URL.');
  }

  const filePath = databaseUrl.slice('file:'.length);
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  return new sqlite3.Database(databasePath);
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function initialize(db) {
  await exec(db, 'PRAGMA journal_mode = WAL;');
  await exec(db, 'PRAGMA foreign_keys = ON;');
  await exec(db, `
    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      cover_url TEXT,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      reading_minutes INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      modified_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guide_tags (
      guide_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (guide_id, tag),
      FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_guides_status_updated
      ON guides(status, updated_at DESC);
  `);
}

function assertPayload(payload) {
  const required = ['slug', 'title', 'excerpt', 'contentMarkdown', 'coverUrl', 'source', 'updatedAt', 'readingMinutes'];
  const missing = required.filter((key) => !payload[key]);
  if (missing.length > 0) {
    throw new Error(`Guide payload missing required fields: ${missing.join(', ')}`);
  }

  if (!Array.isArray(payload.tags)) {
    throw new Error('Guide payload tags must be an array.');
  }
}

async function upsertGuide(db, payload) {
  const now = new Date().toISOString();
  const tags = Array.from(new Set(payload.tags.map((tag) => String(tag).trim()).filter(Boolean)));
  const status = payload.status || 'published';
  const publishedAt = payload.publishedAt ?? (status === 'published' ? now : null);

  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    await run(
      db,
      `
      INSERT INTO guides (
        slug, title, excerpt, content_markdown, cover_url, source,
        updated_at, published_at, status, reading_minutes, created_at, modified_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        excerpt = excluded.excerpt,
        content_markdown = excluded.content_markdown,
        cover_url = excluded.cover_url,
        source = excluded.source,
        updated_at = excluded.updated_at,
        published_at = excluded.published_at,
        status = excluded.status,
        reading_minutes = excluded.reading_minutes,
        modified_at = excluded.modified_at
    `,
      [
        payload.slug,
        payload.title,
        payload.excerpt,
        payload.contentMarkdown,
        payload.coverUrl,
        payload.source,
        payload.updatedAt,
        publishedAt,
        status,
        Math.max(1, Math.ceil(Number(payload.readingMinutes))),
        now,
        now,
      ],
    );

    const guide = await get(db, 'SELECT id FROM guides WHERE slug = ?', [payload.slug]);
    if (!guide) {
      throw new Error(`Failed to import guide: ${payload.slug}`);
    }

    await run(db, 'DELETE FROM guide_tags WHERE guide_id = ?', [guide.id]);
    for (const tag of tags) {
      await run(db, 'INSERT OR IGNORE INTO guide_tags (guide_id, tag) VALUES (?, ?)', [guide.id, tag]);
    }
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK').catch(() => undefined);
    throw error;
  }
}

async function main() {
  const payloadPath = process.argv[2];
  const initOnly = payloadPath === '--init-only';
  if (!payloadPath) {
    throw new Error('Usage: node scripts/import-guide-payload.mjs <payload.json|--init-only>');
  }

  const db = openDatabase(resolveDatabasePath());
  try {
    await initialize(db);
    if (initOnly) {
      console.log(`Initialized guide database: ${resolveDatabasePath()}`);
      return;
    }

    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    assertPayload(payload);
    await upsertGuide(db, payload);
    console.log(`Imported guide payload: ${payload.slug}`);
  } finally {
    await close(db);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
