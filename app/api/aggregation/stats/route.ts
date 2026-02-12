import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';

/**
 * 获取聚合统计数据
 * GET /api/aggregation/stats
 * 返回各平台各作者的文章统计
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    await dbConnect();
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;
    const collection = db.collection('articles');

    // 获取一周前的时间
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 统计每个平台每个作者的文章数
    const stats = await collection.aggregate([
      {
        $group: {
          _id: {
            platform: '$platform',
            author: '$author'
          },
          totalCount: { $sum: 1 },
          weeklyCount: {
            $sum: {
              $cond: [
                { $gte: ['$publishedAt', oneWeekAgo] },
                1,
                0
              ]
            }
          },
          latestPublished: { $max: '$publishedAt' }
        }
      },
      {
        $sort: {
          '_id.platform': 1,
          totalCount: -1
        }
      }
    ]).toArray();

    // 转换数据格式
    const formattedStats = stats.map(stat => ({
      platform: stat._id.platform,
      author: stat._id.author,
      totalCount: stat.totalCount,
      weeklyCount: stat.weeklyCount,
      latestPublished: stat.latestPublished
    }));

    return NextResponse.json({
      status: 'success',
      data: formattedStats
    });
  } catch (error: any) {
    console.error('获取聚合统计失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '获取聚合统计失败',
      },
      { status: 500 }
    );
  }
}
