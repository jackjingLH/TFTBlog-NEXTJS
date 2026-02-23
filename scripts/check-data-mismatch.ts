/**
 * 检查数据不匹配问题
 * 对比 sources 和 articles 中的数据
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://tftblog_user:YdPq-dtRWs-CWWG^CPZ=cRaX@47.99.202.3:27017/tftblog?authSource=tftblog';

const SourceSchema = new mongoose.Schema({
  platform: String,
  name: String,
  enabled: Boolean,
});

const ArticleSchema = new mongoose.Schema({
  platform: String,
  author: String,
  title: String,
});

async function checkDataMismatch() {
  try {
    console.log('🔍 检查数据匹配情况...\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const Source = mongoose.models.Source || mongoose.model('Source', SourceSchema, 'sources');
    const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema, 'articles');

    // 获取所有 sources
    const sources = await Source.find({});
    console.log('📋 Sources 集合数据：');
    console.log(`总数：${sources.length}\n`);
    sources.forEach((s: any) => {
      console.log(`  platform: "${s.platform}"`);
      console.log(`  name: "${s.name}"`);
      console.log(`  key: "${s.platform}_${s.name}"\n`);
    });

    // 获取所有 articles 的唯一 platform+author 组合
    const articles = await Article.find({});
    console.log('\n📰 Articles 集合数据：');
    console.log(`总数：${articles.length}\n`);

    const articleAuthors = new Map<string, number>();
    articles.forEach((a: any) => {
      const key = `${a.platform}_${a.author}`;
      articleAuthors.set(key, (articleAuthors.get(key) || 0) + 1);
    });

    console.log('文章中的唯一 platform + author 组合：\n');
    for (const [key, count] of articleAuthors) {
      const [platform, author] = key.split('_');
      console.log(`  platform: "${platform}"`);
      console.log(`  author: "${author}"`);
      console.log(`  key: "${key}"`);
      console.log(`  文章数: ${count}\n`);
    }

    // 对比分析
    console.log('\n🔎 匹配分析：');
    const validAuthors = new Set<string>();
    sources.forEach((s: any) => {
      const key = `${s.platform}_${s.name}`;
      validAuthors.add(key);
    });

    console.log('\n✅ 匹配的博主（有对应 source）：');
    for (const [key, count] of articleAuthors) {
      if (validAuthors.has(key)) {
        console.log(`  ${key} - ${count} 篇文章`);
      }
    }

    console.log('\n❌ 不匹配的博主（没有对应 source）：');
    for (const [key, count] of articleAuthors) {
      if (!validAuthors.has(key)) {
        console.log(`  ${key} - ${count} 篇文章`);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkDataMismatch()
  .then(() => {
    console.log('\n🎉 检查完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 检查失败:', error);
    process.exit(1);
  });
