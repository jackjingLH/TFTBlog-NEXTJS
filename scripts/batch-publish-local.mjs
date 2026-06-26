#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const guidesDir = path.join(projectRoot, 'content', 'guides');

// List of newly imported guides to publish
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

console.log(`Publishing ${newGuideSlugs.length} guides to local SQLite (--local-only mode)...\n`);

let success = 0;
let failed = 0;

for (const slug of newGuideSlugs) {
  const tftFile = path.join(guidesDir, slug, 'TFT.md');

  if (!fs.existsSync(tftFile)) {
    console.log(`❌ ${slug}: TFT.md not found`);
    failed++;
    continue;
  }

  try {
    console.log(`Publishing: ${slug}...`);
    execSync(`npm run publish:guide -- "${tftFile}" --local-only`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log(`✅ ${slug}: published\n`);
    success++;
  } catch (error) {
    console.error(`❌ ${slug}: failed\n`);
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Success: ${success}`);
console.log(`Failed: ${failed}`);
console.log(`\nCheck local database:`);
console.log(`sqlite3 data/tftblog.sqlite "SELECT slug, title FROM guides ORDER BY publishedAt DESC LIMIT 15;"`);
