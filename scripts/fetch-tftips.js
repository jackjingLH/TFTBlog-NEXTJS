/**
 * TFTips 数据抓取脚本
 *
 * 功能：
 * - 抓取 TFTips 官网所有阵容推荐（https://tftips.app/comps）
 * - 基于页面更新时间进行智能同步（仅在更新时间变化时执行）
 * - 删除不存在的阵容 + upsert 所有阵容
 * - 记录更新时间到 Source.tftips.lastUpdateTime
 *
 * 使用方法：
 *   node scripts/fetch-tftips.js
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

  // TFTips 配置
  BASE_URL: 'https://tftips.app',
  COMPS_URL: 'https://tftips.app/comps',

  // 平台信息
  PLATFORM: 'TFTips',
  AUTHOR: 'TFTips',

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
        'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
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
// 从 HTML 片段中提取 "Updated: YYYY.M.D" 格式的时间
// 兼容 React hydration 注释：Updated: <!-- -->2026.2.25
// ============================================================
function extractUpdateTime(html) {
  const updateMatch = html.match(/Updated:\s*(?:<!--\s*-->)?\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!updateMatch) {
    return null;
  }

  const year = parseInt(updateMatch[1]);
  const month = parseInt(updateMatch[2]) - 1;  // JavaScript Date 月份从 0 开始
  const day = parseInt(updateMatch[3]);

  // 设置为当天 UTC 0点（避免时区问题）
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

// ============================================================
// HTML 解析函数 - 提取阵容
// ============================================================
function parseComps(html) {
  const comps = [];

  // 按 section 分段（每个 tier 一个 section）
  const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/g;
  const sections = [...html.matchAll(sectionRegex)];

  for (const sectionMatch of sections) {
    const sectionHTML = sectionMatch[1];

    // 提取 tier (S/A/B/C)
    const tierMatch = sectionHTML.match(/class="[^"]*bg-tier-([sabc])[^"]*"/i);
    const tier = tierMatch ? tierMatch[1].toUpperCase() : '未分级';

    // 提取卡片（仅 <a> 标签，跳过 <button>）
    const cardRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const cards = [...sectionHTML.matchAll(cardRegex)];

    for (const card of cards) {
      try {
        const href = card[1];
        const cardHTML = card[2];

        // 提取标题
        const titleMatch = cardHTML.match(/<h3[^>]*>(.*?)<\/h3>/);
        if (!titleMatch) {
          continue;
        }
        const title = cleanText(titleMatch[1]);

        // 提取 slug (从 href 提取)
        // href 格式: /comps/t-hex
        const slugMatch = href.match(/\/comps\/([^?#]+)/);
        if (!slugMatch) {
          console.log(`[TFTips] 无法提取 slug，跳过: ${href}`);
          continue;
        }
        const slug = slugMatch[1];
        const id = `TFTips-${slug}`;

        // 提取封面图（将 sm 替换为 md，使用桌面版大图）
        const imgMatch = cardHTML.match(/<img[^>]+src="([^"]+)"/);
        const thumbnail = imgMatch ? imgMatch[1].replace('/champ/sm/', '/champ/md/') : '';

        // 构建完整链接
        const link = href.startsWith('http') ? href : `${CONFIG.BASE_URL}${href}`;

        // 提取该阵容自身的更新时间（位于卡片桌面版底部）
        // 格式：<div ...>Updated: 2026.2.2</div>
        const publishedAt = extractUpdateTime(cardHTML);

        comps.push({
          id,
          title,
          description: extractTags(cardHTML),
          link,
          thumbnail,
          platform: CONFIG.PLATFORM,
          author: CONFIG.AUTHOR,
          category: tier,
          publishedAt,   // 每个阵容独立的更新时间，未找到时为 null
          fetchedAt: new Date(),
        });
      } catch (error) {
        console.error(`[TFTips] 解析卡片失败:`, error.message);
      }
    }
  }

  return comps;
}

// ============================================================
// 提取卡片标签（リロールLv6 / 初心者にオススメ 等）
// 跳过含 SVG 的「ガイド」徽章，并对移动/桌面重复标签去重
// ============================================================
function extractTags(cardHTML) {
  // inline-flex 是策略标签的特征，ガイド 徽章用的是 flex（非 inline-flex）
  const tagRegex = /<div class="inline-flex[^"]*rounded-full border[^"]*"[^>]*>\s*([^<]+?)\s*<\/div>/g;
  const seen = new Set();

  for (const match of cardHTML.matchAll(tagRegex)) {
    const tag = match[1].trim();
    if (tag) seen.add(tag);
  }

  return seen.size > 0 ? [...seen].join(' / ') : 'TFTips 阵容推荐';
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
// 数据库同步函数（增量更新）
// ============================================================
async function syncToDatabase(newComps, db) {
  const collection = db.collection('articles');

  const stats = {
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
  };

  try {
    // 1. 获取数据库中现有的所有 TFTips 阵容
    const existingComps = await collection.find({ platform: CONFIG.PLATFORM }).toArray();
    const existingIds = new Set(existingComps.map(c => c.id));
    const newIds = new Set(newComps.map(c => c.id));

    // 2. 识别需要删除的阵容（在数据库中但不在页面上）
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

    // 安全检查：如果要删除的超过80%，可能是解析错误
    if (idsToDelete.length > 0 && idsToDelete.length > existingComps.length * 0.8) {
      console.error(`⚠️  警告：将删除 ${idsToDelete.length}/${existingComps.length} 个阵容（超过80%）`);
      console.error('   这可能是页面解析错误，操作已取消');
      console.error('   请检查页面结构是否变化');
      throw new Error('删除阵容数量异常，操作取消');
    }

    // 3. 批量删除不存在的阵容
    if (idsToDelete.length > 0) {
      console.log(`🗑️  删除不存在的阵容: ${idsToDelete.length} 个`);
      const deleteResult = await collection.deleteMany({
        id: { $in: idsToDelete }
      });
      stats.deleted = deleteResult.deletedCount;
    }

    // 4. 批量 upsert 所有阵容
    console.log(`💾 同步阵容: ${newComps.length} 个`);
    for (const comp of newComps) {
      try {
        const existing = await collection.findOne({ id: comp.id });
        const isNew = !existing;

        await collection.updateOne(
          { id: comp.id },
          { $set: comp },
          { upsert: true }
        );

        if (isNew) {
          stats.added++;
        } else {
          stats.updated++;
        }
      } catch (error) {
        console.error(`[TFTips] 保存阵容失败 [${comp.id}]:`, error.message);
        stats.failed++;
      }
    }

    return stats;
  } catch (error) {
    console.error('[TFTips] 数据库同步失败:', error.message);
    throw error;
  }
}

// ============================================================
// 格式化日期（用于日志输出）
// ============================================================
function formatDate(date) {
  if (!date) return '无';
  const d = new Date(date);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('🚀 TFTips 数据抓取');

  let client;

  try {
    // 连接数据库
    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const db = client.db();

    // 1. 获取 TFTips 数据源配置
    const sourcesCollection = db.collection('sources');
    let source = await sourcesCollection.findOne({ platform: CONFIG.PLATFORM });

    // 如果不存在，自动创建
    if (!source) {
      console.log('⚙️  TFTips 数据源不存在，自动创建...');
      await sourcesCollection.insertOne({
        platform: CONFIG.PLATFORM,
        name: CONFIG.AUTHOR,
        enabled: true,
        tftips: {
          lastUpdateTime: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      source = await sourcesCollection.findOne({ platform: CONFIG.PLATFORM });
      console.log('✅ TFTips 数据源创建成功');
    }

    // 2. 抓取页面 HTML
    console.log('📥 抓取页面...');
    const html = await fetchHTML(CONFIG.COMPS_URL);

    // 3. 解析阵容（每个阵容自带独立更新时间）
    console.log('🔍 解析阵容...');
    const comps = parseComps(html);

    if (comps.length === 0) {
      console.error('⚠️  警告：未解析到任何阵容，可能是页面结构变化');
      console.error('   操作已取消，请检查页面结构');
      return { success: false, error: '未解析到任何阵容' };
    }

    console.log(`📊 解析成功: ${comps.length} 个阵容`);

    // 4. 从所有阵容中取最新的更新时间，作为「有效页面更新时间」
    // 任何一个阵容有更新，都会触发同步
    const latestCompTime = comps.reduce((max, comp) => {
      if (!comp.publishedAt) return max;
      if (!max || comp.publishedAt > max) return comp.publishedAt;
      return max;
    }, null);
    const updateTime = latestCompTime || new Date();

    if (!latestCompTime) {
      console.warn('⚠️  所有阵容均未找到更新时间，使用当前时间');
    }

    // 5. 对比上次更新时间
    const lastUpdateTime = source.tftips?.lastUpdateTime;

    if (lastUpdateTime) {
      const lastTime = new Date(lastUpdateTime);
      if (updateTime.getTime() === lastTime.getTime()) {
        console.log('✅ 页面无更新，跳过抓取');
        console.log(`   上次更新: ${formatDate(lastTime)}`);
        console.log(`   最新阵容: ${formatDate(updateTime)}`);
        return { success: true, skipped: true };
      }
    }

    console.log('🔄 检测到页面更新，开始同步...');
    console.log(`   上次更新: ${lastUpdateTime ? formatDate(lastUpdateTime) : '首次抓取'}`);
    console.log(`   最新阵容: ${formatDate(updateTime)}`);

    // 6. 同步到数据库
    const stats = await syncToDatabase(comps, db);

    // 7. 更新 Source 的 lastUpdateTime（存储最新阵容时间）
    await sourcesCollection.updateOne(
      { platform: CONFIG.PLATFORM },
      {
        $set: {
          'tftips.lastUpdateTime': updateTime,
          updatedAt: new Date()
        }
      }
    );

    console.log('\n✅ TFTips 数据抓取完成！');
    console.log(`   新增: ${stats.added} 个`);
    console.log(`   更新: ${stats.updated} 个`);
    console.log(`   删除: ${stats.deleted} 个`);
    console.log(`   失败: ${stats.failed} 个`);

    return { success: true, stats };
  } catch (error) {
    console.error('\n❌ 抓取失败:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (client) {
      await client.close();
    }
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
