import { FeedArticle } from '@/types/feed';

interface TFTimesAPIItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  language: string;
  status: string;
  publishedAt: string;
  coverImageUrl?: string;
  totalViews?: number;
}

interface TFTimesAPIResponse {
  items: TFTimesAPIItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export class TFTimesService {
  private static readonly SITE_URL = 'https://www.tftimes.jp';
  private static readonly API_URL = 'https://api.tftimes.info';

  /**
   * 获取 TFTimes 最新文章（通过官方 API）
   */
  static async fetchAll(): Promise<FeedArticle[]> {
    console.log('[TFTimes] 开始获取文章（API 模式）...');

    const response = await fetch(`${this.API_URL}/articles`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; TFTBlog/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`TFTimes API 请求失败: HTTP ${response.status}`);
    }

    const data: TFTimesAPIResponse = await response.json();

    const articles: FeedArticle[] = data.items
      .filter(item => item.status === 'published')
      .map(item => ({
        id: item.id,
        title: item.title,
        description: '',
        link: `${this.SITE_URL}/articles/${item.slug}`,
        thumbnail: item.coverImageUrl,
        platform: 'TFTimes',
        author: 'TFTimes',
        category: item.category,
        publishedAt: new Date(item.publishedAt),
        fetchedAt: new Date(),
      }));

    // 按发布时间降序，取最新 5 篇
    articles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    const finalArticles = articles.slice(0, 5);

    console.log(`[TFTimes] 获取完成，共 ${finalArticles.length} 篇文章`);
    return finalArticles;
  }
}