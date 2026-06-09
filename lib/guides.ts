import fs from 'fs';
import path from 'path';

export interface GuideMeta {
  slug: string;
  title: string;
  tags: string[];
  excerpt: string;
  cover: string | null;
  updatedAt: string;
  source: string;
  readingMinutes: number;
}

export interface Guide extends GuideMeta {
  content: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

const guidesRoot = path.join(process.cwd(), 'content', 'guides');
const publicGuidesRoot = path.join(process.cwd(), 'public', 'guides');

function stripFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: '', body: raw };
  }

  return {
    frontmatter: match[1],
    body: raw.slice(match[0].length),
  };
}

function parseTags(frontmatter: string) {
  const lines = frontmatter.split(/\r?\n/);
  const tags: string[] = [];
  let insideTags = false;

  for (const line of lines) {
    if (/^tags:\s*$/.test(line)) {
      insideTags = true;
      continue;
    }

    if (insideTags) {
      const tag = line.match(/^\s*-\s*(.+?)\s*$/)?.[1];
      if (tag) {
        tags.push(tag);
        continue;
      }
      if (/^\S/.test(line)) {
        insideTags = false;
      }
    }
  }

  return tags;
}

export function slugifyHeading(text: string) {
  return text
    .replace(/[`*_#]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function getTitle(body: string, slug: string) {
  return body.match(/^#\s+(.+)$/m)?.[1].trim() ?? slug;
}

function getSource(body: string) {
  return body.match(/^来源：(.+)$/m)?.[1].trim() ?? '内容整理';
}

function getExcerpt(body: string) {
  const cleaned = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/[#*_`>]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('标签：') && !line.startsWith('封面：') && !line.startsWith('来源：'));

  return (cleaned[0] ?? '攻略内容整理中。').slice(0, 86);
}

export function guideAssetPath(slug: string, imageName: string) {
  const cleanName = imageName.split('|')[0].trim();
  const publicPath = path.join(publicGuidesRoot, slug, cleanName);

  if (!fs.existsSync(publicPath)) {
    return null;
  }

  return `/guides/${slug}/${encodeURIComponent(cleanName).replace(/%2F/g, '/')}`;
}

function getCover(body: string, slug: string) {
  const obsidianCover = body.match(/封面：!\[\[([^\]]+)\]\]/)?.[1];
  if (obsidianCover) {
    return guideAssetPath(slug, obsidianCover);
  }

  const firstObsidianImage = body.match(/!\[\[([^\]]+)\]\]/)?.[1];
  if (firstObsidianImage) {
    return guideAssetPath(slug, firstObsidianImage);
  }

  const markdownImage = body.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1];
  return markdownImage && !markdownImage.startsWith('..') ? markdownImage : null;
}

function getHeadings(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (!match) return null;
      const text = match[2].trim();
      return { id: slugifyHeading(text), text, level: match[1].length };
    })
    .filter((heading): heading is { id: string; text: string; level: number } => Boolean(heading));
}

function readGuide(slug: string): Guide | null {
  const filePath = path.join(guidesRoot, slug, 'TFT.md');
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const { frontmatter, body } = stripFrontmatter(raw);
  const title = getTitle(body, slug);
  const wordCount = body.replace(/\s/g, '').length;

  return {
    slug,
    title,
    tags: parseTags(frontmatter).slice(0, 8),
    excerpt: getExcerpt(body),
    cover: getCover(body, slug),
    updatedAt: stat.mtime.toISOString(),
    source: getSource(body),
    readingMinutes: Math.max(1, Math.ceil(wordCount / 500)),
    content: body.trim(),
    headings: getHeadings(body),
  };
}

export function getAllGuides() {
  if (!fs.existsSync(guidesRoot)) {
    return [];
  }

  return fs
    .readdirSync(guidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readGuide(entry.name))
    .filter((guide): guide is Guide => Boolean(guide))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function getGuideBySlug(slug: string) {
  return readGuide(slug);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}
