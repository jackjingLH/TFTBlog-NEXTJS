import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-data-reference-sync-command-'));
const fakeBin = path.join(tempRoot, 'bin');
const logPath = path.join(tempRoot, 'commands.jsonl');
const localDatabasePath = path.join(tempRoot, 'local.sqlite');

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

async function seedLocalDatabase() {
  const db = new sqlite3.Database(localDatabasePath);
  try {
    await exec(db, `
      CREATE TABLE sources (id INTEGER PRIMARY KEY, source_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL, synced_at TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE champions (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_path TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE traits (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_path TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE items (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_path TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE augments (id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, external_id TEXT NOT NULL, slug TEXT NOT NULL, name_zh TEXT NOT NULL, image_url TEXT NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      CREATE TABLE trait_champions (id INTEGER PRIMARY KEY, trait_id INTEGER NOT NULL, champion_id INTEGER NOT NULL, game_version TEXT NOT NULL, set_id TEXT NOT NULL);
      INSERT INTO sources VALUES (1, 'https://example.test/source', 'current', 'current', '2026-06-29T00:00:00.000Z', 'complete');
      INSERT INTO champions VALUES (1, 1, 'champion', 'champion', '弈子', 'champion.png', 'https://cdn.example.test/champion.png', 'current', 'current');
      INSERT INTO traits VALUES (1, 1, 'trait', 'trait', '羁绊', 'trait.png', 'https://cdn.example.test/trait.png', 'current', 'current');
      INSERT INTO items VALUES (1, 1, 'item', 'item', '装备', 'item.png', 'https://cdn.example.test/item.png', 'current', 'current');
      INSERT INTO augments VALUES (1, 1, 'augment', 'augment', '强化', 'https://cdn.example.test/augment.png', 'current', 'current');
    `);
  } finally {
    await close(db);
  }
}

function writeFakeTools() {
  fs.mkdirSync(fakeBin, { recursive: true });
  const fakeToolPath = path.join(tempRoot, 'fake-tool.mjs');
  fs.writeFileSync(
    fakeToolPath,
    `
      import fs from 'node:fs';
      const [, , toolName, ...args] = process.argv;
      fs.appendFileSync(process.env.FAKE_COMMAND_LOG, JSON.stringify({ toolName, args }) + '\\n');
      if (toolName === 'scp' && !fs.existsSync(args[0])) {
        console.error('scp source does not exist: ' + args[0]);
        process.exit(1);
      }
    `,
    'utf8',
  );

  for (const toolName of ['scp', 'ssh']) {
    fs.writeFileSync(
      path.join(fakeBin, `${toolName}.cmd`),
      `@echo off\r\nnode "${fakeToolPath}" ${toolName} %*\r\n`,
      'utf8',
    );
  }

  return fakeToolPath;
}

function runSyncCommand(fakeToolPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/sync-data-references.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ''}`,
        PATHEXT: `.CMD${path.delimiter}${process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD'}`,
        FAKE_COMMAND_LOG: logPath,
        PUBLISH_SCP_COMMAND: process.execPath,
        PUBLISH_SCP_COMMAND_ARGS: JSON.stringify([fakeToolPath, 'scp']),
        PUBLISH_SSH_COMMAND: process.execPath,
        PUBLISH_SSH_COMMAND_ARGS: JSON.stringify([fakeToolPath, 'ssh']),
        DATABASE_URL: `file:${localDatabasePath}`,
        PUBLISH_SSH_TARGET: 'deploy@example.test',
        PUBLISH_REMOTE_APP_DIR: '/remote/tftblog',
        PUBLISH_REMOTE_DATABASE_URL: 'file:./data/tftblog.sqlite',
        PUBLISH_REMOTE_TMP_DIR: '/tmp/tftblog-sync-test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

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
      else reject(new Error(`sync command exited with ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });
  });
}

async function main() {
  try {
    await seedLocalDatabase();
    const fakeToolPath = writeFakeTools();

    const result = await runSyncCommand(fakeToolPath);
    const calls = fs
      .readFileSync(logPath, 'utf8')
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const scpCalls = calls.filter((call) => call.toolName === 'scp');
    const sshCalls = calls.filter((call) => call.toolName === 'ssh');

    if (scpCalls.length < 3) {
      throw new Error(`Expected database, remote runner, and sync module uploads, got: ${JSON.stringify(scpCalls)}`);
    }
    if (!scpCalls.some((call) => call.args[0] === localDatabasePath)) {
      throw new Error(`Expected local database upload, got: ${JSON.stringify(scpCalls)}`);
    }
    if (!scpCalls.some((call) => call.args[0].endsWith('data-reference-sync.mjs'))) {
      throw new Error(`Expected sync module upload, got: ${JSON.stringify(scpCalls)}`);
    }
    if (!scpCalls.some((call) => call.args[0].endsWith('run-data-reference-sync-remote.mjs'))) {
      throw new Error(`Expected remote runner upload, got: ${JSON.stringify(scpCalls)}`);
    }
    if (sshCalls.length !== 1 || !sshCalls[0].args.join(' ').includes('node')) {
      throw new Error(`Expected one ssh node execution, got: ${JSON.stringify(sshCalls)}`);
    }

    const combinedCommandText = `${result.stdout}\n${result.stderr}\n${calls.map((call) => call.args.join(' ')).join('\n')}`;
    for (const forbidden of ['import-tft-assets-db', 'npm run build', 'build:static-deploy', 'pm2 restart', 'pm2 reload']) {
      if (combinedCommandText.includes(forbidden)) {
        throw new Error(`sync command should not run ${forbidden}: ${combinedCommandText}`);
      }
    }

    console.log('Data reference sync command contract check passed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
