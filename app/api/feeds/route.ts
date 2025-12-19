import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/models/Article';
import { FeedResponse } from '@/types/feed';

/**
 * GET /api/feeds
 * 获取文章聚合列表（从数据库读取）
 * @see CLAUDE.md 文档同步规则
 *
 * Query参数:
 * - page: 页码 (默认 1)
 * - limit: 每页数量 (默认 20)
 * - platform: 平台筛选 (可选)
 * - author: 作者筛选 (可选)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const platform = searchParams.get('platform');
    const author = searchParams.get('author');

    // 连接数据库
    await dbConnect();

    // 构建查询条件
    const query: any = {};
    if (platform) query.platform = platform;
    if (author) query.author = author;

    // 查询文章（按发布时间降序）
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 统计总数
    const total = await Article.countDocuments(query);

    // 转换为前端需要的格式
    const data = articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.description,
      link: article.link,
      platform: article.platform,
      author: article.author,
      category: article.category,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
    }));

    // 返回响应
    const response: FeedResponse = {
      status: 'success',
      data,
      total,
      page,
      pageSize: limit,
      cached: false, // 数据库读取，始终是最新的
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] 处理请求失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '服务器错误: ' + error.message,
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
