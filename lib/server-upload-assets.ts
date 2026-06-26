import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ServerUploadConfig {
  sshTarget?: string;
  uploadsDir: string;
  publicBaseUrl: string;
}

export interface UploadGuideImageOptions {
  slug: string;
  filePath: string;
  publicName?: string;
  dryRun?: boolean;
}

export interface UploadedGuideImage {
  objectKey: string;
  publicUrl: string;
  size: number;
  hash: string;
}

const defaultUploadsDir = '/var/www/TFTBlog-NEXTJS/uploads';
const defaultPublicBaseUrl = '/uploads';

export function readServerUploadConfig(env: Record<string, string | undefined> = process.env): ServerUploadConfig {
  const uploadsDir = (env.PUBLISH_UPLOADS_DIR?.trim() || defaultUploadsDir).replace(/\\/g, '/').replace(/\/+$/, '');
  const publicBaseUrl = (env.PUBLISH_UPLOADS_PUBLIC_BASE?.trim() || defaultPublicBaseUrl).replace(/\/+$/, '');

  if (!uploadsDir) {
    throw new Error('PUBLISH_UPLOADS_DIR file path is empty.');
  }

  if (!publicBaseUrl) {
    throw new Error('PUBLISH_UPLOADS_PUBLIC_BASE is empty.');
  }

  return {
    sshTarget: env.PUBLISH_SSH_TARGET?.trim() || undefined,
    uploadsDir,
    publicBaseUrl,
  };
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function hashFile(filePath: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 12);
}

function guideUploadSlugSegment(slug: string) {
  if (!slug.trim()) {
    throw new Error('Guide slug is required for upload object key.');
  }

  const cleanSlug = sanitizePathSegment(slug);
  if (cleanSlug === slug.toLowerCase()) {
    return cleanSlug;
  }

  const slugHash = crypto.createHash('sha256').update(slug).digest('hex').slice(0, 8);
  return cleanSlug ? `guide-${slugHash}-${cleanSlug}` : `guide-${slugHash}`;
}

export function buildGuideImageObjectKey(slug: string, filePath: string, publicName = path.basename(filePath)) {
  const cleanSlug = guideUploadSlugSegment(slug);
  const ext = path.extname(publicName);
  const baseName = sanitizePathSegment(path.basename(publicName, ext)) || 'image';
  const cleanExt = sanitizePathSegment(ext.replace(/^\./, ''));
  const hash = hashFile(filePath);
  const filename = cleanExt ? `${hash}-${baseName}.${cleanExt}` : `${hash}-${baseName}`;

  return `guides/${cleanSlug}/${filename}`;
}

export function publicUploadUrl(config: Pick<ServerUploadConfig, 'publicBaseUrl'>, objectKey: string) {
  const encodedKey = objectKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${config.publicBaseUrl.replace(/\/+$/, '')}/${encodedKey}`;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function remoteUploadPath(config: Pick<ServerUploadConfig, 'uploadsDir'>, objectKey: string) {
  return `${config.uploadsDir.replace(/\/+$/, '')}/${objectKey}`;
}

export async function uploadGuideImage(
  config: ServerUploadConfig,
  options: UploadGuideImageOptions,
): Promise<UploadedGuideImage> {
  if (!fs.existsSync(options.filePath) || !fs.statSync(options.filePath).isFile()) {
    throw new Error(`Image file not found: ${options.filePath}`);
  }

  const objectKey = buildGuideImageObjectKey(options.slug, options.filePath, options.publicName);
  const stats = fs.statSync(options.filePath);

  if (!options.dryRun) {
    if (!config.sshTarget) {
      throw new Error('Missing environment variable: PUBLISH_SSH_TARGET');
    }

    const remotePath = remoteUploadPath(config, objectKey);
    execFileSync('ssh', [config.sshTarget, `mkdir -p ${shellQuote(path.posix.dirname(remotePath))}`], { stdio: 'inherit' });
    execFileSync('scp', [options.filePath, `${config.sshTarget}:${remotePath}`], { stdio: 'inherit' });
  }

  return {
    objectKey,
    publicUrl: publicUploadUrl(config, objectKey),
    size: stats.size,
    hash: objectKey.split('/').pop()?.split('-')[0] || '',
  };
}
