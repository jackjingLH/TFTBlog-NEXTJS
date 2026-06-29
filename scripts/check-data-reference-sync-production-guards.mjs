import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-data-reference-sync-guards-'));
const productionPath = path.join(tempRoot, 'production.sqlite');
const stagingPath = path.join(tempRoot, 'staging.sqlite');
const missingGuideProductionPath = path.join(tempRoot, 'missing-guide-production.sqlite');
const missingGuideStagingPath = path.join(tempRoot, 'missing-guide-staging.sqlite');
const corruptProductionPath = path.join(tempRoot, 'corrupt-production.sqlite');
const corruptStagingPath = path.join(tempRoot, 'corrupt-staging.sqlite');
const failedSyncProductionPath = path.join(tempRoot, 'failed-sync-production.sqlite');
const failedSyncStagingPath = path.join(tempRoot, 'failed-sync-staging.sqlite');
const backupDir = path.join(tempRoot, 'backups');
const syncModulePath = path.join(process.cwd(), 'lib', 'data-reference-sync.mjs');

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function seedDatabase(databasePath, marker, includeGuides = true) {
  const db = new sqlite3.Database(databasePath);
  try {
    await exec(db, `
      ${includeGuides ? 'CREATE TABLE guides (id INTEGER PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL);' : ''}
      ${includeGuides ? 'CREATE TABLE guide_tags (guide_id INTEGER NOT NULL, tag TEXT NOT NULL);' : ''}
      CREATE TABLE sources (id INTEGER PRIMARY KEY, source_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL, synced_at TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE champions (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_path TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE traits (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_path TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE items (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_path TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE augments (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE trait_champions (id INTEGER PRIMARY KEY, trait_id INTEGER NOT NULL, champion_id INTEGER NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      ${includeGuides ? "INSERT INTO guides VALUES (1, 'guide', '攻略');" : ''}
      ${includeGuides ? "INSERT INTO guide_tags VALUES (1, '标签');" : ''}
      INSERT INTO sources VALUES (1, 'https://example.test/${marker}/source', '${marker}', '${marker}', '2026-06-29T00:00:00.000Z', 'complete');
      INSERT INTO champions VALUES (1, 1, '${marker}-champion', '${marker}-champion', '${marker}弈子', 'champion.png', 'https://cdn.example.test/${marker}/champion.png', '${marker}', '${marker}');
      INSERT INTO traits VALUES (1, 1, '${marker}-trait', '${marker}-trait', '${marker}羁绊', 'trait.png', 'https://cdn.example.test/${marker}/trait.png', '${marker}', '${marker}');
      INSERT INTO items VALUES (1, 1, '${marker}-item', '${marker}-item', '${marker}装备', 'item.png', 'https://cdn.example.test/${marker}/item.png', '${marker}', '${marker}');
      INSERT INTO augments VALUES (1, 1, '${marker}-augment', '${marker}-augment', '${marker}强化', 'https://cdn.example.test/${marker}/augment.png', '${marker}', '${marker}');
    `);
  } finally {
    await close(db);
  }
}

function runRemoteRunner(options = {}) {
  const targetDatabasePath = options.targetDatabasePath || productionPath;
  const stagingDatabasePath = options.stagingDatabasePath || stagingPath;
  const runnerBackupDir = options.backupDir || backupDir;
  const extraArgs = options.extraArgs || [];
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'scripts/run-data-reference-sync-remote.mjs',
        '--target-database-url',
        `file:${targetDatabasePath}`,
        '--staging-database-path',
        stagingDatabasePath,
        '--sync-module-path',
        syncModulePath,
        '--backup-dir',
        runnerBackupDir,
        ...extraArgs,
      ],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`remote runner exited with ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });
  });
}

function referenceSyncBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((name) => name.includes('reference-sync') && name.endsWith('.bak'))
    .sort();
}

async function main() {
  try {
    await seedDatabase(productionPath, 'old', true);
    await seedDatabase(stagingPath, 'new', false);

    await runRemoteRunner();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await runRemoteRunner();

    const backups = referenceSyncBackups();
    if (backups.length !== 1) {
      throw new Error(`Expected exactly one retained reference-sync backup, got: ${JSON.stringify(backups)}`);
    }

    const backupPath = path.join(backupDir, backups[0]);
    if (fs.statSync(backupPath).size === 0) {
      throw new Error(`Backup should be a non-empty SQLite file: ${backupPath}`);
    }

    await seedDatabase(missingGuideProductionPath, 'old', false);
    await seedDatabase(missingGuideStagingPath, 'new', false);

    let missingGuideError = null;
    try {
      await runRemoteRunner({
        targetDatabasePath: missingGuideProductionPath,
        stagingDatabasePath: missingGuideStagingPath,
        backupDir: path.join(tempRoot, 'missing-guide-backups'),
      });
    } catch (error) {
      missingGuideError = error;
    }

    if (!missingGuideError || !String(missingGuideError.message).includes('production missing required table: guides')) {
      throw new Error(`Expected missing production guide table failure, got: ${missingGuideError?.message}`);
    }

    await seedDatabase(corruptProductionPath, 'old', true);
    fs.writeFileSync(corruptStagingPath, 'not a sqlite database', 'utf8');

    let corruptStagingError = null;
    try {
      await runRemoteRunner({
        targetDatabasePath: corruptProductionPath,
        stagingDatabasePath: corruptStagingPath,
        backupDir: path.join(tempRoot, 'corrupt-staging-backups'),
      });
    } catch (error) {
      corruptStagingError = error;
    }

    if (!corruptStagingError || !String(corruptStagingError.message).includes('staging quick_check failed')) {
      throw new Error(`Expected staging quick_check failure, got: ${corruptStagingError?.message}`);
    }

    await seedDatabase(failedSyncProductionPath, 'old', true);
    await seedDatabase(failedSyncStagingPath, 'new', false);
    const failedSyncDb = new sqlite3.Database(failedSyncStagingPath);
    try {
      await exec(failedSyncDb, 'DELETE FROM champions;');
    } finally {
      await close(failedSyncDb);
    }

    let failedSyncError = null;
    try {
      await runRemoteRunner({
        targetDatabasePath: failedSyncProductionPath,
        stagingDatabasePath: failedSyncStagingPath,
        backupDir: path.join(tempRoot, 'failed-sync-backups'),
      });
    } catch (error) {
      failedSyncError = error;
    }

    const failedSyncMessage = String(failedSyncError?.message || '');
    if (!failedSyncMessage.includes('staging champions must contain at least one row') || !failedSyncMessage.includes('backupPath')) {
      throw new Error(`Expected failed sync error to include cause and backupPath, got: ${failedSyncMessage}`);
    }

    console.log('Data reference sync production guard check passed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
