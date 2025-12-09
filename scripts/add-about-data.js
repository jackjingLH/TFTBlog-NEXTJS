const { MongoClient } = require('mongodb');

const uri = 'mongodb://47.99.202.3:27017/tftblog';

async function addAboutData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ 成功连接到 MongoDB');

    const db = client.db('tftblog');
    const aboutCollection = db.collection('about');

    // 准备关于页面的模拟数据
    const aboutData = {
      title: '关于金铲铲博客',
      description: '专注于云顶之弈（金铲铲之战）的攻略聚合平台',
      content: `
## 关于我们

金铲铲博客是一个专注于云顶之弈（金铲铲之战）的攻略聚合平台。我们致力于为广大云顶之弈玩家提供最新、最全面的游戏攻略和资讯。

### 我们的使命

- 📚 **内容聚合**：整合来自全球各地的优质云顶之弈内容
- 🔄 **实时更新**：每日自动抓取最新的攻略和资讯
- 🎯 **精准分类**：按照阵容、英雄、装备等维度精心分类
- 🌏 **多语言支持**：支持中文、日文等多种语言内容

### 内容来源

我们的内容来自以下优质源：

1. **TFT Times** - 日本知名云顶之弈资讯站
2. **RSSHub** - 开源 RSS 聚合服务
3. 更多优质内容源持续添加中...

### 技术栈

- **前端框架**: Next.js 14 (App Router)
- **数据库**: MongoDB
- **部署**: PM2 + Nginx
- **内容解析**: RSS Feed 聚合

### 联系我们

如有任何问题或建议，欢迎通过以下方式联系我们：

- Email: contact@tftblog.com
- GitHub: [TFTBlog-NEXTJS](https://github.com/jackjingLH/TFTBlog-NEXTJS)

---

*最后更新时间：${new Date().toLocaleDateString('zh-CN')}*
      `.trim(),
      features: [
        {
          icon: '📚',
          title: '内容聚合',
          description: '整合来自全球各地的优质云顶之弈内容'
        },
        {
          icon: '🔄',
          title: '实时更新',
          description: '每日自动抓取最新的攻略和资讯'
        },
        {
          icon: '🎯',
          title: '精准分类',
          description: '按照阵容、英雄、装备等维度精心分类'
        },
        {
          icon: '🌏',
          title: '多语言支持',
          description: '支持中文、日文等多种语言内容'
        }
      ],
      stats: {
        totalPosts: 0,
        totalCategories: 5,
        dailyUpdates: 15,
        supportedLanguages: 2
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 先删除旧数据（如果存在）
    await aboutCollection.deleteMany({});
    console.log('🗑️  已清除旧数据');

    // 插入新数据
    const result = await aboutCollection.insertOne(aboutData);
    console.log('✅ 成功插入关于页面数据');
    console.log('📝 插入的文档 ID:', result.insertedId);

    // 验证数据
    const inserted = await aboutCollection.findOne({});
    console.log('\n📊 插入的数据预览:');
    console.log('标题:', inserted.title);
    console.log('描述:', inserted.description);
    console.log('特性数量:', inserted.features.length);
    console.log('统计信息:', inserted.stats);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await client.close();
    console.log('\n✅ 数据库连接已关闭');
  }
}

addAboutData();
