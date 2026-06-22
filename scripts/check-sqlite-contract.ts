import fs from 'fs';
import os from 'os';
import path from 'path';
import { openGuideContentStore, resolveGuideDatabasePath } from '../lib/guide-content-store';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-sqlite-contract-'));
const databaseUrl = `file:${path.join(tempRoot, 'content.sqlite')}`;

async function main() {
  const resolvedPath = resolveGuideDatabasePath(databaseUrl);
  if (!resolvedPath.endsWith('content.sqlite')) {
    throw new Error(`Unexpected resolved database path: ${resolvedPath}`);
  }

  const store = await openGuideContentStore(databaseUrl);
  const first = await store.upsertGuide({
    slug: 'contract-guide',
    title: '契约测试攻略',
    excerpt: '用于验证 SQLite 内容库契约。',
    contentMarkdown: '# 契约测试攻略\n\n正文内容。',
    coverUrl: 'https://cdn.example.com/guides/contract/cover.png',
    source: 'contract-test',
    updatedAt: '2026-06-09',
    status: 'published',
    readingMinutes: 2,
    tags: ['测试', 'SQLite', '测试'],
  });

  if (!first || first.tags.length !== 2) {
    throw new Error('Initial upsert did not normalize duplicate tags.');
  }

  const second = await store.upsertGuide({
    slug: 'contract-guide',
    title: '契约测试攻略更新',
    excerpt: '用于验证同 slug 更新。',
    contentMarkdown: '# 契约测试攻略更新\n\n正文内容。',
    coverUrl: 'https://cdn.example.com/guides/contract/cover-v2.png',
    source: 'contract-test',
    updatedAt: '2026-06-10',
    status: 'published',
    readingMinutes: 3,
    tags: ['SQLite'],
  });

  const guides = await store.listGuides();
  const guide = await store.findGuideBySlug('contract-guide');
  await store.close();

  if (!second || !guide || guides.length !== 1) {
    throw new Error('Guide repository did not return the upserted guide.');
  }

  if (
    guide.slug !== 'contract-guide' ||
    guide.title !== '契约测试攻略更新' ||
    guide.excerpt !== '用于验证同 slug 更新。' ||
    guide.coverUrl !== 'https://cdn.example.com/guides/contract/cover-v2.png' ||
    guide.source !== 'contract-test' ||
    guide.updatedAt !== '2026-06-10' ||
    guide.readingMinutes !== 3 ||
    guide.status !== 'published' ||
    guide.contentMarkdown.includes('cover-v2.png')
  ) {
    throw new Error('Guide repository returned an invalid guide shape.');
  }

  if (guide.tags.length !== 1 || guide.tags[0] !== 'SQLite') {
    throw new Error('Guide tag upsert did not replace stale tags.');
  }

  console.log('SQLite guide contract check passed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
