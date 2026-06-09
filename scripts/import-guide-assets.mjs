import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const workspaceRoot = process.cwd();
const guidesRoot = path.join(workspaceRoot, 'content', 'guides');
const publicGuidesRoot = path.join(workspaceRoot, 'public', 'guides');
const defaultAssetSource = 'D:\\ob\\JLH\\90 附件';
const assetSource = process.env.GUIDE_ASSET_SOURCE || process.argv[2] || defaultAssetSource;
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

function listGuideFiles() {
  if (!fs.existsSync(guidesRoot)) {
    throw new Error(`Guides directory not found: ${guidesRoot}`);
  }

  return fs
    .readdirSync(guidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      slug: entry.name,
      markdownPath: path.join(guidesRoot, entry.name, 'TFT.md'),
    }))
    .filter((guide) => fs.existsSync(guide.markdownPath));
}

function cleanAssetName(value) {
  return value
    .split('|')[0]
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .pop();
}

function extractImageRefs(markdown) {
  const refs = new Set();
  const obsidianPattern = /!\[\[([^\]]+)\]\]/g;
  const markdownPattern = /!\[[^\]]*]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(obsidianPattern)) {
    const assetName = cleanAssetName(match[1]);
    if (assetName && imageExtensions.has(path.extname(assetName).toLowerCase())) {
      refs.add(assetName);
    }
  }

  for (const match of markdown.matchAll(markdownPattern)) {
    const rawTarget = match[1].trim();
    if (/^https?:\/\//.test(rawTarget) || rawTarget.startsWith('/')) {
      continue;
    }

    const assetName = cleanAssetName(rawTarget);
    if (assetName && imageExtensions.has(path.extname(assetName).toLowerCase())) {
      refs.add(assetName);
    }
  }

  return Array.from(refs);
}

function buildAssetIndex(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`Guide asset source not found: ${root}`);
  }

  const index = new Map();
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()) && !index.has(entry.name)) {
        index.set(entry.name, fullPath);
      }
    }
  }

  return index;
}

function copyGuideAssets(guide, assetIndex) {
  const markdown = fs.readFileSync(guide.markdownPath, 'utf8');
  const refs = extractImageRefs(markdown);
  const targetDir = path.join(publicGuidesRoot, guide.slug);
  const copied = [];
  const existing = [];
  const missing = [];

  fs.mkdirSync(targetDir, { recursive: true });

  for (const ref of refs) {
    const sourcePath = assetIndex.get(ref);
    const targetPath = path.join(targetDir, ref);

    if (!sourcePath) {
      missing.push(ref);
      continue;
    }

    if (fs.existsSync(targetPath)) {
      existing.push(ref);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
    copied.push(ref);
  }

  return {
    slug: guide.slug,
    refs: refs.length,
    copied,
    existing,
    missing,
  };
}

function main() {
  const guides = listGuideFiles();
  const assetIndex = buildAssetIndex(assetSource);
  const results = guides.map((guide) => copyGuideAssets(guide, assetIndex));
  const missing = results.flatMap((result) => result.missing.map((asset) => `${result.slug}: ${asset}`));
  const copiedCount = results.reduce((count, result) => count + result.copied.length, 0);
  const existingCount = results.reduce((count, result) => count + result.existing.length, 0);
  const totalRefs = results.reduce((count, result) => count + result.refs, 0);

  console.log(`Guide asset source: ${assetSource}`);
  console.log(`Guides scanned: ${results.length}`);
  console.log(`Image refs: ${totalRefs}`);
  console.log(`Copied: ${copiedCount}`);
  console.log(`Already present: ${existingCount}`);

  if (missing.length > 0) {
    console.error('Missing guide assets:');
    for (const item of missing) {
      console.error(`- ${item}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All guide assets are available.');
}

main();
