import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Source from '@/models/Source';
import Article from '@/models/Article';

/**
 * POST /api/admin/clean-orphan-articles
 * 清理孤立文章（已删除博主的文章数据）
 * 需要管理员权限
 * @see CLAUDE.md 问题分析优先规则
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 权限验证
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    // 2. 连接数据库
    await dbConnect();

    // 3. 获取所有活跃的数据源
    const sources = await Source.find({});
    console.log(`📋 当前有 ${sources.length} 个数据源`);

    // 创建有效博主的映射 { platform_author: true }
    const validAuthors = new Set<string>();
    sources.forEach(source => {
      const key = `${source.platform}_${source.name}`;
      validAuthors.add(key);
    });

    // 4. 获取所有文章的平台和作者组合
    const articles = await Article.find({}, { platform: 1, author: 1 });
    console.log(`📰 数据库中共有 ${articles.length} 篇文章`);

    // 5. 找出孤立文章（作者不在 sources 中的）
    const orphanArticles: string[] = [];
    const orphanStats = new Map<string, number>();

    for (const article of articles) {
      const key = `${article.platform}_${article.author}`;
      if (!validAuthors.has(key)) {
        orphanArticles.push(article._id.toString());

        // 统计每个孤立博主的文章数
        const statsKey = `${article.platform}: ${article.author}`;
        orphanStats.set(statsKey, (orphanStats.get(statsKey) || 0) + 1);
      }
    }

    // 6. 如果没有孤立文章
    if (orphanStats.size === 0) {
      return NextResponse.json({
        status: 'success',
        message: '数据库状态良好，未发现孤立文章',
        data: {
          totalArticles: articles.length,
          orphanArticles: 0,
          deletedCount: 0,
          orphanAuthors: []
        }
      });
    }

    // 7. 执行删除
    const result = await Article.deleteMany({
      _id: { $in: orphanArticles }
    });

    // 8. 准备孤立博主列表
    const orphanAuthorsList = Array.from(orphanStats.entries()).map(([key, count]) => ({
      author: key,
      articleCount: count
    }));

    console.log(`✅ 清理完成！删除了 ${result.deletedCount} 篇孤立文章`);

    return NextResponse.json({
      status: 'success',
      message: `成功清理 ${result.deletedCount} 篇孤立文章`,
      data: {
        totalArticles: articles.length,
        orphanArticles: orphanArticles.length,
        deletedCount: result.deletedCount,
        orphanAuthors: orphanAuthorsList,
        remainingArticles: articles.length - result.deletedCount
      }
    });

  } catch (error: any) {
    console.error('清理孤立文章失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '清理孤立文章失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/clean-orphan-articles
 * 预览孤立文章（不执行删除，仅查询）
 * 需要管理员权限
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 权限验证
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    // 2. 连接数据库
    await dbConnect();

    // 3. 获取所有活跃的数据源
    const sources = await Source.find({});

    // 创建有效博主的映射
    const validAuthors = new Set<string>();
    sources.forEach(source => {
      const key = `${source.platform}_${source.name}`;
      validAuthors.add(key);
    });

    // 4. 获取所有文章
    const articles = await Article.find({}, { platform: 1, author: 1 });

    // 5. 找出孤立文章
    const orphanStats = new Map<string, number>();

    for (const article of articles) {
      const key = `${article.platform}_${article.author}`;
      if (!validAuthors.has(key)) {
        const statsKey = `${article.platform}: ${article.author}`;
        orphanStats.set(statsKey, (orphanStats.get(statsKey) || 0) + 1);
      }
    }

    // 6. 准备响应数据
    const orphanAuthorsList = Array.from(orphanStats.entries()).map(([key, count]) => ({
      author: key,
      articleCount: count
    }));

    const totalOrphanArticles = Array.from(orphanStats.values()).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      status: 'success',
      message: orphanAuthorsList.length > 0
        ? `发现 ${orphanAuthorsList.length} 个已删除博主的 ${totalOrphanArticles} 篇文章`
        : '数据库状态良好，未发现孤立文章',
      data: {
        totalArticles: articles.length,
        totalSources: sources.length,
        orphanArticles: totalOrphanArticles,
        orphanAuthors: orphanAuthorsList
      }
    });

  } catch (error: any) {
    console.error('查询孤立文章失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '查询孤立文章失败',
      },
      { status: 500 }
    );
  }
}
