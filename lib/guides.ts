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
  author: string;
  date: string;
  category: string;
  tags: string[];
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
 * 获取所有攻略的元数据
 */
export function getAllGuides(): GuideMetadata[] {
  const slugs = getAllGuideSlugs();

  const guides = slugs.map(slug => {
    const fullPath = path.join(guidesDirectory, slug, 'index.md');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    return {
      slug,
      title: data.title || 'Untitled',
      description: data.description || '',
      author: data.author || 'Unknown',
      date: data.date || new Date().toISOString(),
      category: data.category || 'Other',
      tags: data.tags || []
    } as GuideMetadata;
  });

  // 按日期排序（最新的在前）
  return guides.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

/**
 * 根据slug获取攻略完整数据
 */
export function getGuideBySlug(slug: string): GuideData | null {
  try {
    const fullPath = path.join(guidesDirectory, slug, 'index.md');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || 'Untitled',
      description: data.description || '',
      author: data.author || 'Unknown',
      date: data.date || new Date().toISOString(),
      category: data.category || 'Other',
      tags: data.tags || [],
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
