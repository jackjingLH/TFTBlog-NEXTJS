import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/models/Article';

/**
 * GET /api/authors
 * 获取各平台的作者列表及文章数量统计
 * @see CLAUDE.md 文档同步规则
 *
 * Query参数:
 * - platform: 平台筛选 (可选，如：B站、TFTimes)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    // 连接数据库
    await dbConnect();

    // 构建查询条件
    const matchQuery: any = {};
    if (platform) {
      matchQuery.platform = platform;
    }

    // 使用聚合查询统计各作者的文章数量
    const authors = await Article.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            platform: '$platform',
            author: '$author'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 按平台分组
    const authorsByPlatform: Record<string, Array<{ name: string; count: number }>> = {};

    authors.forEach((item) => {
      const platformName = item._id.platform;
      const authorName = item._id.author;
      const count = item.count;

      if (!authorsByPlatform[platformName]) {
        authorsByPlatform[platformName] = [];
      }

      authorsByPlatform[platformName].push({
        name: authorName,
        count: count
      });
    });

    return NextResponse.json({
      status: 'success',
      data: authorsByPlatform,
      total: authors.length
    });
  } catch (error: any) {
    console.error('[API] 获取作者列表失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '服务器错误: ' + error.message,
        data: {},
        total: 0
      },
      { status: 500 }
    );
  }
}
