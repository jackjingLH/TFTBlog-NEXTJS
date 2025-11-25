import { XMLParser } from 'fast-xml-parser';

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid?: string;
}

interface ParsedFeed {
  title: string;
  description: string;
  items: RSSItem[];
}

export async function parseXML(xmlString: string): Promise<ParsedFeed> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const result = parser.parse(xmlString);

  // 处理 RSS 2.0 格式
  if (result.rss && result.rss.channel) {
    const channel = result.rss.channel;
    let items = channel.item || [];

    // 确保 items 是数组
    if (!Array.isArray(items)) {
      items = [items];
    }

    return {
      title: channel.title || '',
      description: channel.description || '',
      items: items.map((item: any) => ({
        title: item.title || '',
        description: cleanDescription(item.description || ''),
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        guid: item.guid || item.link,
      })),
    };
  }

  // 处理 Atom 格式
  if (result.feed && result.feed.entry) {
    const feed = result.feed;
    let entries = feed.entry || [];

    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    return {
      title: feed.title || '',
      description: feed.subtitle || '',
      items: entries.map((entry: any) => ({
        title: entry.title || '',
        description: cleanDescription(entry.summary || entry.content || ''),
        link: entry.link?.['@_href'] || entry.link || '',
        pubDate: entry.published || entry.updated || new Date().toISOString(),
        guid: entry.id || entry.link?.['@_href'],
      })),
    };
  }

  throw new Error('无法解析 RSS/Atom feed');
}

// 清理描述内容
function cleanDescription(desc: string): string {
  if (!desc) return '';

  // 去除 HTML 标签
  let cleaned = desc.replace(/<[^>]*>/g, '');

  // 解码 HTML 实体
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 移除多余的空白字符
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 限制长度为 200 字符
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200) + '...';
  }

  return cleaned;
}

// 生成唯一 ID (基于 URL)
export function generateArticleId(link: string): string {
  // 使用简单的哈希算法生成 ID
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    const char = link.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
