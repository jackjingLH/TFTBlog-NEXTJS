import { FeedArticle } from '@/types/feed';
import { generateArticleId } from '@/lib/utils/xml-parser';

interface TFTArticle {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

export class TFTimesService {
  private static readonly BASE_URL = 'https://www.tftimes.jp';
  private static readonly STRATEGY_CATEGORIES = [
    '/category/%e3%83%a1%e3%82%bf%ef%bc%86%e6%94%bb%e7%95%a5/',  // メタ＆攻略 (Meta & Strategy)
    '/category/%e3%83%91%e3%83%83%e3%83%81%e3%83%8e%e3%83%bc%e3%83%88%ef%bc%88%e3%83%a9%e3%82%a4%e3%83%96%e3%83%bbpbe%ef%bc%89/',  // パッチノート（ライブ・PBE） (Patch Notes)
    '/category/%e3%83%8b%e3%83%a5%e3%83%bc%e3%82%b9/',  // ニュース (News)
  ];

  /**
   * 获取 TFT 官网最新文章
   */
  static async fetchAll(): Promise<FeedArticle[]> {
    console.log('[TFTimes] 开始获取 TFT 官网文章...');

    const allArticles: FeedArticle[] = [];

    for (const category of this.STRATEGY_CATEGORIES) {
      try {
        const articles = await this.fetchCategory(category);
        // 每个分类只取最新 5 篇
        allArticles.push(...articles.slice(0, 5));
      } catch (error: any) {
        console.error(`[TFTimes] 获取分类 ${category} 失败:`, error.message);
      }
    }

    // 暂时不过滤，显示所有文章
    const recentArticles = allArticles;

    console.log(`[TFTimes] 获取到 ${allArticles.length} 篇文章`);

    // 显示文章日期用于调试
    if (allArticles.length > 0) {
      allArticles.slice(0, 3).forEach(article => {
        console.log(`[TFTimes] 文章: ${article.title}, 日期: ${article.publishedAt}`);
      });
    }

    // 按发布时间降序排序
    recentArticles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // 只取最新的 20 篇
    const finalArticles = recentArticles.slice(0, 20);

    console.log(`[TFTimes] 获取完成，共 ${finalArticles.length} 篇文章`);
    return finalArticles;
  }

  /**
   * 获取特定分类的文章
   */
  private static async fetchCategory(category: string): Promise<FeedArticle[]> {
    console.log(`[TFTimes] 正在获取分类: ${category}`);

    const url = `${this.BASE_URL}${category}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const articles = this.parseArticlesFromHTML(html, category);

    console.log(`[TFTimes] ${category} 解析到 ${articles.length} 篇文章`);
    return articles;
  }

  /**
   * 从 HTML 中解析文章
   */
  private static parseArticlesFromHTML(html: string, category: string): FeedArticle[] {
    const articles: FeedArticle[] = [];

    // 查找文章列表 - 使用 entry-card 类
    const articlePattern = /<article[^>]*class="[^"]*entry-card[^"]*"[^>]*>[\s\S]*?<\/article>/gs;
    const matches = html.match(articlePattern);

    console.log(`[TFTimes] 找到 ${matches?.length || 0} 个 article 元素`);
    if (!matches) return articles;

    for (let i = 0; i < matches.length; i++) {
      const articleHTML = matches[i];
      try {
        // 提取标题（没有 a 标签）
        const titleMatch = articleHTML.match(/<h2[^>]*class="[^"]*entry-card-title[^"]*"[^>]* itemprop="headline">(.*?)<\/h2>/s);
        if (!titleMatch) {
          console.log(`[TFTimes] 文章 ${i}: 未能匹配标题`);
          continue;
        }

        const title = this.cleanText(titleMatch[1]);

        // 提取文章 ID
        const idMatch = articleHTML.match(/id="post-(\d+)"/);
        const postId = idMatch ? idMatch[1] : '';

        // 构建正确链接
        const link = postId ? `${this.BASE_URL}/?p=${postId}` : '#';
        const id = postId || generateArticleId(link);

        // 提取日期
        let pubDate = new Date().toISOString();
        const dateMatch = articleHTML.match(/<span[^>]*class="[^"]*entry-date[^"]*"[^>]*>(.*?)<\/span>/s);
        if (dateMatch) {
          const dateStr = dateMatch[1].trim();
          // 解析 YYYY.MM.DD 格式
          const dateParts = dateStr.split('.');
          if (dateParts.length === 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const day = parseInt(dateParts[2]);
            pubDate = new Date(year, month, day).toISOString();
          }
        }

        articles.push({
          id,
          title,
          description: '', // 暂时不提取描述
          link,
          source: `TFT Times`,
          category: this.getCategoryName(category),
          publishedAt: new Date(pubDate),
          fetchedAt: new Date(),
        });
      } catch (error) {
        console.error('[TFTimes] 解析文章失败:', error);
      }
    }

    return articles;
  }

  /**
   * 获取分类中文名
   */
  private static getCategoryName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      '/category/%e3%83%a1%e3%82%bf%ef%bc%86%e6%94%bb%e7%95%a5/': '攻略',
      '/category/%e3%83%91%e3%83%83%e3%83%81%e3%83%8e%e3%83%bc%e3%83%88%ef%bc%88%e3%83%a9%e3%82%a4%e3%83%96%e3%83%bbpbe%ef%bc%89/': '版本',
      '/category/%e3%83%8b%e3%83%a5%e3%83%bc%e3%82%b9/': '新闻',
    };
    return categoryMap[category] || '综合';
  }

  /**
   * 清理文本内容
   */
  private static cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // 移除 HTML 标签
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}