import fs from 'fs';
import os from 'os';
import path from 'path';
import { openGuideContentStore } from '../lib/guide-content-store';
import { prepareGuidePublishPayload } from '../lib/guide-publisher';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-publish-contract-'));
const dbPath = path.join(tempRoot, 'content.sqlite');
const guideDir = path.join(tempRoot, 'contract-guide');
const attachmentDir = path.join(tempRoot, 'attachments');
const markdownPath = path.join(guideDir, 'TFT.md');

fs.mkdirSync(guideDir, { recursive: true });
fs.mkdirSync(attachmentDir, { recursive: true });
fs.writeFileSync(path.join(attachmentDir, 'cover.png'), Buffer.from('cover image'));
fs.writeFileSync(path.join(attachmentDir, 'board.png'), Buffer.from('board image'));
fs.writeFileSync(path.join(attachmentDir, 'items.png'), Buffer.from('items image'));

const markdown = `---
title: 契约发布攻略
cover: cover.png
source: contract
updatedAt: 2026-06-09
tags:
  - 发布
  - SQLite
---

# 契约发布攻略

封面：![[cover.png]]

## 阵容

![[board.png|560]]

## 装备

![装备](items.png)
`;

async function main() {
  process.env.DATABASE_URL = `file:${dbPath}`;
  fs.writeFileSync(markdownPath, markdown);

  try {
    const first = await prepareGuidePublishPayload({
      markdownPath,
      dryRun: true,
      localOnly: true,
      assetRoots: [attachmentDir],
    });

    if (first.slug !== 'contract-guide') {
      throw new Error(`Unexpected inferred slug: ${first.slug}`);
    }

    if (first.imageUploads.length !== 3) {
      throw new Error(`Expected 3 image uploads, got ${first.imageUploads.length}`);
    }

    if (first.payload.contentMarkdown.includes('![[') || first.payload.contentMarkdown.includes('](items.png)')) {
      throw new Error('Markdown image references were not replaced with public URLs.');
    }

    const imageUrls = [
      first.payload.coverUrl,
      ...Array.from(first.payload.contentMarkdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)).map((match) => match[1]),
    ];
    if (imageUrls.some((url) => !url?.startsWith('/uploads/guides/contract-guide/'))) {
      throw new Error(`Published images should use same-origin uploads URLs: ${imageUrls.join(', ')}`);
    }

    const store = await openGuideContentStore(`file:${dbPath}`);
    const saved = await store.findGuideBySlug('contract-guide');
    await store.close();

    if (!saved || saved.title !== '契约发布攻略' || saved.tags.length !== 2) {
      throw new Error('Published guide was not upserted to local SQLite.');
    }

    fs.writeFileSync(markdownPath, markdown.replace('title: 契约发布攻略', 'title: 契约发布攻略更新'));
    await prepareGuidePublishPayload({
      markdownPath,
      dryRun: true,
      localOnly: true,
      assetRoots: [attachmentDir],
    });

    const verifyStore = await openGuideContentStore(`file:${dbPath}`);
    const guides = await verifyStore.listGuides();
    const updated = await verifyStore.findGuideBySlug('contract-guide');
    await verifyStore.close();

    if (guides.length !== 1 || updated?.title !== '契约发布攻略更新') {
      throw new Error('Publishing the same slug did not update in place.');
    }

    let missingFailed = false;
    fs.writeFileSync(markdownPath, markdown.replace('items.png', 'missing.png'));
    try {
      await prepareGuidePublishPayload({
        markdownPath,
        dryRun: true,
        localOnly: true,
        assetRoots: [attachmentDir],
      });
    } catch (error) {
      missingFailed = error instanceof Error && error.message.includes('Guide image not found: missing.png');
    }

    if (!missingFailed) {
      throw new Error('Missing image did not fail before writing SQLite.');
    }

    console.log('Guide publish contract check passed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
