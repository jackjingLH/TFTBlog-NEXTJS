#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Obsidian attachments directory
const obsidianAttachDir = 'D:\\ob\\JLH\\90 附件\\TFT';
const targetPublicDir = path.join(projectRoot, 'public', 'guides');

// Read all guide directories
const guidesDir = path.join(projectRoot, 'content', 'guides');
const guideSlugs = fs.readdirSync(guidesDir).filter(f =>
  fs.statSync(path.join(guidesDir, f)).isDirectory()
);

console.log(`Found ${guideSlugs.length} guide directories`);

let copied = 0;
let skipped = 0;

for (const slug of guideSlugs) {
  const tftFile = path.join(guidesDir, slug, 'TFT.md');
  if (!fs.existsSync(tftFile)) continue;

  // Read frontmatter to find cover
  const content = fs.readFileSync(tftFile, 'utf-8');
  const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!frontmatterMatch) continue;

  const coverMatch = frontmatterMatch[1].match(/cover:\s*(.+)/);
  if (!coverMatch) continue;

  const coverFilename = coverMatch[1].trim().replace(/^\[\[|\]\]$/g, ''); // Remove [[]] if present
  const sourcePath = path.join(obsidianAttachDir, coverFilename);

  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  ${slug}: cover not found in Obsidian - ${coverFilename}`);
    skipped++;
    continue;
  }

  // Create target directory
  const targetDir = path.join(targetPublicDir, slug);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy file
  const targetPath = path.join(targetDir, coverFilename);
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ ${slug}: copied ${coverFilename}`);
  copied++;
}

console.log(`\n=== Summary ===`);
console.log(`Copied: ${copied}`);
console.log(`Skipped: ${skipped}`);
