import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const defaultDatabaseUrl = 'file:./data/tftblog.sqlite';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must use a file: SQLite URL.');
  }

  const filePath = databaseUrl.slice('file:'.length);
  if (!filePath.trim()) {
    throw new Error('DATABASE_URL file path is empty.');
  }

  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function remoteJoin(directory, filename) {
  return `${directory.replace(/\/+$/, '')}/${filename}`;
}

function commandArgs(name) {
  const raw = process.env[name];
  return raw ? JSON.parse(raw) : [];
}

function scp(localPath, remotePath) {
  const target = requireEnv('PUBLISH_SSH_TARGET');
  const command = process.env.PUBLISH_SCP_COMMAND || 'scp';
  execFileSync(command, [...commandArgs('PUBLISH_SCP_COMMAND_ARGS'), localPath, `${target}:${remotePath}`], {
    stdio: 'inherit',
  });
}

function ssh(command) {
  const target = requireEnv('PUBLISH_SSH_TARGET');
  const executable = process.env.PUBLISH_SSH_COMMAND || 'ssh';
  execFileSync(executable, [...commandArgs('PUBLISH_SSH_COMMAND_ARGS'), target, command], {
    stdio: 'inherit',
  });
}

function quoteShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const localDatabasePath = resolveDatabasePath();
  if (!fs.existsSync(localDatabasePath)) {
    throw new Error(`Local SQLite database not found: ${localDatabasePath}`);
  }

  const stamp = `${Date.now()}`;
  const remoteTmpDir = process.env.PUBLISH_REMOTE_TMP_DIR || '/tmp';
  const remoteAppDir = process.env.PUBLISH_REMOTE_APP_DIR || '/var/www/TFTBlog-NEXTJS';
  const remoteDatabaseUrl = process.env.PUBLISH_REMOTE_DATABASE_URL || defaultDatabaseUrl;
  const remoteStagingPath = remoteJoin(remoteTmpDir, `tftblog-reference-sync-${stamp}.sqlite`);
  const remoteModulePath = remoteJoin(remoteTmpDir, `data-reference-sync-${stamp}.mjs`);
  const remoteRunnerPath = remoteJoin(remoteTmpDir, `run-data-reference-sync-${stamp}.mjs`);
  const localModulePath = path.join(process.cwd(), 'lib', 'data-reference-sync.mjs');
  const localRunnerPath = path.join(process.cwd(), 'scripts', 'run-data-reference-sync-remote.mjs');

  scp(localDatabasePath, remoteStagingPath);
  scp(localModulePath, remoteModulePath);
  scp(localRunnerPath, remoteRunnerPath);

  const remoteCommand = [
    `cd ${quoteShell(remoteAppDir)}`,
    [
      'node',
      quoteShell(remoteRunnerPath),
      '--target-database-url',
      quoteShell(remoteDatabaseUrl),
      '--staging-database-path',
      quoteShell(remoteStagingPath),
      '--sync-module-path',
      quoteShell(remoteModulePath),
    ].join(' '),
  ].join(' && ');
  ssh(remoteCommand);

  console.log(
    JSON.stringify(
      {
        localDatabasePath,
        remoteStagingPath,
        remoteRunnerPath,
        remoteModulePath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
