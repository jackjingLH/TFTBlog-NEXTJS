import { FeedArticle, RSSSource } from '@/types/feed';
import { parseXML, generateArticleId } from '@/lib/utils/xml-parser';

// RSSHub 数据源配置 - B站UP主视频
const RSS_SOURCES: RSSSource[] = [
  {
    name: '荡狗天天开心',
    url: 'https://rsshub.app/bilibili/user/video/514939907',
    source: 'Bilibili',
  },
  {
    name: '手刃猫咪',
    url: 'https://rsshub.app/bilibili/user/video/262943792',
    source: 'Bilibili',
  },
  {
    name: '襄平霸王东',
    url: 'https://rsshub.app/bilibili/user/video/37452208',
    source: 'Bilibili',
  },
];

// RSSHub 实例列表
const RSSHUB_INSTANCES = [
  'https://rsshub.app',
  'https://rss.rssforever.com',
  'https://rsshub.ktachibana.party',
];

export class RSSHubService {
  /**
   * 从所有配置的数据源获取文章
   * @returns 所有文章的合并数组
   */
  static async fetchAll(): Promise<FeedArticle[]> {
    console.log('[RSSHub] 开始获取所有数据源...');

    const promises = RSS_SOURCES.map((source) =>
      this.fetchSource(source).catch((error) => {
        console.error(`[RSSHub] 获取 ${source.name} 失败:`, error.message);
        return []; // 失败时返回空数组
      })
    );

    const results = await Promise.all(promises);
    let allArticles = results.flat();

    // 过滤：只保留一个月内的文章
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    console.log('[RSSHub] 一个月前的时间:', oneMonthAgo.toLocaleString('zh-CN'));
    console.log('[RSSHub] 过滤前总数:', allArticles.length);

    const recentArticles = allArticles.filter(article => {
      const publishDate = new Date(article.publishedAt);
      const isRecent = publishDate >= oneMonthAgo;
      if (!isRecent) {
        console.log(`[RSSHub] 过滤掉过期文章: ${article.title} (${publishDate.toLocaleString('zh-CN')})`);
      }
      return isRecent;
    });

    // 按发布时间降序排序
    recentArticles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    console.log('[RSSHub] 获取完成，共', recentArticles.length, '篇文章（已过滤一个月内）');
    return recentArticles;
  }

  /**
   * 从单个数据源获取文章
   * @param source RSS源配置
   * @returns 文章数组
   */
  private static async fetchSource(source: RSSSource): Promise<FeedArticle[]> {
    console.log(`[RSSHub] 正在获取: ${source.name}`);

    // 尝试不同的 RSSHub 实例
    for (const instance of RSSHUB_INSTANCES) {
      try {
        const url = source.url.replace('https://rsshub.app', instance);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TFTBlog/1.0 (Next.js RSS Reader)',
          },
          next: { revalidate: 0 }, // 禁用 Next.js 缓存
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xml = await response.text();
        const feed = await parseXML(xml);

        console.log(`[RSSHub] ${source.name} 原始数据: ${feed.items.length} 条`);

        // 只取最新的 5 条
        const latestItems = feed.items.slice(0, 5);

        const articles: FeedArticle[] = latestItems.map((item) => ({
          id: generateArticleId(item.link),
          title: item.title,
          description: item.description,
          link: item.link,
          source: `${source.name}`,  // 使用博主名称作为来源
          publishedAt: new Date(item.pubDate),
          fetchedAt: new Date(),
        }));

        console.log(`[RSSHub] ${source.name} 获取成功，共 ${articles.length} 篇，最新发布时间: ${articles[0]?.publishedAt.toLocaleString('zh-CN')}`);
        return articles;
      } catch (error) {
        console.error(`[RSSHub] ${instance} 失败:`, error);
        // 继续尝试下一个实例
      }
    }

    throw new Error(`所有 RSSHub 实例都无法访问 ${source.name}`);
  }

  /**
   * 按来源筛选文章
   * @param articles 文章数组
   * @param source 来源标识
   * @returns 筛选后的文章数组
   */
  static filterBySource(articles: FeedArticle[], source: string): FeedArticle[] {
    return articles.filter((article) => article.source === source);
  }

  /**
   * 获取所有支持的数据源列表
   * @returns 数据源名称数组
   */
  static getSources(): string[] {
    return RSS_SOURCES.map((s) => s.source);
  }

  /**
   * 去重文章（基于 ID）
   * @param articles 文章数组
   * @returns 去重后的文章数组
   */
  static deduplicateArticles(articles: FeedArticle[]): FeedArticle[] {
    const seen = new Set<string>();
    const unique: FeedArticle[] = [];

    for (const article of articles) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        unique.push(article);
      }
    }

    return unique;
  }

}
