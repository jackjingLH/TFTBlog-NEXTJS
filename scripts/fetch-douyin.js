/**
 * 抖音数据智能抓取脚本
 *
 * 功能：
 * - 从数据库读取抖音账号配置
 * - 通过本地 RSSHub 抓取抖音视频数据
 * - 保存到 MongoDB 数据库
 * - 自动去重（基于视频 ID）
 *
 * 使用方法：
 *   node scripts/fetch-douyin.js
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const http = require('http');
const { MongoClient } = require('mongodb');

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  // MongoDB 配置
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://47.99.202.3:27017/tftblog',

  // RSSHub 实例地址
  RSSHUB_URL: 'http://localhost:1200',

  // 抓取配置
  MAX_VIDEOS_PER_USER: 20,  // 每个账号最多抓取 20 个视频
  API_TIMEOUT: 30000,        // API 超时：30秒
};

// ============================================================
// 从数据库加载抖音账号配置
// ============================================================
async function loadDouyinAccounts() {
  let client;

  try {
    console.log('📋 从数据库加载抖音账号配置...');

    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const db = client.db();
    const collection = db.collection('sources');

    const sources = await collection.find({
      platform: 'Douyin',
      enabled: true
    }).toArray();

    if (sources.length === 0) {
      console.log('⚠️  数据库中没有启用的抖音账号');
      console.log('   请在管理后台添加抖音账号配置');
      return [];
    }

    console.log(`✅ 成功加载 ${sources.length} 个抖音账号配置`);

    // 转换为脚本需要的格式
    return sources.map(source => ({
      userId: source.douyin.userId,
      name: source.name,
      fans: source.douyin.fans || '待更新'
    }));
  } catch (error) {
    console.error('');
    console.error('❌ 从数据库加载账号配置失败:');
    console.error('='.repeat(60));
    console.error(`错误信息: ${error.message}`);
    console.error('='.repeat(60));
    console.error('');
    console.error('请确保：');
    console.error('1. MongoDB 数据库正常运行');
    console.error('2. 已在管理后台添加抖音账号');
    console.error('3. MONGODB_URI 环境变量配置正确');
    console.error('');
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// ============================================================
// HTTP 请求函数
// ============================================================
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'GET',
      timeout: CONFIG.API_TIMEOUT,
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
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
// 解析 RSS XML
// ============================================================
function parseRSS(xml) {
  const articles = [];

  // 提取频道标题（作者名称）
  const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/);
  const authorName = channelTitleMatch ? channelTitleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() : 'Unknown';

  // 提取所有 item（限制最新5条）
  const itemPattern = /<item>[\s\S]*?<\/item>/g;
  const allItems = xml.match(itemPattern);

  if (!allItems) {
    return { authorName, articles };
  }

  // 只处理最新5条
  const items = allItems.slice(0, 5);

  for (const item of items) {
    try {
      // 提取标题
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      if (!titleMatch) continue;
      const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim();

      // 提取链接
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      if (!linkMatch) continue;
      const link = linkMatch[1].trim();

      // 提取视频 ID（从链接中）
      const videoIdMatch = link.match(/video\/(\d+)/);
      if (!videoIdMatch) continue;
      const videoId = videoIdMatch[1];
      const id = `douyin-${videoId}`;

      // 提取描述
      const descMatch = item.match(/<description>(.*?)<\/description>/s);
      let description = '';
      let thumbnail = '';

      if (descMatch) {
        const descContent = descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1');

        // 从描述中提取第一个句子作为描述（去掉 HTML 和话题标签）
        const textMatch = descContent.match(/^(.*?)(?:#|&lt;br&gt;)/);
        if (textMatch) {
          description = textMatch[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .trim();
        }

        // 提取封面图 - 先解码HTML实体
        const decodedDesc = descContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&');

        const imgMatch = decodedDesc.match(/<img[^>]*src=["']([^"']+)["']/);
        if (imgMatch) {
          // 再次解码 URL 中可能存在的实体编码
          thumbnail = imgMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');
        }
      }

      // 提取发布时间
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

      // 提取分类
      const categoryMatches = item.match(/<category>(.*?)<\/category>/g);
      let category = '视频';
      if (categoryMatches && categoryMatches.length > 0) {
        const firstCategory = categoryMatches[0].match(/<category>(.*?)<\/category>/);
        if (firstCategory) {
          category = firstCategory[1].replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim();
        }
      }

      articles.push({
        id,
        title,
        description: description.substring(0, 200),  // 限制描述长度
        link,
        thumbnail,
        platform: 'Douyin',  // 修复：统一使用 'Douyin' 与 sources 集合保持一致
        author: authorName,
        category,
        publishedAt,
        fetchedAt: new Date(),
      });
    } catch (error) {
      console.error(`  解析视频失败:`, error.message);
    }
  }

  return { authorName, articles };
}

// ============================================================
// 保存到数据库
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
        console.error(`  保存视频失败 [${article.id}]:`, error.message);
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
// 抓取单个账号
// ============================================================
async function fetchAccount(account) {
  const url = `${CONFIG.RSSHUB_URL}/douyin/user/${account.userId}`;

  console.log(`\n🎯 抓取: ${account.name}`);
  console.log(`   URL: ${url}`);

  try {
    const xml = await fetchRSS(url);
    const { authorName, articles } = parseRSS(xml);

    console.log(`   ✅ 成功抓取: ${articles.length} 个视频`);
    console.log(`   📝 作者名称: ${authorName}`);

    if (articles.length > 0) {
      const stats = await saveToDatabase(articles);
      console.log(`   💾 保存结果: 新增 ${stats.new} 篇 | 更新 ${stats.updated} 篇 | 失败 ${stats.failed} 篇`);
      return { success: true, count: articles.length, stats };
    } else {
      console.log(`   ⚠️  没有抓取到任何视频`);
      return { success: false, error: '没有抓取到任何视频' };
    }
  } catch (error) {
    console.error(`   ❌ 抓取失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('🚀 抖音数据抓取');
  console.log('='.repeat(60));

  try {
    // 1. 加载账号配置
    const accounts = await loadDouyinAccounts();

    if (accounts.length === 0) {
      console.log('\n⚠️  没有可抓取的账号');
      return { success: false, error: '没有可抓取的账号' };
    }

    // 2. 抓取所有账号
    const results = [];
    for (const account of accounts) {
      const result = await fetchAccount(account);
      results.push({
        name: account.name,
        ...result
      });

      // 延迟 15 秒，模拟人工操作节奏，避免 WAF 触发
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    // 3. 汇总统计
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log('\n' + '='.repeat(60));
    console.log('📊 抓取完成统计：');
    console.log(`   总账号数: ${accounts.length}`);
    console.log(`   成功: ${successCount}`);
    console.log(`   失败: ${failureCount}`);

    return { success: true, results };
  } catch (error) {
    console.error('\n❌ 抓取失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 执行
if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ 抖音数据抓取完成！');
        process.exit(0);
      } else {
        console.error('\n❌ 抓取失败');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = main;
