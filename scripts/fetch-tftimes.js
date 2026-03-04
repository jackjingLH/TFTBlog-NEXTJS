/**
 * TFT Times 数据抓取脚本
 *
 * 功能：
 * - 通过 api.tftimes.info JSON API 获取最新文章
 * - 直接保存到 MongoDB 数据库
 * - 自动去重（基于文章 ID）
 *
 * 背景：TFTimes 网站于 2026年初 从 WordPress 重构为 React SPA，
 * 旧的 HTML 爬取方式（entry-card）已失效，改用官方 API。
 *
 * 使用方法：
 *   node scripts/fetch-tftimes.js
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  // MongoDB 配置
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://47.99.202.3:27017/tftblog',

  // TFT Times API 配置
  SITE_URL: 'https://www.tftimes.jp',
  API_URL: 'https://api.tftimes.info',
  ARTICLE_LIMIT: 5,

  // 请求超时
  REQUEST_TIMEOUT: 30000,
};

// ============================================================
// HTTP 请求辅助函数（JSON API）
// ============================================================
async function fetchJSON(url) {
  const https = require('https');

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; TFTBlog/1.0)',
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('JSON 解析失败: ' + e.message));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    req.end();
  });
}

// ============================================================
// 文章解析函数（从 API 响应）
// ============================================================
function parseArticles(apiResponse) {
  const items = (apiResponse.items || []).filter(item => item.status === 'published');

  return items.slice(0, CONFIG.ARTICLE_LIMIT).map(item => {
    // 根据分类推断 author（与 sources 集合保持一致）
    const category = item.category || '';
    let author = 'TFT Times - ニュース';
    if (category.includes('メタ') || category.includes('攻略')) {
      author = 'TFT Times - メタ＆攻略';
    } else if (category.includes('パッチ')) {
      author = 'TFT Times - パッチノート';
    }

    return {
      id: `tftimes-${item.id}`,
      title: item.title,
      description: '',
      link: `${CONFIG.SITE_URL}/articles/${item.slug}`,
      thumbnail: item.coverImageUrl || '',
      platform: 'TFTimes',
      author,
      category,
      publishedAt: new Date(item.publishedAt),
      fetchedAt: new Date(),
    };
  });
}

// ============================================================
// 数据库保存函数
// ============================================================
async function saveToDatabase(articles) {
  let client;

  try {
    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const db = client.db();
    const collection = db.collection('articles');

    const stats = {
      new: 0,
      updated: 0,
      failed: 0,
    };

    for (const article of articles) {
      try {
        // 清理相同标题的旧记录（不同 ID，防止 ID 格式变更导致重复）
        const staleArticle = await collection.findOne({
          title: article.title,
          platform: 'TFTimes',
          id: { $ne: article.id },
        });
        if (staleArticle) {
          await collection.deleteOne({ _id: staleArticle._id });
          console.log(`[TFTimes] 清理旧记录: ${staleArticle.id}`);
        }

        const existingArticle = await collection.findOne({ id: article.id });
        const isNew = !existingArticle;
        await collection.updateOne(
          { id: article.id },
          { $set: article },
          { upsert: true }
        );

        if (isNew) {
          stats.new++;
        } else {
          stats.updated++;
        }
      } catch (error) {
        console.error(`[TFTimes] 保存文章失败 [${article.id}]:`, error.message);
        stats.failed++;
      }
    }

    return stats;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('🚀 TFT Times 数据抓取（API 模式）');

  try {
    const apiData = await fetchJSON(`${CONFIG.API_URL}/articles`);
    const articles = parseArticles(apiData);

    console.log(`\n📊 成功抓取: ${articles.length} 篇文章`);

    // 保存到数据库
    if (articles.length > 0) {
      const stats = await saveToDatabase(articles);
      console.log('\n✅ TFT Times 数据抓取完成！');
      console.log(`   新增: ${stats.new} 篇`);
      console.log(`   更新: ${stats.updated} 篇`);
      console.log(`   失败: ${stats.failed} 篇`);

      return { success: true, stats };
    } else {
      console.log('\n⚠️  没有抓取到任何文章');
      return { success: false, error: '没有抓取到任何文章' };
    }
  } catch (error) {
    console.error('\n❌ 抓取失败:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================
// 执行
// ============================================================
if (require.main === module) {
  main()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ 脚本执行出错:', error);
      process.exit(1);
    });
}

module.exports = { main };
