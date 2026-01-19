import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/models/Article';
import { FeedResponse } from '@/types/feed';

/**
 * 从 YouTube 链接提取视频 ID 并生成缩略图 URL
 * @param link YouTube 视频链接
 * @returns 缩略图 URL 或空字符串
 */
function getYouTubeThumbnail(link: string): string {
  try {
    // 匹配 YouTube 视频 ID (支持 youtube.com/watch?v= 和 youtu.be/ 格式)
    const match = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      // 使用高清缩略图
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
  } catch (error) {
    console.error('[API] 提取 YouTube 缩略图失败:', error);
  }
  return '';
}

/**
 * 从 B站 链接提取视频 BV 号并生成缩略图 URL
 * @param link B站视频链接
 * @returns 缩略图占位符或空字符串
 */
function getBilibiliThumbnail(link: string): string {
  // B站需要通过 API 获取封面，这里暂时返回空
  // 未来可以调用 B站 API: https://api.bilibili.com/x/web-interface/view?bvid={BV_ID}
  return '';
}

/**
 * 清理 HTML 标签和特殊字符
 * @param text 原始文本
 * @returns 清理后的纯文本
 */
function sanitizeText(text: string): string {
  if (!text) return '';

  // 解码 HTML 实体（先解码，避免被当作文本处理）
  let cleaned = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");

  // 移除所有 HTML 标签（包括不完整的标签）
  // 这个正则会匹配 < 开头，后面跟任意字符，直到 > 或字符串结束
  cleaned = cleaned.replace(/<[^>]*>?/g, '');

  // 移除残留的 HTML 片段（处理被截断的情况）
  // 如果文本以 < 开头但没有对应的 >，或者包含 iframe、div 等标签关键字
  if (cleaned.includes('<iframe') || cleaned.includes('<div') || cleaned.includes('<script') || cleaned.includes('frameborder')) {
    // 如果包含明显的HTML内容，返回默认描述
    return '暂无描述';
  }

  // 移除多余空格和换行
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 如果清理后为空，返回默认值
  if (!cleaned || cleaned.length < 3) {
    return '暂无描述';
  }

  // 限制长度为 200 字符
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200) + '...';
  }

  return cleaned;
}

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

    // 转换为前端需要的格式，清理 HTML 标签，自动生成缩略图
    const data = articles.map((article: any) => {
      // 如果没有缩略图，根据平台自动生成
      let thumbnail = article.thumbnail || '';
      if (!thumbnail) {
        if (article.platform === 'YouTube') {
          thumbnail = getYouTubeThumbnail(article.link);
        } else if (article.platform === 'B站') {
          thumbnail = getBilibiliThumbnail(article.link);
        }
      }

      return {
        id: article.id,
        title: sanitizeText(article.title),
        description: sanitizeText(article.description),
        link: article.link,
        thumbnail, // 使用自动生成或数据库中的缩略图
        platform: article.platform,
        author: article.author,
        category: article.category,
        publishedAt: article.publishedAt,
        fetchedAt: article.fetchedAt,
      };
    });

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
