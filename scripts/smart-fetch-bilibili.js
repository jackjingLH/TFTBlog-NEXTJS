/**
 * B站数据智能抓取脚本
 *
 * 功能：
 * - 自动重试失败的UP主
 * - 动态递增间隔时间（15s → 30s → 60s → 120s...）
 * - 成功的UP主自动移除
 * - 最多重试10次
 *
 * 使用方法：
 *   node scripts/smart-fetch-bilibili.js
 *
 * 注意：运行前请确保已切换到可用的代理IP
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const http = require('http');
const https = require('https');
const { MongoClient } = require('mongodb');

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  // MongoDB 配置
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://47.99.202.3:27017/tftblog',

  // RSSHub 实例地址
  RSSHUB_URL: 'http://localhost:1200',

  // B站Cookie（用于RSSHub获取数据）
  BILIBILI_COOKIE: process.env.BILIBILI_COOKIE || '',

  // UP主列表（按粉丝数排序，大V在前可能有优势）
  UP_MASTERS: [
    { uid: '18343134', name: '林小北Lindo', fans: '186万' },
    { uid: '388063772', name: 'GoDlike_神超', fans: '84.46万' },
    { uid: '262943792', name: '手刃猫咪', fans: '15.69万' },
    { uid: '14306063', name: '兔子解说JokerTu', fans: '待更新' },
    { uid: '37452208', name: '襄平霸王东', fans: '待更新' },
    { uid: '3546666107931417', name: '云顶风向标', fans: '待更新' },
  ],

  // 重试配置
  INITIAL_INTERVAL: 15000,    // 初始间隔：15秒
  MAX_RETRIES: 10,             // 最大重试次数
  INTERVAL_MULTIPLIER: 2,      // 间隔倍增系数
  MAX_INTERVAL: 60000,         // 最大间隔：60秒（第3轮后不再增加）
  RANDOM_OFFSET: 2000,         // 随机波动：±2秒
  API_TIMEOUT: 30000,          // API超时：30秒
};

// ============================================================
// UP主状态管理
// ============================================================
class UPMasterTracker {
  constructor(upMasters) {
    this.pending = upMasters.map(up => ({
      ...up,
      retries: 0,
      lastError: null,
      attemptTimes: [],
    }));
    this.succeeded = [];
    this.failed = [];
  }

  hasPending() {
    return this.pending.length > 0;
  }

  getPending() {
    return this.pending;
  }

  markSuccess(uid, saveResult = null) {
    const index = this.pending.findIndex(up => up.uid === uid);
    if (index !== -1) {
      const up = this.pending.splice(index, 1)[0];
      this.succeeded.push({
        ...up,
        finalRetries: up.retries,
        saveResult, // 保存结果统计 { articleCount, newCount, updateCount, failedCount }
      });
      return true;
    }
    return false;
  }

  markRetry(uid, error) {
    const up = this.pending.find(up => up.uid === uid);
    if (up) {
      up.retries++;
      up.lastError = error;
      up.attemptTimes.push(new Date());

      // 超过最大重试次数，移到失败列表
      if (up.retries >= CONFIG.MAX_RETRIES) {
        const index = this.pending.findIndex(u => u.uid === uid);
        const failed = this.pending.splice(index, 1)[0];
        this.failed.push({
          ...failed,
          reason: 'MAX_RETRIES_EXCEEDED',
        });
        return false; // 不再重试
      }
      return true; // 继续重试
    }
    return false;
  }

  getStats() {
    return {
      total: this.succeeded.length + this.pending.length + this.failed.length,
      succeeded: this.succeeded.length,
      pending: this.pending.length,
      failed: this.failed.length,
    };
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 抓取报告');
    console.log('='.repeat(60));

    const stats = this.getStats();
    console.log(`\n总计: ${stats.total} 个UP主`);
    console.log(`✅ 成功: ${stats.succeeded}`);
    console.log(`❌ 失败: ${stats.failed}`);
    console.log(`⏳ 待处理: ${stats.pending}`);

    if (this.succeeded.length > 0) {
      console.log('\n✅ 成功列表:');
      this.succeeded.forEach((up, i) => {
        const retryInfo = up.finalRetries > 0 ? ` (重试${up.finalRetries}次)` : '';
        console.log(`  ${i + 1}. ${up.name} (${up.fans})${retryInfo}`);
      });
    }

    if (this.failed.length > 0) {
      console.log('\n❌ 失败列表:');
      this.failed.forEach((up, i) => {
        console.log(`  ${i + 1}. ${up.name} (${up.fans})`);
        console.log(`     原因: ${up.reason}`);
        console.log(`     重试次数: ${up.retries}/${CONFIG.MAX_RETRIES}`);
        console.log(`     最后错误: ${up.lastError}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

// ============================================================
// HTTP 请求辅助函数
// ============================================================
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    // 如果是RSSHub请求，添加B站Cookie
    const headers = { ...options.headers };
    if (url.includes('rsshub') || url.includes('localhost:1200')) {
      if (CONFIG.BILIBILI_COOKIE) {
        headers['Cookie'] = CONFIG.BILIBILI_COOKIE;
      }
    }

    const req = client.request(url, {
      method: options.method || 'GET',
      headers,
      timeout: options.timeout || 30000,
    }, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// ============================================================
// RSSHub API 调用 + 立即保存（一次请求完成）
// ============================================================
async function fetchAndSaveUPMaster(up, collection) {
  const url = `${CONFIG.RSSHUB_URL}/bilibili/user/video/${up.uid}`;

  try {
    // 1. 从RSSHub获取数据
    const response = await httpRequest(url, {
      timeout: CONFIG.API_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.status === 503) {
      // B站风控
      if (response.body.includes('风控校验失败') || response.body.includes('-352')) {
        throw new Error('B站风控 (-352)');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 验证是否是有效的RSS/XML
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('xml') && !contentType.includes('rss')) {
      throw new Error('无效的响应格式');
    }

    // 2. 解析RSS数据（从 RSS 中直接提取图片）
    const articles = parseRSSFeed(response.body, up.name);
    if (articles.length === 0) {
      console.log(`   ⚠️  ${up.name}: 未找到文章`);
      return { success: true, articleCount: 0, newCount: 0, updateCount: 0 };
    }

    // 3. 立即保存到数据库
    let newCount = 0;
    let updateCount = 0;
    let failedCount = 0;

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
          newCount++;
        } else {
          updateCount++;
        }
      } catch (error) {
        console.error(`   ❌ 保存失败 [${article.id}]:`, error.message);
        failedCount++;
      }
    }

    // 4. 显示保存结果
    console.log(`   ✅ 已保存: ${articles.length}篇 (新增:${newCount} 更新:${updateCount}${failedCount > 0 ? ` 失败:${failedCount}` : ''})`);

    return {
      success: true,
      articleCount: articles.length,
      newCount,
      updateCount,
      failedCount
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================
// B站视频信息 API 调用（获取封面）
// ============================================================
async function getBilibiliVideoCover(bvid) {
  try {
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const response = await httpRequest(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/',
      },
    });

    if (response.status === 200) {
      const data = JSON.parse(response.body);
      if (data.code === 0 && data.data && data.data.pic) {
        // 将 HTTP 协议转换为 HTTPS
        let coverUrl = data.data.pic;
        if (coverUrl.startsWith('http://')) {
          coverUrl = coverUrl.replace('http://', 'https://');
        }
        return coverUrl;
      }
    }
  } catch (error) {
    // 静默失败，不影响主流程
    console.log(`     [封面获取失败]: ${error.message}`);
  }
  return '';
}

// ============================================================
// RSS 解析函数（从 RSS 中直接提取图片）
// ============================================================
function parseRSSFeed(xmlText, authorName) {
  const articles = [];

  try {
    // 提取所有 <item> 标签
    const itemPattern = /<item>([\s\S]*?)<\/item>/g;
    const items = xmlText.match(itemPattern);

    if (!items) return articles;

    console.log(`   [RSS Parser] 找到 ${items.length} 个 item，开始解析...`);

    for (let i = 0; i < items.length && i < 5; i++) {
      const item = items[i];

      try {
        // 🔍 调试：打印第一个 item 的完整内容
        if (i === 0) {
          console.log('\n   📋 [DEBUG] 第一个 RSS item 完整内容:');
          console.log('   ' + '='.repeat(70));
          // 只打印前 2000 字符避免输出过长
          const preview = item.length > 2000 ? item.substring(0, 2000) + '...[截断]' : item;
          console.log(preview);
          console.log('   ' + '='.repeat(70) + '\n');
        }

        // 提取标题（支持 CDATA 和普通格式）
        let title = '';
        const titleCDATAMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        const titlePlainMatch = item.match(/<title>(.*?)<\/title>/);

        if (titleCDATAMatch) {
          title = titleCDATAMatch[1];
        } else if (titlePlainMatch) {
          title = titlePlainMatch[1];
        }

        // 提取链接
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const link = linkMatch ? linkMatch[1] : '';

        // 提取描述（支持 CDATA 和普通格式）
        let description = '';
        let rawDescription = ''; // 保存原始 HTML，用于提取图片
        const descCDATAMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s);
        const descPlainMatch = item.match(/<description>(.*?)<\/description>/s);

        if (descCDATAMatch) {
          rawDescription = descCDATAMatch[1];
          description = rawDescription.replace(/<[^>]*>/g, '').substring(0, 200);
        } else if (descPlainMatch) {
          rawDescription = descPlainMatch[1];
          description = rawDescription.replace(/<[^>]*>/g, '').substring(0, 200);
        }

        // 提取发布日期
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

        // 从链接提取视频ID作为文章ID
        const videoIdMatch = link.match(/\/video\/(BV[a-zA-Z0-9]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';
        const id = `bilibili-${videoId}`;

        // 🖼️ 尝试从 RSS 中提取图片（多种可能的字段）
        let thumbnail = '';

        // 方式1: <enclosure> 标签（常用于播客和视频RSS）
        const enclosureMatch = item.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/);
        if (enclosureMatch) {
          thumbnail = enclosureMatch[1];
          console.log(`   [图片] enclosure: ${thumbnail.substring(0, 60)}...`);
        }

        // 方式2: <media:thumbnail> 标签（Media RSS 规范）
        if (!thumbnail) {
          const mediaThumbnailMatch = item.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/);
          if (mediaThumbnailMatch) {
            thumbnail = mediaThumbnailMatch[1];
            console.log(`   [图片] media:thumbnail: ${thumbnail.substring(0, 60)}...`);
          }
        }

        // 方式3: <media:content> 标签
        if (!thumbnail) {
          const mediaContentMatch = item.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*type=["']image/);
          if (mediaContentMatch) {
            thumbnail = mediaContentMatch[1];
            console.log(`   [图片] media:content: ${thumbnail.substring(0, 60)}...`);
          }
        }

        // 方式4: <itunes:image> 标签
        if (!thumbnail) {
          const itunesImageMatch = item.match(/<itunes:image[^>]*href=["']([^"']+)["'][^>]*>/);
          if (itunesImageMatch) {
            thumbnail = itunesImageMatch[1];
            console.log(`   [图片] itunes:image: ${thumbnail.substring(0, 60)}...`);
          }
        }

        // 方式5: description 中的 <img> 标签或 style 属性（需要先解码 HTML 实体）
        if (!thumbnail && rawDescription) {
          // 解码 HTML 实体
          const decodedDesc = rawDescription
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');

          // 5a. 提取第一个 img 标签的 src
          const imgMatch = decodedDesc.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/);
          if (imgMatch) {
            thumbnail = imgMatch[1];
            console.log(`   [图片] description img src: ${thumbnail.substring(0, 60)}...`);
          }

          // 5b. 提取 style 属性中的 background-image: url(...)
          if (!thumbnail) {
            const styleMatch = decodedDesc.match(/style=["'][^"']*background-image:\s*url\(["']?([^"')]+)["']?\)/);
            if (styleMatch) {
              thumbnail = styleMatch[1];
              console.log(`   [图片] description style background-image: ${thumbnail.substring(0, 60)}...`);
            }
          }
        }

        // 如果没有找到图片
        if (!thumbnail) {
          console.log(`   [图片] ⚠️  未找到图片字段`);
        }

        // 保存文章
        if (title && link && videoId) {
          articles.push({
            id,
            title,
            description,
            link,
            thumbnail,  // 从 RSS 提取的图片
            platform: 'B站',
            author: authorName,
            category: '视频',
            publishedAt,
            fetchedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('   [RSS Parser] 解析文章项失败:', error.message);
      }
    }

    console.log(`   [RSS Parser] 成功解析 ${articles.length} 篇文章\n`);
  } catch (error) {
    console.error('[RSS Parser] 解析RSS失败:', error.message);
  }

  return articles;
}

// ============================================================
// 延迟函数
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  let client;

  try {
    console.log('🚀 B站数据智能抓取脚本（优化版：一次请求+立即保存）');
    console.log('='.repeat(60));
    console.log(`RSSHub: ${CONFIG.RSSHUB_URL}`);
    console.log(`初始间隔: ${CONFIG.INITIAL_INTERVAL / 1000}秒`);
    console.log(`最大重试: ${CONFIG.MAX_RETRIES}次`);
    console.log(`UP主数量: ${CONFIG.UP_MASTERS.length}`);
    console.log('='.repeat(60));
    console.log('');

    // 连接数据库
    console.log('💾 连接数据库...');
    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    const db = client.db();
    const collection = db.collection('articles');  // 使用articles集合
    console.log('✅ 数据库已连接\n');

    // 初始化追踪器
    const tracker = new UPMasterTracker(CONFIG.UP_MASTERS);

    let round = 0;
    let currentInterval = CONFIG.INITIAL_INTERVAL;

    while (tracker.hasPending() && round < CONFIG.MAX_RETRIES) {
      round++;
      const pending = tracker.getPending();

      console.log(`\n🔄 第 ${round} 轮尝试 (间隔: ${currentInterval / 1000}秒)`);
      console.log(`待处理: ${pending.map(up => up.name).join(', ')}`);
      console.log('-'.repeat(60));

      for (const up of pending) {
        console.log(`\n[${up.name}] 开始抓取并保存...`);

        try {
          // 一次请求完成：获取RSS + 解析 + 保存
          const result = await fetchAndSaveUPMaster(up, collection);

          console.log(`✅ [${up.name}] 成功！`);
          tracker.markSuccess(up.uid, result); // 保存结果统计
        } catch (error) {
          const errorMsg = error.message || '未知错误';
          console.log(`❌ [${up.name}] 失败: ${errorMsg}`);

          const shouldRetry = tracker.markRetry(up.uid, errorMsg);
          if (!shouldRetry) {
            console.log(`⚠️  [${up.name}] 已达最大重试次数，放弃`);
          }
        }

        // 同一轮内的UP主之间也要间隔
        if (pending.indexOf(up) < pending.length - 1) {
          // 添加随机波动，避免规律性被检测
          const randomOffset = Math.floor(Math.random() * CONFIG.RANDOM_OFFSET * 2) - CONFIG.RANDOM_OFFSET;
          const actualInterval = currentInterval + randomOffset;
          console.log(`⏱️  等待 ${(actualInterval / 1000).toFixed(1)} 秒...`);
          await sleep(actualInterval);
        }
      }

      // 如果还有待处理的，准备下一轮
      if (tracker.hasPending()) {
        // 递增间隔时间，但不超过最大值
        const nextInterval = currentInterval * CONFIG.INTERVAL_MULTIPLIER;
        currentInterval = Math.min(nextInterval, CONFIG.MAX_INTERVAL);

        // 添加随机波动
        const randomOffset = Math.floor(Math.random() * CONFIG.RANDOM_OFFSET * 2) - CONFIG.RANDOM_OFFSET;
        const actualInterval = currentInterval + randomOffset;

        console.log(`\n📊 当前状态: 成功 ${tracker.succeeded.length} | 待处理 ${tracker.getPending().length} | 失败 ${tracker.failed.length}`);
        console.log(`⏱️  等待 ${(actualInterval / 1000).toFixed(1)} 秒后开始下一轮...`);
        await sleep(actualInterval);
      }
    }

    // 打印最终报告
    tracker.printReport();

    // 汇总保存统计
    const totalStats = tracker.succeeded.reduce((acc, up) => ({
      new: (acc.new || 0) + (up.saveResult?.newCount || 0),
      updated: (acc.updated || 0) + (up.saveResult?.updateCount || 0),
      failed: (acc.failed || 0) + (up.saveResult?.failedCount || 0),
    }), {});

    console.log('\n' + '='.repeat(60));
    console.log('💾 数据保存汇总');
    console.log('='.repeat(60));
    console.log(`新增文章: ${totalStats.new || 0} 篇`);
    console.log(`更新文章: ${totalStats.updated || 0} 篇`);
    console.log(`失败文章: ${totalStats.failed || 0} 篇`);
    console.log('='.repeat(60));

    console.log('\n✨ 脚本执行完成！\n');

    // 返回退出码
    process.exit(tracker.failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ 脚本执行出错:', error);
    process.exit(1);
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
  main().catch(error => {
    console.error('\n❌ 脚本执行出错:', error);
    process.exit(1);
  });
}

module.exports = { fetchAndSaveUPMaster, UPMasterTracker, parseRSSFeed };
