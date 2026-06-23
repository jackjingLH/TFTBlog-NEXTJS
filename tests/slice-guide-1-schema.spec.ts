import { test, expect } from '@playwright/test';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data/tftblog.sqlite');

test.describe('Slice 1: Database Schema - Pinning Fields', () => {
  test('guides table has pinned column', async () => {
    const db = new sqlite3.Database(dbPath);

    const columns = await new Promise<any[]>((resolve, reject) => {
      db.all('PRAGMA table_info(guides)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.close();

    const pinnedColumn = columns.find(col => col.name === 'pinned');
    expect(pinnedColumn).toBeTruthy();
    expect(pinnedColumn.type).toBe('INTEGER');
    expect(pinnedColumn.notnull).toBe(1);
    expect(pinnedColumn.dflt_value).toBe('0');
  });

  test('guides table has pinned_order column', async () => {
    const db = new sqlite3.Database(dbPath);

    const columns = await new Promise<any[]>((resolve, reject) => {
      db.all('PRAGMA table_info(guides)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.close();

    const pinnedOrderColumn = columns.find(col => col.name === 'pinned_order');
    expect(pinnedOrderColumn).toBeTruthy();
    expect(pinnedOrderColumn.type).toBe('INTEGER');
    expect(pinnedOrderColumn.notnull).toBe(0); // nullable
  });

  test('existing guides default to pinned = 0', async () => {
    const db = new sqlite3.Database(dbPath);

    const guides = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT slug, pinned, pinned_order FROM guides', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    db.close();

    // All existing guides should have pinned = 0
    for (const guide of guides) {
      expect(guide.pinned).toBe(0);
    }
  });
});
