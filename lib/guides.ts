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

interface GuideContractMeta {
  title: string;
  tags: string[];
  cover: string;
  source: string;
  updatedAt: string;
}

interface GuideContractValidation {
  slug: string;
  errors: string[];
}

const guidesRoot = path.join(process.cwd(), 'content', 'guides');
const publicGuidesRoot = path.join(process.cwd(), 'public', 'guides');
const requiredContractFields = ['title', 'tags', 'source', 'updatedAt'] as const;

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

function unquote(value: string) {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^['"]([\s\S]*)['"]$/);
  return quoted ? quoted[1].trim() : trimmed;
}

function parseFrontmatterProperties(frontmatter: string) {
  const values = new Map<string, string | string[]>();
  let currentListKey: string | null = null;

  for (const line of frontmatter.split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (pair) {
      const key = pair[1];
      const value = pair[2].trim();
      if (value) {
        values.set(key, unquote(value));
        currentListKey = null;
      } else {
        values.set(key, []);
        currentListKey = key;
      }
      continue;
    }

    if (currentListKey) {
      const listItem = line.match(/^\s*-\s*(.+?)\s*$/)?.[1];
      if (listItem) {
        const list = values.get(currentListKey);
        if (Array.isArray(list)) {
          list.push(unquote(listItem));
        }
      }
    }
  }

  return values;
}

function normalizeAssetRef(value: string) {
  const cleanValue = unquote(value);
  const obsidian = cleanValue.match(/^!\[\[([^\]]+)\]\]$/)?.[1];
  const markdown = cleanValue.match(/^!\[[^\]]*]\(([^)]+)\)$/)?.[1];
  return (obsidian || markdown || cleanValue).split('|')[0].trim();
}

function readStringField(values: Map<string, string | string[]>, key: string, errors: string[]) {
  const value = values.get(key);
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`missing required frontmatter field: ${key}`);
    return '';
  }
  return value.trim();
}

function readTags(values: Map<string, string | string[]>, errors: string[]) {
  const value = values.get('tags');
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('missing required frontmatter field: tags');
    return [];
  }
  return value.map((tag) => tag.trim()).filter(Boolean);
}

function parseGuideContract(raw: string): { body: string; metadata: GuideContractMeta | null; errors: string[] } {
  const { frontmatter, body } = stripFrontmatter(raw);
  const errors: string[] = [];

  if (!frontmatter) {
    errors.push('missing YAML frontmatter block');
  }

  const values = parseFrontmatterProperties(frontmatter);
  const missingFields = requiredContractFields.filter((field) => !values.has(field));
  for (const field of missingFields) {
    errors.push(`missing required frontmatter field: ${field}`);
  }

  const title = readStringField(values, 'title', errors);
  const tags = readTags(values, errors);
  const coverValue = values.get('cover');
  const cover = typeof coverValue === 'string' && coverValue.trim() ? normalizeAssetRef(coverValue.trim()) : '';
  const source = readStringField(values, 'source', errors);
  const updatedAt = readStringField(values, 'updatedAt', errors);

  if (updatedAt && !/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
    errors.push('frontmatter updatedAt must use YYYY-MM-DD');
  }

  if (errors.length > 0) {
    return { body, metadata: null, errors: Array.from(new Set(errors)) };
  }

  return {
    body,
    metadata: {
      title,
      tags,
      cover,
      source,
      updatedAt,
    },
    errors: [],
  };
}

export function slugifyHeading(text: string) {
  return text
    .replace(/[`*_#]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
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
  const { body, metadata, errors } = parseGuideContract(raw);
  if (!metadata) {
    throw new Error(`Invalid guide contract in ${filePath}: ${errors.join('; ')}`);
  }

  const cover = guideAssetPath(slug, metadata.cover);
  if (!cover) {
    throw new Error(`Invalid guide contract in ${filePath}: cover asset not found: ${metadata.cover}`);
  }

  const wordCount = body.replace(/\s/g, '').length;

  return {
    slug,
    title: metadata.title,
    tags: metadata.tags.slice(0, 8),
    excerpt: getExcerpt(body),
    cover,
    updatedAt: metadata.updatedAt,
    source: metadata.source,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 500)),
    content: body.trim(),
    headings: getHeadings(body),
  };
}

export function validateGuideContracts(): GuideContractValidation[] {
  if (!fs.existsSync(guidesRoot)) {
    return [{ slug: 'content/guides', errors: [`Guides directory not found: ${guidesRoot}`] }];
  }

  return fs
    .readdirSync(guidesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const filePath = path.join(guidesRoot, entry.name, 'TFT.md');
      if (!fs.existsSync(filePath)) {
        return { slug: entry.name, errors: [] };
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const { metadata, errors } = parseGuideContract(raw);
      const guideErrors = [...errors];

      if (metadata?.cover && !guideAssetPath(entry.name, metadata.cover)) {
        guideErrors.push(`cover asset not found: ${metadata.cover}`);
      }

      return { slug: entry.name, errors: guideErrors };
    })
    .filter((result) => result.errors.length > 0);
}

export function validateGuideContractSource(slug: string, raw: string): GuideContractValidation {
  const { errors } = parseGuideContract(raw);
  return { slug, errors };
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
