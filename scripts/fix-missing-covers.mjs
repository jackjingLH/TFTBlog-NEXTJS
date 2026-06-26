#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const guidesDir = path.join(projectRoot, 'content', 'guides');
const publicDir = path.join(projectRoot, 'public', 'guides');

// List of newly imported guides (source: obsidian)
const newGuideSlugs = [
  '关爱包裹概率表',
  '前线地基',
  '后排蓝图',
  '坦度成双-莎弥拉',
  '奥瑞利安-索尔',
  '崔斯特-贾克斯',
  '摘星之志-贾克斯',
  '未来战士-璐璐',
  '自我毁灭-酒桶',
  '艾克的祝福',
  '观星者-霞',
  '重装-95',
  '锤石的恩赐',
];

let fixed = 0;
let skipped = 0;

for (const slug of newGuideSlugs) {
  const tftFile = path.join(guidesDir, slug, 'TFT.md');
  if (!fs.existsSync(tftFile)) {
    console.log(`⚠️  ${slug}: TFT.md not found`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(tftFile, 'utf-8');
  const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!frontmatterMatch) {
    console.log(`⚠️  ${slug}: no frontmatter`);
    skipped++;
    continue;
  }

  const coverMatch = frontmatterMatch[1].match(/cover:\s*(.+)/);
  if (!coverMatch) {
    console.log(`ℹ️  ${slug}: no cover field (already clean)`);
    continue;
  }

  const coverFilename = coverMatch[1].trim().replace(/^\[\[|\]\]$/g, '');
  const coverPath = path.join(publicDir, slug, coverFilename);

  // Check if cover file exists
  if (fs.existsSync(coverPath)) {
    console.log(`✅ ${slug}: cover exists, keeping it`);
    continue;
  }

  // Remove invalid cover field
  const newFrontmatter = frontmatterMatch[1]
    .split('\n')
    .filter(line => !line.trim().startsWith('cover:'))
    .join('\n');

  content = content.replace(
    /^---[\r\n]+[\s\S]*?[\r\n]+---/,
    `---\n${newFrontmatter}\n---`
  );

  fs.writeFileSync(tftFile, content, 'utf-8');
  console.log(`🔧 ${slug}: removed invalid cover field`);
  fixed++;
}

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed}`);
console.log(`Skipped: ${skipped}`);
console.log(`\nRun 'npm run check:guide-contract' to verify.`);
