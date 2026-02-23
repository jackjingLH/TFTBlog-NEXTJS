/**
 * 修复 articles 集合中的平台名称
 * 将 "B站" 统一改为 "Bilibili"
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://tftblog_user:YdPq-dtRWs-CWWG^CPZ=cRaX@47.99.202.3:27017/tftblog?authSource=tftblog';

const ArticleSchema = new mongoose.Schema({
  platform: String,
  author: String,
  title: String,
});

async function fixPlatformNames() {
  try {
    console.log('🔧 开始修复平台名称...\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema, 'articles');

    // 查询所有平台为 "B站" 的文章
    const bstationArticles = await Article.find({ platform: 'B站' });
    console.log(`📊 找到 ${bstationArticles.length} 篇平台为 "B站" 的文章\n`);

    if (bstationArticles.length > 0) {
      // 更新平台名称
      const result = await Article.updateMany(
        { platform: 'B站' },
        { $set: { platform: 'Bilibili' } }
      );

      console.log(`✅ 已将 ${result.modifiedCount} 篇文章的平台从 "B站" 改为 "Bilibili"\n`);
    } else {
      console.log('ℹ️  没有需要修复的文章\n');
    }

    // 验证结果
    const platforms = await Article.distinct('platform');
    console.log('📋 修复后的平台列表：');
    platforms.forEach(p => console.log(`  - ${p}`));

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

fixPlatformNames()
  .then(() => {
    console.log('\n🎉 修复完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 修复失败:', error);
    process.exit(1);
  });
