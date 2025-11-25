import { NextRequest, NextResponse } from 'next/server';
import { CacheService } from '@/lib/services/cache.service';
import { RSSHubService } from '@/lib/services/rsshub.service';

/**
 * POST /api/feeds/refresh
 * 手动刷新文章数据（清除缓存并重新获取）
 *
 * 需要提供 x-api-key 请求头进行验证
 */
export async function POST(request: NextRequest) {
  try {
    // API Key 验证（可选）
    const apiKey = request.headers.get('x-api-key');
    const envApiKey = process.env.ADMIN_API_KEY;

    if (envApiKey && apiKey !== envApiKey) {
      return NextResponse.json(
        {
          status: 'error',
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    console.log('[API] 开始手动刷新文章数据...');

    // 1. 清除旧缓存
    CacheService.clear();

    // 2. 从 RSSHub 获取最新数据
    const articles = await RSSHubService.fetchAll();

    // 3. 去重
    const uniqueArticles = RSSHubService.deduplicateArticles(articles);

    // 4. 更新缓存
    CacheService.set(uniqueArticles);

    console.log('[API] 刷新完成，共', uniqueArticles.length, '篇文章');

    return NextResponse.json({
      status: 'success',
      message: '刷新成功',
      count: uniqueArticles.length,
      updatedAt: new Date(),
      sources: RSSHubService.getSources(),
    });
  } catch (error: any) {
    console.error('[API] 刷新失败:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: `刷新失败: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feeds/refresh
 * 获取刷新状态信息
 */
export async function GET() {
  const lastUpdated = CacheService.getLastUpdated();
  const ttl = CacheService.getTTL();
  const isValid = CacheService.isValid();

  return NextResponse.json({
    status: 'success',
    cached: isValid,
    lastUpdated: lastUpdated,
    ttlSeconds: ttl,
    sources: RSSHubService.getSources(),
  });
}
