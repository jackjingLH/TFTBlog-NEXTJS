import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { syncDataReferenceTables } from '../lib/data-reference-sync.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-data-reference-sync-'));
const productionPath = path.join(tempRoot, 'production.sqlite');
const stagingPath = path.join(tempRoot, 'staging.sqlite');
const emptyProductionPath = path.join(tempRoot, 'empty-production.sqlite');
const emptyStagingPath = path.join(tempRoot, 'empty-staging.sqlite');
const missingProductionPath = path.join(tempRoot, 'missing-production.sqlite');
const missingStagingPath = path.join(tempRoot, 'missing-staging.sqlite');
const emptyRelationProductionPath = path.join(tempRoot, 'empty-relation-production.sqlite');
const emptyRelationStagingPath = path.join(tempRoot, 'empty-relation-staging.sqlite');
const oldSchemaProductionPath = path.join(tempRoot, 'old-schema-production.sqlite');
const newSchemaStagingPath = path.join(tempRoot, 'new-schema-staging.sqlite');
const missingPrimaryKeyProductionPath = path.join(tempRoot, 'missing-primary-key-production.sqlite');
const missingPrimaryKeyStagingPath = path.join(tempRoot, 'missing-primary-key-staging.sqlite');

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
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

async function seedDatabase(databasePath, marker) {
  const db = new sqlite3.Database(databasePath);
  try {
    await exec(db, `
      PRAGMA foreign_keys = ON;

      CREATE TABLE guides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL
      );

      CREATE TABLE guide_tags (
        guide_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (guide_id, tag),
        FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
      );

      CREATE TABLE sources (
        id INTEGER PRIMARY KEY,
        source_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE champions (
        id INTEGER PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        cost INTEGER,
        traits_json TEXT NOT NULL DEFAULT '[]',
        image_path TEXT NOT NULL,
        image_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL
      );

      CREATE TABLE traits (
        id INTEGER PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        levels_json TEXT NOT NULL DEFAULT '[]',
        image_path TEXT NOT NULL,
        image_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL
      );

      CREATE TABLE items (
        id INTEGER PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        effect_text TEXT NOT NULL DEFAULT '',
        rules_json TEXT NOT NULL DEFAULT '[]',
        keywords_json TEXT NOT NULL DEFAULT '[]',
        formula_json TEXT NOT NULL DEFAULT '[]',
        image_path TEXT NOT NULL,
        image_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL
      );

      CREATE TABLE augments (
        id INTEGER PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        tier TEXT NOT NULL DEFAULT '',
        effect_text TEXT NOT NULL DEFAULT '',
        rules_json TEXT NOT NULL DEFAULT '[]',
        image_path TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL
      );

      CREATE TABLE trait_champions (
        id INTEGER PRIMARY KEY,
        trait_id INTEGER NOT NULL REFERENCES traits(id) ON DELETE CASCADE,
        champion_id INTEGER NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL
      );

      INSERT INTO guides (id, slug, title)
      VALUES (1, 'prod-guide', '线上攻略');
      INSERT INTO guide_tags (guide_id, tag)
      VALUES (1, '保留');

      INSERT INTO sources (id, source_url, game_version, set_id, synced_at, status)
      VALUES (1, 'https://example.test/${marker}/source', '${marker}', '${marker}', '2026-06-29T00:00:00.000Z', 'complete');
      INSERT INTO champions (id, source_id, external_id, slug, name_zh, cost, image_path, image_url, game_version, set_id)
      VALUES (1, 1, '${marker}-champion', '${marker}-champion', '${marker}弈子', 1, 'champion.png', 'https://cdn.example.test/${marker}/champion.png', '${marker}', '${marker}');
      INSERT INTO traits (id, source_id, external_id, slug, name_zh, image_path, image_url, game_version, set_id)
      VALUES (1, 1, '${marker}-trait', '${marker}-trait', '${marker}羁绊', 'trait.png', 'https://cdn.example.test/${marker}/trait.png', '${marker}', '${marker}');
      INSERT INTO items (id, source_id, external_id, slug, name_zh, image_path, image_url, game_version, set_id)
      VALUES (1, 1, '${marker}-item', '${marker}-item', '${marker}装备', 'item.png', 'https://cdn.example.test/${marker}/item.png', '${marker}', '${marker}');
      INSERT INTO augments (id, source_id, external_id, slug, name_zh, image_url, game_version, set_id)
      VALUES (1, 1, '${marker}-augment', '${marker}-augment', '${marker}强化', 'https://cdn.example.test/${marker}/augment.png', '${marker}', '${marker}');
      INSERT INTO trait_champions (id, trait_id, champion_id, game_version, set_id)
      VALUES (1, 1, 1, '${marker}', '${marker}');
    `);
  } finally {
    await close(db);
  }
}

async function readRows(databasePath, tableName) {
  const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY);
  try {
    return await all(db, `SELECT * FROM ${tableName} ORDER BY rowid`);
  } finally {
    await close(db);
  }
}

async function runSql(databasePath, sql) {
  const db = new sqlite3.Database(databasePath);
  try {
    await exec(db, sql);
  } finally {
    await close(db);
  }
}

async function countRows(databasePath, tableName) {
  const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY);
  try {
    const row = await get(db, `SELECT COUNT(*) AS count FROM ${tableName}`);
    return row.count;
  } finally {
    await close(db);
  }
}

async function main() {
  try {
    await seedDatabase(productionPath, 'old');
    await seedDatabase(stagingPath, 'new');

    const result = await syncDataReferenceTables({
      targetDatabasePath: productionPath,
      stagingDatabasePath: stagingPath,
    });

    if (result?.tableCounts?.sources?.source !== 1 || result?.tableCounts?.sources?.target !== 1) {
      throw new Error(`Expected source/target counts in sync result, got: ${JSON.stringify(result)}`);
    }

    const guides = await readRows(productionPath, 'guides');
    if (guides.length !== 1 || guides[0].slug !== 'prod-guide' || guides[0].title !== '线上攻略') {
      throw new Error(`Guide rows should be preserved, got: ${JSON.stringify(guides)}`);
    }

    const guideTags = await readRows(productionPath, 'guide_tags');
    if (guideTags.length !== 1 || guideTags[0].tag !== '保留') {
      throw new Error(`Guide tags should be preserved, got: ${JSON.stringify(guideTags)}`);
    }

    for (const tableName of ['sources', 'champions', 'traits', 'items', 'augments', 'trait_champions']) {
      const rows = await readRows(productionPath, tableName);
      const text = JSON.stringify(rows);
      if (!text.includes('new') || text.includes('old')) {
        throw new Error(`${tableName} should be replaced from staging, got: ${text}`);
      }
    }

    await seedDatabase(emptyProductionPath, 'old');
    await seedDatabase(emptyStagingPath, 'new');
    await runSql(emptyStagingPath, `
      PRAGMA foreign_keys = OFF;
      DELETE FROM trait_champions;
      DELETE FROM champions;
    `);

    let emptyCoreTableError = null;
    try {
      await syncDataReferenceTables({
        targetDatabasePath: emptyProductionPath,
        stagingDatabasePath: emptyStagingPath,
      });
    } catch (error) {
      emptyCoreTableError = error;
    }

    if (!emptyCoreTableError || !String(emptyCoreTableError.message).includes('staging champions must contain at least one row')) {
      throw new Error(`Expected empty champions validation failure, got: ${emptyCoreTableError?.message}`);
    }

    const productionChampionCount = await countRows(emptyProductionPath, 'champions');
    if (productionChampionCount !== 1) {
      throw new Error(`Production champions should remain unchanged after failed validation, got count: ${productionChampionCount}`);
    }

    await seedDatabase(emptyRelationProductionPath, 'old');
    await seedDatabase(emptyRelationStagingPath, 'new');
    await runSql(emptyRelationStagingPath, 'DELETE FROM trait_champions;');
    await syncDataReferenceTables({
      targetDatabasePath: emptyRelationProductionPath,
      stagingDatabasePath: emptyRelationStagingPath,
    });
    const emptyRelationTargetCount = await countRows(emptyRelationProductionPath, 'trait_champions');
    const emptyRelationChampionCount = await countRows(emptyRelationProductionPath, 'champions');
    if (emptyRelationTargetCount !== 0 || emptyRelationChampionCount !== 1) {
      throw new Error(
        `Empty staging trait_champions should be allowed while core tables sync, got relation=${emptyRelationTargetCount}, champions=${emptyRelationChampionCount}`,
      );
    }

    await seedDatabase(missingProductionPath, 'old');
    await seedDatabase(missingStagingPath, 'new');
    await runSql(missingStagingPath, 'DROP TABLE trait_champions;');

    let missingTableError = null;
    try {
      await syncDataReferenceTables({
        targetDatabasePath: missingProductionPath,
        stagingDatabasePath: missingStagingPath,
      });
    } catch (error) {
      missingTableError = error;
    }

    if (!missingTableError || !String(missingTableError.message).includes('staging missing required table: trait_champions')) {
      throw new Error(`Expected missing table validation failure, got: ${missingTableError?.message}`);
    }

    const missingProductionTraitChampionCount = await countRows(missingProductionPath, 'trait_champions');
    if (missingProductionTraitChampionCount !== 1) {
      throw new Error(`Production trait_champions should remain unchanged after missing table validation, got count: ${missingProductionTraitChampionCount}`);
    }

    await seedDatabase(oldSchemaProductionPath, 'old');
    await seedDatabase(newSchemaStagingPath, 'new');
    await runSql(newSchemaStagingPath, `
      ALTER TABLE champions ADD COLUMN skill_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE champions ADD COLUMN skill_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE champions ADD COLUMN skill_detail TEXT NOT NULL DEFAULT '';
      ALTER TABLE champions ADD COLUMN skill_image_url TEXT NOT NULL DEFAULT '';
      ALTER TABLE champions ADD COLUMN stats_json TEXT NOT NULL DEFAULT '{}';
      UPDATE champions
      SET skill_name = '新技能',
          skill_type = '主动',
          skill_detail = '新技能说明',
          skill_image_url = 'https://cdn.example.test/new/skill.png',
          stats_json = '{"baseHealth":"650"}';
    `);
    await syncDataReferenceTables({
      targetDatabasePath: oldSchemaProductionPath,
      stagingDatabasePath: newSchemaStagingPath,
    });
    const oldSchemaDb = new sqlite3.Database(oldSchemaProductionPath, sqlite3.OPEN_READONLY);
    let migratedChampion;
    try {
      migratedChampion = await get(
        oldSchemaDb,
        `SELECT skill_name, skill_type, skill_detail, skill_image_url, stats_json FROM champions WHERE name_zh = ?`,
        ['new弈子'],
      );
    } finally {
      await close(oldSchemaDb);
    }
    if (
      migratedChampion?.skill_name !== '新技能' ||
      migratedChampion?.skill_type !== '主动' ||
      migratedChampion?.skill_detail !== '新技能说明' ||
      migratedChampion?.skill_image_url !== 'https://cdn.example.test/new/skill.png' ||
      migratedChampion?.stats_json !== '{"baseHealth":"650"}'
    ) {
      throw new Error(`Production schema should be migrated before syncing newer staging columns, got: ${JSON.stringify(migratedChampion)}`);
    }

    await seedDatabase(missingPrimaryKeyProductionPath, 'old');
    await seedDatabase(missingPrimaryKeyStagingPath, 'new');
    await runSql(missingPrimaryKeyProductionPath, `
      ALTER TABLE augments RENAME TO augments_old_shape;
      CREATE TABLE augments (
        source_id INTEGER NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        image_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL
      );
      INSERT INTO augments (source_id, external_id, slug, name_zh, image_url, game_version, set_id)
      SELECT source_id, external_id, slug, name_zh, image_url, game_version, set_id
      FROM augments_old_shape;
      DROP TABLE augments_old_shape;
    `);
    await syncDataReferenceTables({
      targetDatabasePath: missingPrimaryKeyProductionPath,
      stagingDatabasePath: missingPrimaryKeyStagingPath,
    });
    const migratedAugmentColumns = await (async () => {
      const db = new sqlite3.Database(missingPrimaryKeyProductionPath, sqlite3.OPEN_READONLY);
      try {
        return await all(db, `PRAGMA table_info(augments)`);
      } finally {
        await close(db);
      }
    })();
    const migratedAugmentColumnNames = new Set(migratedAugmentColumns.map((column) => column.name));
    if (!migratedAugmentColumnNames.has('id') || !migratedAugmentColumnNames.has('tier')) {
      throw new Error(`Production augments should be rebuilt with staging schema, got: ${[...migratedAugmentColumnNames].join(',')}`);
    }

    console.log('Data reference sync contract check passed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
