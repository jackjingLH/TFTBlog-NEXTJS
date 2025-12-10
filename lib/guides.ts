import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// 攻略文件目录
const guidesDirectory = path.join(process.cwd(), 'public', 'guides');

// 攻略元数据接口
export interface GuideMetadata {
  slug: string;
  title: string;
  description: string;
  source: string;
  category: string;
  tags: string[];
  cover?: string;
}

// 完整攻略数据接口
export interface GuideData extends GuideMetadata {
  content: string;
}

/**
 * 获取所有攻略的slug列表
 */
export function getAllGuideSlugs(): string[] {
  const items = fs.readdirSync(guidesDirectory, { withFileTypes: true });
  return items
    .filter(item => item.isDirectory())
    .map(item => item.name);
}

/**
 * 获取攻略目录下的 Markdown 文件路径
 */
function getGuideMarkdownPath(slug: string): string | null {
  const guideDir = path.join(guidesDirectory, slug);
  const files = fs.readdirSync(guideDir);
  const mdFile = files.find(file => file.endsWith('.md'));
  return mdFile ? path.join(guideDir, mdFile) : null;
}

/**
 * 解析 Markdown 文件的元数据
 * 从 HTML 注释提取 tags, cover
 * 从第一个 # 标题提取 title
 * 从最后一行提取来源
 */
function parseGuideMetadata(content: string, slug: string) {
  const lines = content.split('\n');

  // 提取 HTML 注释中的数据
  let tags: string[] = [];
  let cover: string | undefined;

  for (const line of lines) {
    const tagsMatch = line.match(/<!--\s*tags:\s*(.+?)\s*-->/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map(t => t.trim());
    }

    const coverMatch = line.match(/<!--\s*cover:\s*(.+?)\s*-->/);
    if (coverMatch) {
      cover = coverMatch[1].trim();
    }
  }

  // 提取第一个 # 标题
  let title = 'Untitled';
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // 提取最后一行的来源
  let source = 'Unknown';
  const lastLine = lines[lines.length - 1].trim();
  const sourceMatch = lastLine.match(/来源:\s*(.+)/);
  if (sourceMatch) {
    source = sourceMatch[1].trim();
  }

  // 提取描述（第一个二级标题后的第一段）
  let description = '';
  const descMatch = content.match(/##[^\n]*\n+([^\n]+)/);
  if (descMatch) {
    description = descMatch[1].replace(/\*\*\*/g, '').replace(/<u>/g, '').replace(/<\/u>/g, '').trim();
  }

  return {
    title,
    description,
    source,
    tags,
    cover,
    category: tags[0] || 'Other', // 使用第一个标签作为分类
  };
}

/**
 * 获取所有攻略的元数据
 */
export function getAllGuides(): GuideMetadata[] {
  const slugs = getAllGuideSlugs();

  const guides = slugs.map(slug => {
    const fullPath = getGuideMarkdownPath(slug);
    if (!fullPath) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const metadata = parseGuideMetadata(fileContents, slug);

    return {
      slug,
      ...metadata
    } as GuideMetadata;
  }).filter(Boolean) as GuideMetadata[];

  return guides;
}

/**
 * 根据slug获取攻略完整数据
 */
export function getGuideBySlug(slug: string): GuideData | null {
  try {
    const fullPath = getGuideMarkdownPath(slug);
    if (!fullPath) {
      console.error(`No markdown file found for guide: ${slug}`);
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const metadata = parseGuideMetadata(fileContents, slug);

    // 移除最后一行的来源信息（因为会单独显示）
    let content = fileContents;
    const lines = content.split('\n');
    if (lines[lines.length - 1].trim().startsWith('来源:')) {
      lines.pop();
      content = lines.join('\n');
    }

    return {
      slug,
      ...metadata,
      content
    };
  } catch (error) {
    console.error(`Error reading guide: ${slug}`, error);
    return null;
  }
}

/**
 * 按分类获取攻略
 */
export function getGuidesByCategory(category: string): GuideMetadata[] {
  const allGuides = getAllGuides();
  return allGuides.filter(guide => guide.category === category);
}

/**
 * 获取所有分类
 */
export function getAllCategories(): string[] {
  const allGuides = getAllGuides();
  const categories = allGuides.map(guide => guide.category);
  return Array.from(new Set(categories));
}
