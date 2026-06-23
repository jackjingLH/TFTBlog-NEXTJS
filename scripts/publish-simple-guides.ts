import fs from 'fs';
import path from 'path';
import { openGuideContentStore } from '../lib/guide-content-store';

interface GuideFrontmatter {
  title: string;
  cover: string;
  source: string;
  updatedAt: string;
  tags: string[];
}

function parseFrontmatter(content: string): GuideFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error('No frontmatter found');

  const yaml = match[1];
  const lines = yaml.split('\n');
  const fm: any = {};
  let currentKey = '';
  let inArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('- ')) {
      if (inArray && Array.isArray(fm[currentKey])) {
        fm[currentKey].push(trimmed.slice(2).trim());
      }
    } else if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      currentKey = key;
      if (value) {
        fm[key] = value;
        inArray = false;
      } else {
        fm[key] = [];
        inArray = true;
      }
    }
  }

  return {
    title: fm.title,
    cover: fm.cover,
    source: fm.source,
    updatedAt: fm.updatedAt,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
  };
}

function extractExcerpt(body: string): string {
  const lines = body.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!');
  });
  return lines[0]?.trim() || '无摘要';
}

async function publishSimpleGuides() {
  const guides = [
    'content/guides/gwen-pyke/TFT.md',
    'content/guides/hedge-fund/TFT.md',
    'content/guides/jax-jinx/TFT.md',
    'content/guides/viktor-nami/TFT.md',
  ];

  const store = await openGuideContentStore();

  for (const guidePath of guides) {
    console.log(`Publishing ${guidePath}...`);

    const content = fs.readFileSync(guidePath, 'utf8');
    const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    const body = match ? content.slice(match[0].length) : content;

    const fm = parseFrontmatter(content);
    const slug = path.basename(path.dirname(guidePath));

    await store.upsertGuide({
      slug,
      title: fm.title,
      excerpt: extractExcerpt(body),
      contentMarkdown: body,
      coverUrl: null, // 本地发布暂不处理图片
      source: fm.source,
      updatedAt: fm.updatedAt,
      readingMinutes: Math.ceil(body.length / 500),
      tags: fm.tags,
    });

    console.log(`✓ Published: ${slug}`);
  }

  await store.close();
  console.log('\nAll 4 guides published successfully!');
}

publishSimpleGuides().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
