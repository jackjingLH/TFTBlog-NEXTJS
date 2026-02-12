/**
 * Tacter 数据抓取脚本 v2
 *
 * 功能:
 * - 抓取 Tacter 博主攻略内容
 * - 从 Next.js __NEXT_DATA__ 中提取 JSON 数据
 * - 支持多个博主: @tftips, @extiria
 * - 自动去重并保存到 MongoDB
 *
 * 使用方法:
 *   node scripts/fetch-tacter.js
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');
const https = require('https');

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  // MongoDB 配置
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://47.99.202.3:27017/tftblog',

  // Tacter 博主列表（从数据库读取）
  AUTHORS: [],  // 不再使用硬编码，从数据库 sources 集合读取

  // 抓取限制
  GUIDE_LIMIT_PER_AUTHOR: 5,  // 每个博主最多抓取 5 篇攻略

  // 请求配置
  REQUEST_TIMEOUT: 30000,
  RETRY_DELAY: 2000,
};

// ============================================================
// 从数据库加载 Tacter 作者配置
// ============================================================
async function loadTacterAuthors() {
  let client;

  try {
    console.log('📋 从数据库加载 Tacter 作者配置...');

    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const db = client.db();
    const collection = db.collection('sources');

    const sources = await collection.find({
      platform: 'Tacter',
      enabled: true
    }).toArray();

    await client.close();

    if (sources.length === 0) {
      console.log('⚠️  数据库中没有启用的 Tacter 作者');
      console.log('   请在管理后台添加 Tacter 作者配置');
      return [];
    }

    console.log(`✅ 成功加载 ${sources.length} 个 Tacter 作者配置`);

    // 转换为脚本需要的格式
    return sources.map(source => ({
      username: source.tacter.username,
      name: source.name,
      description: source.tacter.description || ''
    }));
  } catch (error) {
    console.error('');
    console.error('❌ 从数据库加载 Tacter 作者配置失败:');
    console.error('='.repeat(60));
    console.error(`错误信息: ${error.message}`);
    console.error('='.repeat(60));
    console.error('');
    console.error('请确保：');
    console.error('1. MongoDB 数据库正常运行');
    console.error('2. 已运行数据迁移脚本: node scripts/migrate-sources.js');
    console.error('3. MONGODB_URI 环境变量配置正确');
    console.error('');
    throw error;  // 抛出错误，不降级
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// ============================================================
// HTTP 请求辅助函数
// ============================================================
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`   [尝试 ${i + 1}/${maxRetries}] 抓取: ${url}`);

      const data = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
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
            } else if (res.statusCode === 301 || res.statusCode === 302) {
              const redirectUrl = res.headers.location;
              if (redirectUrl) {
                console.log(`   → 重定向到: ${redirectUrl}`);
                resolve(fetchWithRetry(redirectUrl, 1));
              } else {
                reject(new Error(`HTTP ${res.statusCode}: 无重定向地址`));
              }
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

      return data;
    } catch (error) {
      console.error(`   ❌ 尝试 ${i + 1} 失败: ${error.message}`);

      if (i < maxRetries - 1) {
        console.log(`   ⏱️  等待 ${CONFIG.RETRY_DELAY / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

// ============================================================
// HTML 解析函数 - 从 __NEXT_DATA__ 提取攻略
// ============================================================
function parseGuides(html, author) {
  const guides = [];

  try {
    // 查找 __NEXT_DATA__ 中的攻略数据
    const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

    if (!scriptMatch) {
      return guides;
    }

    try {
      const nextData = JSON.parse(scriptMatch[1]);
      const dehydratedState = JSON.parse(nextData.props.pageProps.dehydratedState);
      const queries = dehydratedState.queries || [];

      // 查找包含 pages 的查询 (攻略列表)
      for (const query of queries) {
        if (query.state && query.state.data && query.state.data.pages) {
          const pages = query.state.data.pages;

          // 遍历所有页面
          for (const page of pages) {
            // 每个页面可能是一个数组或对象
            const pageItems = Array.isArray(page) ? page : Object.values(page);

            for (const guide of pageItems) {
              // 跳过非攻略对象
              if (!guide || typeof guide !== 'object' || !guide.id) {
                continue;
              }

              // 提取攻略信息
              const guideId = guide.id;
              const title = guide.title || guide.displayName || 'Untitled';
              const slug = guide.slug || '';
              const link = slug ? `https://www.tacter.com/tft/guides/${slug}` : '';

              // 从 header 中提取英雄列表作为描述
              let description = author.description || '';
              if (guide.header && guide.header.content && guide.header.content.champions) {
                const champions = Object.values(guide.header.content.champions);
                const championNames = champions
                  .map(c => c.name)
                  .filter(n => n)
                  .slice(0, 5); // 只取前 5 个英雄

                if (championNames.length > 0) {
                  description = `英雄: ${championNames.join(', ')}`;
                }
              }

              // 提取缩略图 - 使用作者头像作为临时方案
              let thumbnail = '';
              if (guide.authorProfilePicture) {
                thumbnail = guide.authorProfilePicture;
                // 如果是相对路径，转换为绝对路径
                if (thumbnail && !thumbnail.startsWith('http')) {
                  thumbnail = `https://www.tacter.com${thumbnail.startsWith('/') ? '' : '/'}${thumbnail}`;
                }
              }

              // 尝试提取发布时间
              let publishedAt = new Date();
              if (guide.createdAt) {
                publishedAt = new Date(guide.createdAt);
              } else if (guide.updatedAt) {
                publishedAt = new Date(guide.updatedAt);
              }

              guides.push({
                id: `tacter-${guideId}`,
                title,
                description,
                link,
                thumbnail, // 添加缩略图字段（作者头像）
                platform: 'Tacter',
                author: author.name,
                category: '攻略',
                publishedAt,
                fetchedAt: new Date(),
              });
            }
          }
        }
      }

    } catch (jsonError) {
      // 降级方案: 尝试简单的标题匹配
      const titlePattern = /"title":"([^"]+)"/g;
      const titleMatches = html.match(titlePattern);

      if (titleMatches) {
        for (let i = 0; i < Math.min(titleMatches.length, CONFIG.GUIDE_LIMIT_PER_AUTHOR); i++) {
          const title = titleMatches[i].match(/"title":"([^"]+)"/)[1];

          guides.push({
            id: `tacter-${author.username}-${i}`,
            title,
            description: author.description || '',
            link: `https://www.tacter.com/@${author.username}`,
            thumbnail: '', // 降级方案无法获取图片
            platform: 'Tacter',
            author: author.name,
            category: '攻略',
            publishedAt: new Date(),
            fetchedAt: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error(`   [Parser] 解析失败:`, error.message);
  }

  // 去重 (基于标题)
  const uniqueGuides = [];
  const seenTitles = new Set();

  for (const guide of guides) {
    if (!seenTitles.has(guide.title)) {
      seenTitles.add(guide.title);
      uniqueGuides.push(guide);
    }
  }

  return uniqueGuides.slice(0, CONFIG.GUIDE_LIMIT_PER_AUTHOR);
}

// ============================================================
// 数据库保存函数
// ============================================================
async function saveToDatabase(guides) {
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

    for (const guide of guides) {
      try {
        const existingGuide = await collection.findOne({ id: guide.id });
        const isNew = !existingGuide;

        await collection.updateOne(
          { id: guide.id },
          { $set: guide },
          { upsert: true }
        );

        if (isNew) {
          stats.new++;
        } else {
          stats.updated++;
        }
      } catch (error) {
        console.error(`[Tacter] 保存攻略失败 [${guide.id}]:`, error.message);
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
  console.log('🚀 Tacter 数据抓取');
  console.log('');

  // 从数据库加载作者配置
  const authors = await loadTacterAuthors();

  if (authors.length === 0) {
    console.log('⏹️  没有需要抓取的作者，退出');
    process.exit(0);
  }

  console.log('');

  const allGuides = [];

  for (const author of authors) {
    console.log(`\n📝 ${author.name} (@${author.username})`);

    try {
      const url = `https://www.tacter.com/@${author.username}`;

      // 抓取页面 HTML
      const html = await fetchWithRetry(url);

      // 解析攻略列表
      const guides = parseGuides(html, author);

      if (guides.length > 0) {
        console.log(`   ✅ 成功: ${guides.length} 篇攻略`);
        allGuides.push(...guides);
      } else {
        console.log('   ⚠️  未找到攻略');
      }
    } catch (error) {
      console.error(`   ❌ 失败: ${error.message}`);
    }

    // 博主之间延迟
    if (authors.indexOf(author) < authors.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 保存到数据库
  if (allGuides.length > 0) {
    console.log(`\n📊 总计: ${allGuides.length} 篇攻略`);

    const stats = await saveToDatabase(allGuides);

    console.log('\n✅ Tacter 数据抓取完成！');
    console.log(`   新增: ${stats.new} 篇`);
    console.log(`   更新: ${stats.updated} 篇`);
    console.log(`   失败: ${stats.failed} 篇`);

    return { success: true, stats };
  } else {
    console.log('\n⚠️  没有抓取到任何攻略');
    return { success: false, error: '没有抓取到任何攻略' };
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
