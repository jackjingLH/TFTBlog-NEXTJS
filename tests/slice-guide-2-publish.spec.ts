import { test, expect } from '@playwright/test';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data/tftblog.sqlite');

test.describe('Slice 2: Publish Remaining Guides', () => {
  test('all 5 guides are in database', async () => {
    const db = new sqlite3.Database(dbPath);

    const guides = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT slug, title FROM guides ORDER BY slug', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.close();

    expect(guides.length).toBe(5);

    const slugs = guides.map(g => g.slug);
    expect(slugs).toContain('gwen-pyke');
    expect(slugs).toContain('hedge-fund');
    expect(slugs).toContain('jax-jinx');
    expect(slugs).toContain('viktor-nami');
    expect(slugs).toContain('woodland-gnar');
  });

  test('all published guides default to pinned = 0', async () => {
    const db = new sqlite3.Database(dbPath);

    const guides = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT slug, pinned FROM guides', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.close();

    for (const guide of guides) {
      expect(guide.pinned).toBe(0);
    }
  });

  test('guides have valid metadata', async () => {
    const db = new sqlite3.Database(dbPath);

    const guides = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT slug, title, excerpt, source, updated_at FROM guides', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.close();

    for (const guide of guides) {
      expect(guide.title).toBeTruthy();
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.excerpt).toBeTruthy();
      expect(guide.source).toBeTruthy();
      expect(guide.updated_at).toBeTruthy();
    }
  });
});
