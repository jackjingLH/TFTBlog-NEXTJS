import { FeedArticle, FeedCache } from '@/types/feed';

// 全局缓存声明
declare global {
  var feedCache: FeedCache | undefined;
}

export class CacheService {
  // 缓存过期时间（1小时 = 3600秒）
  private static TTL = 3600 * 1000;

  /**
   * 获取缓存的文章列表
   * @returns 缓存的文章数组，如果缓存不存在或已过期则返回 null
   */
  static get(): FeedArticle[] | null {
    if (!global.feedCache) {
      return null;
    }

    // 检查缓存是否过期
    const now = Date.now();
    const cacheTime = new Date(global.feedCache.lastUpdated).getTime();
    const isExpired = now - cacheTime > this.TTL;

    if (isExpired) {
      console.log('[Cache] 缓存已过期');
      return null;
    }

    console.log('[Cache] 从内存缓存读取，共', global.feedCache.articles.length, '篇文章');
    return global.feedCache.articles;
  }

  /**
   * 设置缓存
   * @param articles 文章数组
   */
  static set(articles: FeedArticle[]): void {
    global.feedCache = {
      articles,
      lastUpdated: new Date(),
    };
    console.log('[Cache] 缓存已更新，共', articles.length, '篇文章');
  }

  /**
   * 清除缓存
   */
  static clear(): void {
    global.feedCache = undefined;
    console.log('[Cache] 缓存已清除');
  }

  /**
   * 获取缓存最后更新时间
   */
  static getLastUpdated(): Date | null {
    return global.feedCache?.lastUpdated || null;
  }

  /**
   * 检查缓存是否存在且有效
   */
  static isValid(): boolean {
    return this.get() !== null;
  }

  /**
   * 获取缓存剩余有效时间（秒）
   */
  static getTTL(): number {
    if (!global.feedCache) return 0;

    const now = Date.now();
    const cacheTime = new Date(global.feedCache.lastUpdated).getTime();
    const elapsed = now - cacheTime;
    const remaining = Math.max(0, this.TTL - elapsed);

    return Math.floor(remaining / 1000);
  }
}
