import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

export type GuideStatus = 'draft' | 'published';

export interface GuideRecord {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  coverUrl: string | null;
  source: string;
  updatedAt: string;
  publishedAt: string | null;
  status: GuideStatus;
  readingMinutes: number;
  createdAt: string;
  modifiedAt: string;
  tags: string[];
}

export interface GuideUpsertInput {
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  coverUrl?: string | null;
  source: string;
  updatedAt: string;
  publishedAt?: string | null;
  status?: GuideStatus;
  readingMinutes: number;
  tags?: string[];
}

interface GuideRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  cover_url: string | null;
  source: string;
  updated_at: string;
  published_at: string | null;
  status: GuideStatus;
  reading_minutes: number;
  created_at: string;
  modified_at: string;
  tags: string | null;
}

const defaultDatabaseUrl = 'file:./data/tftblog.sqlite';

export function resolveGuideDatabasePath(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must use a file: SQLite URL.');
  }

  const filePath = databaseUrl.slice('file:'.length);
  if (!filePath.trim()) {
    throw new Error('DATABASE_URL file path is empty.');
  }

  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

export function guideDatabaseExists(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  return fs.existsSync(resolveGuideDatabasePath(databaseUrl));
}

function ensureDatabaseDirectory(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function normalizeTags(tags: string[] | undefined) {
  return Array.from(new Set((tags || []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 20);
}

function nowIso() {
  return new Date().toISOString();
}

function mapGuideRow(row: GuideRow): GuideRecord {
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
  };
}

export class GuideContentStore {
  private readonly db: sqlite3.Database;

  constructor(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
    const databasePath = resolveGuideDatabasePath(databaseUrl);
    ensureDatabaseDirectory(databasePath);
    this.db = new sqlite3.Database(databasePath);
  }

  async initialize() {
    await this.exec('PRAGMA journal_mode = WAL;');
    await this.exec('PRAGMA foreign_keys = ON;');
    await this.exec(`
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

  close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((error) => (error ? reject(error) : resolve()));
    });
  }

  async upsertGuide(input: GuideUpsertInput) {
    const tags = normalizeTags(input.tags);
    const status = input.status || 'published';
    const publishedAt = input.publishedAt ?? (status === 'published' ? nowIso() : null);
    const timestamp = nowIso();

    await this.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      await this.run(
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
          input.slug,
          input.title,
          input.excerpt,
          input.contentMarkdown,
          input.coverUrl || null,
          input.source,
          input.updatedAt,
          publishedAt,
          status,
          Math.max(1, Math.ceil(input.readingMinutes)),
          timestamp,
          timestamp,
        ],
      );

      const guide = await this.findGuideBySlug(input.slug, { includeDraft: true });
      if (!guide) {
        throw new Error(`Failed to upsert guide: ${input.slug}`);
      }

      await this.run('DELETE FROM guide_tags WHERE guide_id = ?', [guide.id]);
      for (const tag of tags) {
        await this.run('INSERT OR IGNORE INTO guide_tags (guide_id, tag) VALUES (?, ?)', [guide.id, tag]);
      }

      await this.run('COMMIT');
      return this.findGuideBySlug(input.slug, { includeDraft: true });
    } catch (error) {
      await this.run('ROLLBACK').catch(() => undefined);
      throw error;
    }
  }

  listGuides(options: { includeDraft?: boolean } = {}) {
    return this.selectGuides(options.includeDraft ? '' : "WHERE g.status = 'published'");
  }

  async findGuideBySlug(slug: string, options: { includeDraft?: boolean } = {}) {
    const rows = await this.selectGuides(
      `${options.includeDraft ? 'WHERE' : "WHERE g.status = 'published' AND"} g.slug = ?`,
      [slug],
    );
    return rows[0] || null;
  }

  private async selectGuides(whereClause: string, params: unknown[] = []) {
    const sql = `
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
        group_concat(t.tag, char(10)) AS tags
      FROM guides g
      LEFT JOIN guide_tags t ON t.guide_id = g.id
      ${whereClause}
      GROUP BY g.id
      ORDER BY g.updated_at DESC, g.id DESC
    `;

    const rows = await this.all<GuideRow>(sql, params);
    return rows.map((row) => mapGuideRow(row));
  }

  private exec(sql: string) {
    return new Promise<void>((resolve, reject) => {
      this.db.exec(sql, (error) => (error ? reject(error) : resolve()));
    });
  }

  private run(sql: string, params: unknown[] = []) {
    return new Promise<void>((resolve, reject) => {
      this.db.run(sql, params, (error) => (error ? reject(error) : resolve()));
    });
  }

  private all<T>(sql: string, params: unknown[] = []) {
    return new Promise<T[]>((resolve, reject) => {
      this.db.all(sql, params, (error, rows: T[]) => (error ? reject(error) : resolve(rows)));
    });
  }
}

export async function openGuideContentStore(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  const store = new GuideContentStore(databaseUrl);
  await store.initialize();
  return store;
}
