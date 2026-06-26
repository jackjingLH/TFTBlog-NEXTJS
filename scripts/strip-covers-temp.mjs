#!/usr/bin/env node
/**
 * Strip cover field from all guides to allow local-only publish
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const guidesDir = path.join(projectRoot, 'content', 'guides');

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

console.log('Removing cover fields to enable local-only publish...\n');

for (const slug of newGuideSlugs) {
  const tftFile = path.join(guidesDir, slug, 'TFT.md');
  if (!fs.existsSync(tftFile)) continue;

  let content = fs.readFileSync(tftFile, 'utf-8');
  const hasCover = content.match(/^cover:/m);

  if (hasCover) {
    content = content.replace(/^cover:.*$/m, '');
    fs.writeFileSync(tftFile, content, 'utf-8');
    console.log(`✅ ${slug}: removed cover field`);
  } else {
    console.log(`ℹ️  ${slug}: no cover field`);
  }
}

console.log('\nDone. Covers can be re-added later after images are uploaded.');
