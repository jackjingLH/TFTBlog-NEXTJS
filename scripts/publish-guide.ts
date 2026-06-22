import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { prepareGuidePublishPayload } from '../lib/guide-publisher';

function loadEnvFile(filePath: string) {
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

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const markdownPath = argv.find((arg) => !arg.startsWith('--'));

  return {
    markdownPath,
    dryRun: flags.has('--dry-run'),
    localOnly: flags.has('--local-only'),
    skipRemote: flags.has('--skip-remote'),
  };
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function scpPayload(localPayloadPath: string, remotePayloadPath: string) {
  const target = requireEnv('PUBLISH_SSH_TARGET');
  execFileSync('scp', [localPayloadPath, `${target}:${remotePayloadPath}`], { stdio: 'inherit' });
}

function importRemotePayload(remotePayloadPath: string) {
  const target = requireEnv('PUBLISH_SSH_TARGET');
  const remoteAppDir = process.env.PUBLISH_REMOTE_APP_DIR || '/var/www/TFTBlog-NEXTJS';
  const remoteDatabaseUrl = process.env.PUBLISH_REMOTE_DATABASE_URL || 'file:./data/tftblog.sqlite';
  const command = [
    `cd ${JSON.stringify(remoteAppDir)}`,
    `DATABASE_URL=${JSON.stringify(remoteDatabaseUrl)} node scripts/import-guide-payload.mjs ${JSON.stringify(remotePayloadPath)}`,
  ].join(' && ');

  execFileSync('ssh', [target, command], { stdio: 'inherit' });
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const args = parseArgs(process.argv.slice(2));
  if (!args.markdownPath) {
    throw new Error('Usage: npm run publish:guide -- <guide.md> [--dry-run] [--local-only] [--skip-remote]');
  }

  const assetRoots = [
    ...(process.env.GUIDE_ASSET_SOURCE ? [process.env.GUIDE_ASSET_SOURCE] : []),
    'D:\\ob\\JLH\\90 附件',
  ];
  const result = await prepareGuidePublishPayload({
    markdownPath: args.markdownPath,
    dryRun: args.dryRun,
    localOnly: args.localOnly,
    assetRoots,
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-publish-'));
  const payloadPath = path.join(tempDir, `${result.slug}.json`);
  fs.writeFileSync(payloadPath, JSON.stringify(result.payload, null, 2), 'utf8');

  if (!args.localOnly && !args.skipRemote && !args.dryRun) {
    const remoteTmpDir = process.env.PUBLISH_REMOTE_TMP_DIR || '/tmp';
    const remotePayloadPath = `${remoteTmpDir.replace(/\/+$/, '')}/${result.slug}-${Date.now()}.json`;
    scpPayload(payloadPath, remotePayloadPath);
    importRemotePayload(remotePayloadPath);
  }

  console.log(
    JSON.stringify(
      {
        slug: result.slug,
        images: result.imageUploads.map((image) => ({
          ref: image.ref,
          objectKey: image.objectKey,
          publicUrl: image.publicUrl,
          dryRun: image.dryRun,
        })),
        payloadPath,
        localOnly: args.localOnly,
        dryRun: args.dryRun,
        remoteSkipped: args.skipRemote || args.dryRun || args.localOnly,
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

