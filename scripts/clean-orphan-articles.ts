/**
 * 清理孤立文章脚本
 * 删除数据库中已删除博主的文章数据
 * @see CLAUDE.md 问题分析优先规则
 */

// 加载环境变量
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import dbConnect from '@/lib/mongodb';
import Source from '@/models/Source';
import Article from '@/models/Article';

async function cleanOrphanArticles() {
  try {
    console.log('📊 开始清理孤立文章数据...\n');

    // 1. 连接数据库
    await dbConnect();
    console.log('✅ 数据库连接成功');

    // 2. 获取所有活跃的数据源
    const sources = await Source.find({});
    console.log(`\n📋 当前有 ${sources.length} 个数据源：`);

    // 创建有效博主的映射 { platform_author: true }
    const validAuthors = new Set<string>();
    sources.forEach(source => {
      const key = `${source.platform}_${source.name}`;
      validAuthors.add(key);
      console.log(`  - ${source.platform}: ${source.name}`);
    });

    // 3. 获取所有文章的平台和作者组合
    const articles = await Article.find({}, { platform: 1, author: 1 });
    console.log(`\n📰 数据库中共有 ${articles.length} 篇文章`);

    // 4. 找出孤立文章（作者不在 sources 中的）
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

    // 5. 显示孤立数据统计
    if (orphanStats.size > 0) {
      console.log('\n⚠️  发现孤立文章（已删除博主的文章）：');
      for (const [key, count] of orphanStats) {
        console.log(`  - ${key}: ${count} 篇`);
      }
      console.log(`\n🗑️  总计需要删除: ${orphanArticles.length} 篇文章`);
    } else {
      console.log('\n✅ 未发现孤立文章，数据库状态良好！');
      return;
    }

    // 6. 执行删除
    const result = await Article.deleteMany({
      _id: { $in: orphanArticles.map(id => id) }
    });

    console.log(`\n✅ 清理完成！删除了 ${result.deletedCount} 篇孤立文章`);

    // 7. 验证结果
    const remainingArticles = await Article.countDocuments({});
    console.log(`\n📊 清理后统计：`);
    console.log(`  - 剩余文章: ${remainingArticles} 篇`);
    console.log(`  - 已删除: ${result.deletedCount} 篇`);

  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    // 断开数据库连接
    const mongoose = await import('mongoose');
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行清理
cleanOrphanArticles()
  .then(() => {
    console.log('\n🎉 脚本执行成功！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });
