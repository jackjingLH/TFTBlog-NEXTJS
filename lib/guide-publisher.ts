import fs from 'fs';
import path from 'path';
import { GuideUpsertInput, openGuideContentStore } from './guide-content-store';
import { readServerUploadConfig, ServerUploadConfig, uploadGuideImage } from './server-upload-assets';

interface ParsedFrontmatter {
  title: string;
  tags: string[];
  cover: string | null;
  source: string;
  updatedAt: string;
  slug?: string;
}

export interface PublishGuideOptions {
  markdownPath: string;
  dryRun?: boolean;
  localOnly?: boolean;
  assetRoots?: string[];
  uploadConfig?: ServerUploadConfig;
}

export interface PublishGuideResult {
  slug: string;
  payload: GuideUpsertInput;
  imageUploads: Array<{ ref: string; filePath: string; objectKey: string; publicUrl: string; dryRun: boolean }>;
}

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

function stripFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {
      frontmatter: '',
      body: raw,
    };
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

function splitTagLine(value: string) {
  return value
    .split(/[\/,，、]+/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inferTitle(markdownPath: string, body: string) {
  const heading = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
  if (heading) return heading;

  return path
    .basename(markdownPath, path.extname(markdownPath))
    .replace(/^\d+\s*-\s*/, '')
    .trim();
}

function inferSource(body: string) {
  return body.match(/^来源[:：]\s*(.+?)\s*$/im)?.[1]?.trim() || 'unknown';
}

function inferTags(body: string, title: string) {
  const tagLine = body.match(/^标签[:：]\s*(.+?)\s*$/im)?.[1];
  const tags = tagLine ? splitTagLine(tagLine) : [];
  return tags.length > 0 ? tags : [title];
}

function inferCover(body: string) {
  const coverLine = body.match(/^封面[:：]\s*(.+?)\s*$/im)?.[1];
  if (coverLine && isImageRef(coverLine)) return cleanAssetRef(coverLine);

  const obsidian = body.match(/!\[\[([^\]]+)\]\]/)?.[1];
  if (obsidian && isImageRef(obsidian)) return cleanAssetRef(obsidian);

  const markdown = body.match(/!\[[^\]]*]\(([^)]+)\)/)?.[1];
  if (markdown && !/^https?:\/\//.test(markdown) && !markdown.startsWith('/') && isImageRef(markdown)) {
    return cleanAssetRef(markdown);
  }

  return null;
}

function parseFrontmatter(frontmatter: string, body: string, markdownPath: string): ParsedFrontmatter {
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

  const readString = (key: string) => {
    const value = values.get(key);
    return typeof value === 'string' ? value.trim() : '';
  };

  const title = readString('title') || inferTitle(markdownPath, body);
  const tagValue = values.get('tags');
  const tags = Array.isArray(tagValue)
    ? tagValue.map((tag) => tag.trim()).filter(Boolean)
    : typeof tagValue === 'string' && tagValue.trim()
      ? splitTagLine(tagValue)
      : inferTags(body, title);
  const cover = readString('cover') ? cleanAssetRef(readString('cover')) : inferCover(body);
  const source = readString('source') || inferSource(body);
  const updatedAt = readString('updatedAt') || formatDateOnly(fs.statSync(markdownPath).mtime);

  if (updatedAt && !/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
    throw new Error('Invalid guide frontmatter: updatedAt must use YYYY-MM-DD');
  }

  return {
    title,
    tags,
    cover,
    source,
    updatedAt,
    slug: typeof values.get('slug') === 'string' ? (values.get('slug') as string).trim() : undefined,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function inferSlug(markdownPath: string, metadata: ParsedFrontmatter) {
  if (metadata.slug) return slugify(metadata.slug);

  const parent = path.basename(path.dirname(markdownPath));
  if (path.basename(markdownPath).toLowerCase() === 'tft.md' && parent) {
    return slugify(parent);
  }

  return slugify(metadata.title || path.basename(markdownPath, path.extname(markdownPath)));
}

function cleanAssetRef(value: string) {
  const obsidian = value.match(/^!\[\[([^\]]+)\]\]$/)?.[1];
  const markdown = value.match(/^!\[[^\]]*]\(([^)]+)\)$/)?.[1];
  return (obsidian || markdown || value)
    .split('|')[0]
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .pop() || '';
}

function isImageRef(value: string) {
  return imageExtensions.has(path.extname(cleanAssetRef(value)).toLowerCase());
}

function extractImageRefs(markdown: string, cover: string | null) {
  const refs = new Set<string>();
  if (cover && isImageRef(cover)) refs.add(cleanAssetRef(cover));

  for (const match of markdown.matchAll(/!\[\[([^\]]+)\]\]/g)) {
    if (isImageRef(match[1])) refs.add(cleanAssetRef(match[1]));
  }

  for (const match of markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (/^https?:\/\//.test(target) || target.startsWith('/')) continue;
    if (isImageRef(target)) refs.add(cleanAssetRef(target));
  }

  return Array.from(refs);
}

function findAssetFile(assetName: string, roots: string[]) {
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;

    const direct = path.join(root, assetName);
    if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
      return direct;
    }

    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }

        if (entry.isFile() && entry.name === assetName) {
          return fullPath;
        }
      }
    }
  }

  return null;
}

function publicGuideAssetUrl(slug: string, filePath: string) {
  const publicGuideRoot = path.join(process.cwd(), 'public', 'guides', slug);
  const relativePath = path.relative(publicGuideRoot, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  const encodedSlug = encodeURIComponent(slug);
  const encodedAssetPath = relativePath
    .split(path.sep)
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `/guides/${encodedSlug}/${encodedAssetPath}`;
}

function getExcerpt(markdown: string) {
  const cleaned = markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/[#*_`>]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('标签：') && !line.startsWith('封面：') && !line.startsWith('来源：'));

  return (cleaned[0] || '攻略内容整理中。').slice(0, 86);
}

function replaceImageRefs(markdown: string, uploadedUrls: Map<string, string>) {
  return markdown
    .replace(/!\[\[([^\]]+)\]\]/g, (full, rawRef) => {
      const assetName = cleanAssetRef(rawRef);
      const url = uploadedUrls.get(assetName);
      return url ? `![${assetName}](${url})` : full;
    })
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, (full, alt, rawTarget) => {
      const target = rawTarget.trim();
      if (/^https?:\/\//.test(target) || target.startsWith('/')) return full;
      const assetName = cleanAssetRef(target);
      const url = uploadedUrls.get(assetName);
      return url ? `![${alt || assetName}](${url})` : full;
    });
}

export async function prepareGuidePublishPayload(options: PublishGuideOptions): Promise<PublishGuideResult> {
  const markdownPath = path.resolve(options.markdownPath);
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`Guide Markdown file not found: ${markdownPath}`);
  }

  const raw = fs.readFileSync(markdownPath, 'utf8');
  const { frontmatter, body } = stripFrontmatter(raw);
  const metadata = parseFrontmatter(frontmatter, body, markdownPath);
  const slug = inferSlug(markdownPath, metadata);
  const assetRoots = [
    path.dirname(markdownPath),
    path.join(process.cwd(), 'public', 'guides', slug),
    ...(options.assetRoots || []),
  ];
  const uploadConfig = options.uploadConfig || readServerUploadConfig();
  const refs = extractImageRefs(body, metadata.cover);
  const uploadedUrls = new Map<string, string>();
  const imageUploads: PublishGuideResult['imageUploads'] = [];

  for (const ref of refs) {
    const filePath = findAssetFile(ref, assetRoots);
    if (!filePath) {
      throw new Error(`Guide image not found: ${ref}. Searched: ${assetRoots.join('; ')}`);
    }

    // In localOnly mode, copy image to public/guides/<slug>/ if not already there
    let targetFilePath = filePath;
    if (options.localOnly) {
      const publicGuideDir = path.join(process.cwd(), 'public', 'guides', slug);
      const targetPath = path.join(publicGuideDir, path.basename(filePath));

      if (!fs.existsSync(publicGuideDir)) {
        fs.mkdirSync(publicGuideDir, { recursive: true });
      }

      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(filePath, targetPath);
      }

      targetFilePath = targetPath;
    }

    const localPublicUrl = options.localOnly ? publicGuideAssetUrl(slug, targetFilePath) : null;
    const upload = localPublicUrl
      ? {
          objectKey: `guides/${slug}/${ref}`,
          publicUrl: localPublicUrl,
          size: fs.statSync(targetFilePath).size,
          hash: '',
        }
      : await uploadGuideImage(uploadConfig, {
          slug,
          filePath,
          publicName: ref,
          dryRun: options.dryRun,
        });

    uploadedUrls.set(ref, upload.publicUrl);
    imageUploads.push({ ref, filePath, objectKey: upload.objectKey, publicUrl: upload.publicUrl, dryRun: Boolean(options.dryRun) });
  }

  const contentMarkdown = replaceImageRefs(body, uploadedUrls).trim();
  const coverUrl = metadata.cover ? uploadedUrls.get(metadata.cover) || null : null;
  if (metadata.cover && !coverUrl) {
    throw new Error(`Guide cover was not uploaded or resolved: ${metadata.cover}`);
  }

  const payload: GuideUpsertInput = {
    slug,
    title: metadata.title,
    excerpt: getExcerpt(contentMarkdown),
    contentMarkdown,
    coverUrl,
    source: metadata.source,
    updatedAt: metadata.updatedAt,
    status: 'published',
    readingMinutes: Math.max(1, Math.ceil(contentMarkdown.replace(/\s/g, '').length / 500)),
    tags: metadata.tags,
  };

  if (options.localOnly) {
    const store = await openGuideContentStore();
    try {
      await store.upsertGuide(payload);
    } finally {
      await store.close();
    }
  }

  return {
    slug,
    payload,
    imageUploads,
  };
}
