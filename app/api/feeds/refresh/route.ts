import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/models/Article';
import { RSSHubService } from '@/lib/services/rsshub.service';
import { TFTimesService } from '@/lib/services/tftimes.service';

/**
 * POST /api/feeds/refresh
 * 手动触发抓取文章并保存到数据库
 * @see CLAUDE.md 文档同步规则
 *
 * 可选：提供 x-api-key 请求头进行验证
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

    console.log('[API/Refresh] 开始手动刷新文章数据...');

    // 连接数据库
    await dbConnect();

    const allArticles = [];
    const stats = {
      rsshub: 0,
      tftimes: 0,
      total: 0,
      new: 0,
      updated: 0,
      failed: 0,
    };

    // 1. 并行获取所有数据源
    const [rsshubResult, tftimesResult] = await Promise.allSettled([
      RSSHubService.fetchAll(),
      TFTimesService.fetchAll(),
    ]);

    // 2. 处理 RSSHub 结果
    if (rsshubResult.status === 'fulfilled') {
      allArticles.push(...rsshubResult.value);
      stats.rsshub = rsshubResult.value.length;
      console.log(`[API/Refresh] RSSHub 获取成功：${stats.rsshub} 篇`);
    } else {
      console.error('[API/Refresh] RSSHub 获取失败:', rsshubResult.reason);
      stats.failed++;
    }

    // 3. 处理 TFTimes 结果
    if (tftimesResult.status === 'fulfilled') {
      allArticles.push(...tftimesResult.value);
      stats.tftimes = tftimesResult.value.length;
      console.log(`[API/Refresh] TFTimes 获取成功：${stats.tftimes} 篇`);
    } else {
      console.error('[API/Refresh] TFTimes 获取失败:', tftimesResult.reason);
      stats.failed++;
    }

    stats.total = allArticles.length;

    // 4. 去重并保存到数据库
    console.log(`[API/Refresh] 开始保存 ${stats.total} 篇文章到数据库...`);

    for (const article of allArticles) {
      try {
        const existingArticle = await Article.findOne({ id: article.id });
        const isNew = !existingArticle;

        await Article.findOneAndUpdate(
          { id: article.id },
          {
            id: article.id,
            title: article.title,
            description: article.description || '',
            link: article.link,
            platform: article.platform,
            author: article.author,
            category: article.category || '',
            publishedAt: article.publishedAt,
            fetchedAt: article.fetchedAt,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        if (isNew) {
          stats.new++;
        } else {
          stats.updated++;
        }
      } catch (error: any) {
        console.error(`[API/Refresh] 保存文章失败 [${article.id}]:`, error.message);
      }
    }

    console.log('[API/Refresh] 刷新完成！统计信息:', stats);

    return NextResponse.json({
      status: 'success',
      message: '文章刷新成功',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API/Refresh] 刷新失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '刷新失败: ' + error.message,
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
  try {
    await dbConnect();

    const totalArticles = await Article.countDocuments();
    const latestArticle = await Article.findOne().sort({ fetchedAt: -1 });

    // 统计各平台数量
    const platformStats = await Article.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return NextResponse.json({
      status: 'success',
      totalArticles,
      lastFetchedAt: latestArticle?.fetchedAt || null,
      platforms: platformStats.map((s) => ({
        name: s._id,
        count: s.count,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
