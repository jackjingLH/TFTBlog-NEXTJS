#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const guidesDir = path.join(projectRoot, 'content', 'guides');

// All newly imported guides (excluding already published ones)
const newGuideSlugs = [
  '后排蓝图',
  '坦度成双-莎弥拉',
  '奥瑞利安-索尔',
  '崔斯特-贾克斯',
  '摘星之志-贾克斯',
  '未来战士-璐璐',
  '自我毁灭-酒桶',
  '观星者-霞',
  '重装-95',
];

console.log(`Publishing ${newGuideSlugs.length} guides with images to local SQLite...\n`);

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
      stdio: 'pipe',
      env: {
        ...process.env,
        PUBLISH_SSH_TARGET: 'dummy', // Required but not used in local-only mode
      },
    });
    console.log(`✅ ${slug}: published\n`);
    success++;
  } catch (error) {
    console.error(`❌ ${slug}: failed`);
    console.error(error.stderr?.toString() || error.message);
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Success: ${success}`);
console.log(`Failed: ${failed}`);
console.log(`\nTotal guides in database: ${success + 4 + 5} (5 original + 4 text-only + ${success} with images)`);
