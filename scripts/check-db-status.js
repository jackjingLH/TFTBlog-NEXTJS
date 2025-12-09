const { MongoClient } = require('mongodb');

const uri = 'mongodb://47.99.202.3:27017/tftblog';

async function checkDatabaseStatus() {
  const client = new MongoClient(uri);

  try {
    console.log('正在连接到 MongoDB...');
    await client.connect();
    console.log('✅ 成功连接到 MongoDB\n');

    const db = client.db('tftblog');

    // 1. 列出所有集合
    console.log('📊 数据库集合列表:');
    console.log('='.repeat(50));
    const collections = await db.listCollections().toArray();
    collections.forEach((coll, index) => {
      console.log(`${index + 1}. ${coll.name}`);
    });
    console.log('');

    // 2. 检查每个集合的文档数量
    console.log('📈 各集合文档统计:');
    console.log('='.repeat(50));
    for (const collInfo of collections) {
      const coll = db.collection(collInfo.name);
      const count = await coll.countDocuments();
      console.log(`${collInfo.name}: ${count} 个文档`);
    }
    console.log('');

    // 3. 检查 about 集合
    console.log('🔍 检查 about 集合:');
    console.log('='.repeat(50));
    const aboutCollection = db.collection('about');
    const aboutCount = await aboutCollection.countDocuments();
    console.log(`文档数量: ${aboutCount}`);

    if (aboutCount > 0) {
      const aboutDoc = await aboutCollection.findOne({});
      console.log('\n📄 about 文档内容:');
      console.log('标题:', aboutDoc.title);
      console.log('描述:', aboutDoc.description);
      console.log('特性数量:', aboutDoc.features?.length || 0);
      console.log('创建时间:', aboutDoc.createdAt);
      console.log('更新时间:', aboutDoc.updatedAt);
      console.log('\n完整数据:');
      console.log(JSON.stringify(aboutDoc, null, 2));
    } else {
      console.log('⚠️  about 集合为空！');
    }
    console.log('');

    // 4. 检查 posts 集合
    console.log('🔍 检查 posts 集合:');
    console.log('='.repeat(50));
    const postsCollection = db.collection('posts');
    const postsCount = await postsCollection.countDocuments();
    console.log(`文档数量: ${postsCount}`);

    if (postsCount > 0) {
      const samplePost = await postsCollection.findOne({});
      console.log('\n示例文章:');
      console.log('标题:', samplePost.title);
      console.log('标签:', samplePost.tags);
      console.log('浏览量:', samplePost.views);
    }
    console.log('');

    // 5. 检查 categories 集合
    console.log('🔍 检查 categories 集合:');
    console.log('='.repeat(50));
    const categoriesCollection = db.collection('categories');
    const categoriesCount = await categoriesCollection.countDocuments();
    console.log(`文档数量: ${categoriesCount}`);

    if (categoriesCount > 0) {
      const categories = await categoriesCollection.find({}).toArray();
      console.log('\n所有分类:');
      categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (${cat.slug})`);
      });
    }
    console.log('');

    // 6. 数据库统计信息
    console.log('📊 数据库统计信息:');
    console.log('='.repeat(50));
    const stats = await db.stats();
    console.log(`数据库大小: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`存储大小: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log(`索引大小: ${(stats.indexSize / 1024).toFixed(2)} KB`);
    console.log(`集合数量: ${stats.collections}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('详细信息:', error);
  } finally {
    await client.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

checkDatabaseStatus();
