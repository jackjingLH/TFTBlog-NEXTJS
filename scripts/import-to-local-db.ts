#!/usr/bin/env node
/**
 * Batch import guides to local SQLite database only (no SSH upload)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openGuideContentStore } from '../lib/guide-content-store';
import { prepareGuidePublishPayload } from '../lib/guide-publisher';

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

async function importToLocalDb() {
  console.log(`Importing ${newGuideSlugs.length} guides to local SQLite...\n`);

  const store = await openGuideContentStore();
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
      const result = await prepareGuidePublishPayload({
        markdownPath: tftFile,
        dryRun: true,
        localOnly: true,
      });

      await store.upsertGuide(result.payload);

      console.log(`✅ ${slug}: imported`);
      success++;
    } catch (error) {
      console.error(`❌ ${slug}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  await store.close();

  console.log(`\n=== Summary ===`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nVerify:`);
  console.log(`sqlite3 data/tftblog.sqlite "SELECT slug, title, cover_url FROM guides ORDER BY published_at DESC LIMIT 15;"`);
}

importToLocalDb().catch(console.error);
