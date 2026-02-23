/**
 * TFT Times 数据抓取脚本
 *
 * 功能：
 * - 抓取 TFT Times 官网最新文章（メタ＆攻略、パッチノート、ニュース）
 * - 直接保存到 MongoDB 数据库
 * - 自动去重（基于文章 ID）
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

  // TFT Times 配置
  BASE_URL: 'https://www.tftimes.jp',
  ARTICLE_LIMIT: 5,  // 抓取最新的 5 篇文章

  // 请求超时
  REQUEST_TIMEOUT: 30000,
};

// ============================================================
// HTTP 请求辅助函数
// ============================================================
async function fetchHTML(url) {
  const https = require('https');

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
      timeout: CONFIG.REQUEST_TIMEOUT,
    }, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
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
// HTML 解析函数
// ============================================================
function parseArticles(html) {
  const articles = [];

  // 查找文章列表 - 使用 entry-card 类的 article 标签
  const articlePattern = /<article[^>]*class="[^"]*entry-card[^"]*"[^>]*>[\s\S]*?<\/article>/gs;
  const matches = html.match(articlePattern);

  if (!matches) {
    return articles;
  }

  for (let i = 0; i < matches.length && i < CONFIG.ARTICLE_LIMIT; i++) {
    const articleHTML = matches[i];

    try {
      // 提取标题
      const titleMatch = articleHTML.match(/<h2[^>]*class="[^"]*entry-card-title[^"]*"[^>]* itemprop="headline">(.*?)<\/h2>/s);
      if (!titleMatch) {
        continue;
      }

      const title = cleanText(titleMatch[1]);

      // 提取描述
      let description = '';
      const descMatch = articleHTML.match(/<div[^>]*class="[^"]*entry-card-snippet[^"]*"[^>]*>(.*?)<\/div>/s);
      if (descMatch) {
        description = cleanText(descMatch[1]);
      }

      // 提取文章 ID
      const idMatch = articleHTML.match(/id="post-(\d+)"/);
      const postId = idMatch ? idMatch[1] : '';

      if (!postId) {
        console.log(`[TFTimes] 文章 ${i} 缺少 ID，跳过`);
        continue;
      }

      // 构建链接
      const link = `${CONFIG.BASE_URL}/?p=${postId}`;
      const id = `tftimes-${postId}`;

      // 提取日期
      let publishedAt = new Date();
      const dateMatch = articleHTML.match(/<span[^>]*class="[^"]*entry-date[^"]*"[^>]*>(.*?)<\/span>/s);
      if (dateMatch) {
        const dateStr = dateMatch[1].trim();
        // 解析 YYYY.MM.DD 格式
        const dateParts = dateStr.split('.');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          publishedAt = new Date(year, month, day);
        }
      }

      // 提取缩略图 - 尝试多种模式
      let thumbnail = '';

      // 模式1: <img> 标签的 src
      const imgSrcMatch = articleHTML.match(/<img[^>]*src=["']([^"']+)["']/);
      if (imgSrcMatch) {
        thumbnail = imgSrcMatch[1];
      }

      // 模式2: data-src (懒加载)
      if (!thumbnail) {
        const dataSrcMatch = articleHTML.match(/<img[^>]*data-src=["']([^"']+)["']/);
        if (dataSrcMatch) {
          thumbnail = dataSrcMatch[1];
        }
      }

      // 模式3: style 背景图
      if (!thumbnail) {
        const bgMatch = articleHTML.match(/background-image:\s*url\(['"]?([^'"()]+)['"]?\)/);
        if (bgMatch) {
          thumbnail = bgMatch[1];
        }
      }

      // 如果是相对路径，转换为绝对路径
      if (thumbnail && !thumbnail.startsWith('http')) {
        thumbnail = `${CONFIG.BASE_URL}${thumbnail.startsWith('/') ? '' : '/'}${thumbnail}`;
      }

      // 尝试提取分类（多种可能的类名）
      let category = '综合';

      // 尝试不同的分类选择器
      const categoryPatterns = [
        /<span[^>]*class="[^"]*cat-name[^"]*"[^>]*>(.*?)<\/span>/s,
        /<a[^>]*class="[^"]*cat-link[^"]*"[^>]*>(.*?)<\/a>/s,
        /<span[^>]*class="[^"]*category[^"]*"[^>]*>(.*?)<\/span>/s,
      ];

      for (const pattern of categoryPatterns) {
        const match = articleHTML.match(pattern);
        if (match) {
          category = cleanText(match[1]);
          break;
        }
      }

      // 根据分类设置 author，与 sources 集合保持一致
      let author = 'TFT Times - ニュース';  // 默认分类
      if (category.includes('メタ') || category.includes('攻略')) {
        author = 'TFT Times - メタ＆攻略';
      } else if (category.includes('パッチ')) {
        author = 'TFT Times - パッチノート';
      }

      articles.push({
        id,
        title,
        description,
        link,
        thumbnail,
        platform: 'TFTimes',
        author,  // 修复：使用分类对应的 author，与 sources 集合保持一致
        category,
        publishedAt,
        fetchedAt: new Date(),
      });
    } catch (error) {
      console.error(`[TFTimes] 解析文章 ${i} 失败:`, error.message);
    }
  }

  return articles;
}

// ============================================================
// 文本清理函数
// ============================================================
function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, '') // 移除 HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
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
  console.log('🚀 TFT Times 数据抓取');

  try {
    const html = await fetchHTML(CONFIG.BASE_URL);
    const articles = parseArticles(html);

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
