import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from '@/lib/services/cache.service';
import { RSSHubService } from '@/lib/services/rsshub.service';
import { FeedResponse } from '@/types/feed';

/**
 * GET /api/feeds
 * 获取文章聚合列表
 *
 * Query参数:
 * - page: 页码 (默认 1)
 * - limit: 每页数量 (默认 20)
 * - source: 来源筛选 (NGA/TapTap/Bilibili/17173，可选)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const source = searchParams.get('source');

    // 1. 尝试从内存缓存读取
    let articles = CacheService.get();
    let cached = true;

    // 2. 缓存未命中，从 RSSHub 获取并缓存
    if (!articles) {
      console.log('[API] 缓存未命中，从 RSSHub 获取数据...');
      cached = false;

      try {
        articles = await RSSHubService.fetchAll();
        articles = RSSHubService.deduplicateArticles(articles);
        CacheService.set(articles);
      } catch (error) {
        console.error('[API] 获取文章失败:', error);
        return NextResponse.json(
          {
            status: 'error',
            message: '获取文章失败，请稍后重试',
            data: [],
            total: 0,
            page: 1,
            pageSize: limit,
            cached: false,
          } as FeedResponse,
          { status: 500 }
        );
      }
    }

    // 3. 按来源筛选
    let filteredArticles = articles;
    if (source) {
      filteredArticles = RSSHubService.filterBySource(articles, source);
    }

    // 4. 分页
    const total = filteredArticles.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

    // 5. 返回响应
    const response: FeedResponse = {
      status: 'success',
      data: paginatedArticles,
      total,
      page,
      pageSize: limit,
      cached,
      lastUpdated: CacheService.getLastUpdated() || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] 处理请求失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '服务器错误',
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        cached: false,
      } as FeedResponse,
      { status: 500 }
    );
  }
}
