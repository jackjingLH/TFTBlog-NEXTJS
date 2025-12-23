import { FeedArticle, RSSSource } from '@/types/feed';
import { parseXML, generateArticleId } from '@/lib/utils/xml-parser';

// RSSHub 数据源配置
// @see CLAUDE.md 文档同步规则
// 注意：B站对并发请求有风控限制，建议保持 2-3 个 UP主以避免触发 -352 错误
// 请求顺序优化：将容易触发风控的UP主放在最后（前面的请求会建立信任）
// author 字段作为备用名称（如果获取不到真实名称则使用此值）
const RSS_SOURCES: RSSSource[] = [
  // B站 UP主 - 通过 RSSHub 获取，避免直接 API 风控
  // 测试：调整顺序，将大V林小北放第一，观察是否仍然只有最后一个成功
  {
    name: '林小北Lindo',
    platform: 'B站',
    author: 'UP-18343134',  // 备用名称（真实名称：林小北Lindo，186万粉丝，官方TOC解说）
    url: 'https://rsshub.app/bilibili/user/video/18343134',
    category: '实战攻略',
  },
  {
    name: 'GoDlike_神超',
    platform: 'B站',
    author: 'UP-388063772',  // 备用名称（真实名称：GoDlike_神超，84.46万粉丝）
    url: 'https://rsshub.app/bilibili/user/video/388063772',
    category: '实战攻略',
  },
  {
    name: '手刃猫咪',
    platform: 'B站',
    author: 'UP-262943792',  // 备用名称（15.69万粉丝）
    url: 'https://rsshub.app/bilibili/user/video/262943792',
    category: '实战攻略',
  },
];

// RSSHub 实例列表（本地优先）
// @see CLAUDE.md 文档同步规则
// @see scripts/setup-rsshub-cookie.md 配置指南
const RSSHUB_INSTANCES = [
  'http://localhost:1200',     // 本地 Docker 实例（需要配置 BILIBILI_COOKIE）
  // 公共实例不可靠：
  // 'https://rsshub.app',      // HTTP 522 错误
  // 'https://hub.slarker.me',  // Chrome 版本问题
  // 'https://jp-m.88code.org', // AI 中转站，非 RSSHub 实例
];

export class RSSHubService {
  /**
   * 从所有配置的数据源获取文章（串行+延迟，避免风控）
   * @see CLAUDE.md 文档同步规则
   * @returns 所有文章的合并数组
   */
  static async fetchAll(): Promise<FeedArticle[]> {
    console.log('[RSSHub] 开始获取所有数据源（串行+延迟模式）...');

    const allArticles: FeedArticle[] = [];

    // 串行处理每个数据源，避免并发请求触发风控
    for (let i = 0; i < RSS_SOURCES.length; i++) {
      const source = RSS_SOURCES[i];

      try {
        console.log(`[RSSHub] [${i + 1}/${RSS_SOURCES.length}] 正在获取: ${source.name}...`);
        const articles = await this.fetchSource(source);
        allArticles.push(...articles);
        console.log(`[RSSHub] ✓ ${source.name} 成功，获取 ${articles.length} 篇`);
      } catch (error: any) {
        console.error(`[RSSHub] ✗ ${source.name} 失败:`, error.message);
        // 继续处理下一个源
      }

      // 在每个请求之间添加延迟（避免风控）
      if (i < RSS_SOURCES.length - 1) {
        // 基础延迟8秒 + 随机0-2秒，避免规律性被检测
        const baseDelay = 8000;
        const randomDelay = Math.floor(Math.random() * 2000);
        const delay = baseDelay + randomDelay;
        console.log(`[RSSHub] 等待 ${(delay / 1000).toFixed(1)} 秒后继续...`);
        await this.sleep(delay);
      }
    }

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
   * 延迟函数（用于避免风控）
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            // 反爬伪装：模拟真实浏览器请求
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/xml, application/rss+xml, text/xml, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Referer': 'https://rsshub.app/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          next: { revalidate: 0 }, // 禁用 Next.js 缓存
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xml = await response.text();
        const feed = await parseXML(xml);

        console.log(`[RSSHub] ${source.name} 原始数据: ${feed.items.length} 条`);

        // 尝试从 RSS feed 中提取真实 UP主名称
        let authorName = source.author; // 默认使用备用名称（ID）
        try {
          // RSS feed 的 title 格式通常是 "UP主名字 的 bilibili 空间"
          const feedTitle = feed.title || '';
          const match = feedTitle.match(/^(.+?)\s*的\s*bilibili\s*空间$/i);
          if (match && match[1]) {
            authorName = match[1].trim();
            console.log(`[RSSHub] 成功提取 UP主名称: ${authorName} (原ID: ${source.author})`);
          } else {
            console.log(`[RSSHub] 无法提取 UP主名称，使用备用ID: ${source.author}`);
          }
        } catch (nameError) {
          console.warn(`[RSSHub] 提取 UP主名称失败，使用备用ID: ${source.author}`, nameError);
        }

        // 只取最新的 5 条
        const latestItems = feed.items.slice(0, 5);

        const articles: FeedArticle[] = latestItems.map((item) => ({
          id: generateArticleId(item.link),
          title: item.title,
          description: item.description,
          link: item.link,
          platform: source.platform,        // 平台（B站）
          author: authorName,               // UP主名称（真实名称或备用ID）
          category: source.category,        // 分类
          publishedAt: new Date(item.pubDate),
          fetchedAt: new Date(),
        }));

        console.log(`[RSSHub] ${source.name} 获取成功，共 ${articles.length} 篇，UP主: ${authorName}，最新发布时间: ${articles[0]?.publishedAt.toLocaleString('zh-CN')}`);
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
