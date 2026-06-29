import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import sqlite3 from 'sqlite3';

const defaultDatabaseUrl = 'file:./data/tftblog.sqlite';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error('Usage: node run-data-reference-sync-remote.mjs --target-database-url <file:url> --staging-database-path <path> --sync-module-path <path>');
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function resolveDatabasePath(databaseUrl = defaultDatabaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('target database URL must use a file: SQLite URL.');
  }

  const filePath = databaseUrl.slice('file:'.length);
  if (!filePath.trim()) {
    throw new Error('target database URL file path is empty.');
  }

  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function createBackup(targetDatabasePath, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(targetDatabasePath)}.reference-sync.${stamp}.bak`);
  fs.copyFileSync(targetDatabasePath, backupPath);

  const backups = fs
    .readdirSync(backupDir)
    .filter((name) => name.includes('reference-sync') && name.endsWith('.bak'))
    .map((name) => ({
      name,
      path: path.join(backupDir, name),
      mtimeMs: fs.statSync(path.join(backupDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const backup of backups.slice(1)) {
    fs.rmSync(backup.path, { force: true });
  }

  return backupPath;
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

async function quickCheck(databasePath, label) {
  const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY);
  try {
    const row = await get(db, 'PRAGMA quick_check');
    const value = row ? Object.values(row)[0] : '';
    if (value !== 'ok') {
      throw new Error(String(value || 'unknown quick_check result'));
    }
  } catch (error) {
    throw new Error(`${label} quick_check failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await close(db).catch(() => undefined);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDatabasePath = resolveDatabasePath(args.get('target-database-url') || process.env.DATABASE_URL || defaultDatabaseUrl);
  const stagingDatabasePath = args.get('staging-database-path');
  const syncModulePath = args.get('sync-module-path');
  const backupDir = args.get('backup-dir') || path.join(path.dirname(targetDatabasePath), 'backups');

  if (!stagingDatabasePath) {
    throw new Error('Missing --staging-database-path');
  }
  if (!syncModulePath) {
    throw new Error('Missing --sync-module-path');
  }

  const syncModule = await import(pathToFileURL(syncModulePath).href);
  await quickCheck(targetDatabasePath, 'production');
  await quickCheck(stagingDatabasePath, 'staging');
  const backupPath = createBackup(targetDatabasePath, backupDir);
  let result;
  try {
    result = await syncModule.syncDataReferenceTables({
      targetDatabasePath,
      stagingDatabasePath,
    });
    await quickCheck(targetDatabasePath, 'production');
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n${JSON.stringify(
        {
          backupPath,
        },
        null,
        2,
      )}`,
    );
  }

  console.log(JSON.stringify({ ...(result || { ok: true }), backupPath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
