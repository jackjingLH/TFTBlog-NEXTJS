/**
 * YouTube 数据智能抓取脚本
 *
 * 功能：
 * - 通过 RSSHub 抓取 YouTube 频道最新视频
 * - 自动重试失败的频道
 * - 动态递增间隔时间（15s → 30s → 60s → 120s...）
 * - 成功的频道自动移除
 * - 最多重试10次
 *
 * 使用方法：
 *   node scripts/fetch-youtube.js
 *
 * 依赖：
 *   - RSSHub 实例运行在 http://localhost:1200
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

  // YouTube 频道列表（从数据库读取）
  YOUTUBE_CHANNELS: [],  // 不再使用硬编码，从数据库 sources 集合读取

  // 重试配置
  INITIAL_INTERVAL: 15000,    // 初始间隔：15秒
  MAX_RETRIES: 10,             // 最大重试次数
  INTERVAL_MULTIPLIER: 2,      // 间隔倍增系数
  MAX_INTERVAL: 60000,         // 最大间隔：60秒
  RANDOM_OFFSET: 2000,         // 随机波动：±2秒
  API_TIMEOUT: 30000,          // API超时：30秒
};

// ============================================================
// 从数据库加载 YouTube 频道配置
// ============================================================
async function loadYouTubeChannels() {
  let client;

  try {
    console.log('📋 从数据库加载 YouTube 频道配置...');

    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const db = client.db();
    const collection = db.collection('sources');

    const sources = await collection.find({
      platform: 'YouTube',
      enabled: true
    }).toArray();

    await client.close();

    if (sources.length === 0) {
      console.log('⚠️  数据库中没有启用的 YouTube 频道');
      console.log('   请在管理后台添加 YouTube 频道配置');
      return [];
    }

    console.log(`✅ 成功加载 ${sources.length} 个 YouTube 频道配置`);

    // 转换为脚本需要的格式
    return sources.map(source => ({
      type: source.youtube.type,
      id: source.youtube.id,
      name: source.name,
      fans: source.youtube.fans || '未知',
      description: source.youtube.description || ''
    }));
  } catch (error) {
    console.error('');
    console.error('❌ 从数据库加载频道配置失败:');
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
// 频道状态管理
// ============================================================
class ChannelTracker {
  constructor(channels) {
    this.pending = channels.map(ch => ({
      ...ch,
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

  markSuccess(channelId, saveResult = null) {
    const index = this.pending.findIndex(ch => ch.id === channelId);
    if (index !== -1) {
      const channel = this.pending.splice(index, 1)[0];
      this.succeeded.push({
        ...channel,
        finalRetries: channel.retries,
        saveResult,
      });
      return true;
    }
    return false;
  }

  markRetry(channelId, error) {
    const channel = this.pending.find(ch => ch.id === channelId);
    if (channel) {
      channel.retries++;
      channel.lastError = error;
      channel.attemptTimes.push(new Date());

      // 超过最大重试次数，移到失败列表
      if (channel.retries >= CONFIG.MAX_RETRIES) {
        const index = this.pending.findIndex(ch => ch.id === channelId);
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
    console.log(`\n总计: ${stats.total} 个频道`);
    console.log(`✅ 成功: ${stats.succeeded}`);
    console.log(`❌ 失败: ${stats.failed}`);
    console.log(`⏳ 待处理: ${stats.pending}`);

    if (this.succeeded.length > 0) {
      console.log('\n✅ 成功列表:');
      this.succeeded.forEach((ch, i) => {
        const retryInfo = ch.finalRetries > 0 ? ` (重试${ch.finalRetries}次)` : '';
        console.log(`  ${i + 1}. ${ch.name} (${ch.fans})${retryInfo}`);
      });
    }

    if (this.failed.length > 0) {
      console.log('\n❌ 失败列表:');
      this.failed.forEach((ch, i) => {
        console.log(`  ${i + 1}. ${ch.name} (${ch.fans})`);
        console.log(`     原因: ${ch.reason}`);
        console.log(`     重试次数: ${ch.retries}/${CONFIG.MAX_RETRIES}`);
        console.log(`     最后错误: ${ch.lastError}`);
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

    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      },
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
// RSSHub API 调用 + 立即保存
// ============================================================
async function fetchAndSaveChannel(channel, collection) {
  // 根据频道类型构建 RSSHub URL
  const rssPath = channel.type === 'channel'
    ? `/youtube/channel/${channel.id}`
    : `/youtube/user/${channel.id}`;

  const url = `${CONFIG.RSSHUB_URL}${rssPath}`;

  try {
    // 1. 从 RSSHub 获取数据
    const response = await httpRequest(url, {
      timeout: CONFIG.API_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 验证是否是有效的 RSS/XML
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('xml') && !contentType.includes('rss')) {
      // YouTube 的 RSS 可能没有正确的 content-type，检查 body
      if (!response.body.includes('<rss') && !response.body.includes('<feed')) {
        throw new Error('无效的响应格式');
      }
    }

    // 2. 解析 RSS 数据
    const videos = parseYouTubeRSS(response.body, channel.name);
    if (videos.length === 0) {
      console.log(`   ⚠️  ${channel.name}: 未找到视频`);
      return { success: true, videoCount: 0, newCount: 0, updateCount: 0 };
    }

    // 3. 立即保存到数据库
    let newCount = 0;
    let updateCount = 0;
    let failedCount = 0;

    for (const video of videos) {
      try {
        const existingArticle = await collection.findOne({ id: video.id });
        const isNew = !existingArticle;

        await collection.updateOne(
          { id: video.id },
          { $set: video },
          { upsert: true }
        );

        if (isNew) {
          newCount++;
        } else {
          updateCount++;
        }
      } catch (error) {
        console.error(`   ❌ 保存失败 [${video.id}]:`, error.message);
        failedCount++;
      }
    }

    // 4. 显示保存结果
    console.log(`   ✅ 已保存: ${videos.length}个 (新增:${newCount} 更新:${updateCount}${failedCount > 0 ? ` 失败:${failedCount}` : ''})`);

    return {
      success: true,
      videoCount: videos.length,
      newCount,
      updateCount,
      failedCount,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================
// YouTube RSS 解析函数（支持 RSS 2.0 和 Atom 格式）
// ============================================================
function parseYouTubeRSS(xmlText, channelName) {
  const videos = [];

  try {
    // 检测格式：RSS 2.0 使用 <item>，Atom 使用 <entry>
    const isRSS = xmlText.includes('<item>');
    const isAtom = xmlText.includes('<entry>');

    let items = [];

    if (isRSS) {
      // RSS 2.0 格式
      const itemPattern = /<item>([\s\S]*?)<\/item>/g;
      const matches = xmlText.match(itemPattern);
      if (matches) items = matches;
    } else if (isAtom) {
      // Atom 格式
      const entryPattern = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
      const matches = xmlText.match(entryPattern);
      if (matches) items = matches;
    }

    if (!items || items.length === 0) {
      return videos;
    }

    for (const item of items) {
      try {
        let videoId = '';
        let title = '';
        let link = '';
        let description = '';
        let publishedAt = new Date();
        let thumbnail = '';

        if (isRSS) {
          // RSS 2.0 格式解析
          const videoIdMatch = item.match(/<guid[^>]*>(.*?)<\/guid>/) ||
                              item.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
          if (videoIdMatch) {
            // 从 URL 中提取视频 ID
            const urlMatch = videoIdMatch[1].match(/watch\?v=([a-zA-Z0-9_-]+)/);
            videoId = urlMatch ? urlMatch[1] : videoIdMatch[1];
          }

          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                            item.match(/<title>(.*?)<\/title>/);
          if (titleMatch) {
            title = titleMatch[1]
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
          }

          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          if (linkMatch) {
            link = linkMatch[1];
          }

          const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s) ||
                           item.match(/<description>(.*?)<\/description>/s);
          if (descMatch) {
            description = descMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .substring(0, 200);
          }

          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
          if (pubDateMatch) {
            publishedAt = new Date(pubDateMatch[1]);
          }

          const thumbnailMatch = item.match(/<media:thumbnail[^>]*url="([^"]*)"/);
          if (thumbnailMatch) {
            thumbnail = thumbnailMatch[1];
          }

        } else {
          // Atom 格式解析
          const videoIdMatch = item.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
          if (videoIdMatch) videoId = videoIdMatch[1];

          const titleMatch = item.match(/<title>(.*?)<\/title>/);
          if (titleMatch) {
            title = titleMatch[1]
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
          }

          const linkMatch = item.match(/<link[^>]*href="([^"]*)"/);
          if (linkMatch) link = linkMatch[1];

          const descMatch = item.match(/<media:description>(.*?)<\/media:description>/s);
          if (descMatch) {
            description = descMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .substring(0, 200);
          }

          const pubDateMatch = item.match(/<published>(.*?)<\/published>/);
          if (pubDateMatch) publishedAt = new Date(pubDateMatch[1]);

          const thumbnailMatch = item.match(/<media:thumbnail[^>]*url="([^"]*)"/);
          if (thumbnailMatch) thumbnail = thumbnailMatch[1];
        }

        // 构建文章 ID
        const id = `youtube-${videoId}`;

        if (title && link && videoId) {
          videos.push({
            id,
            title,
            description,
            link,
            thumbnail,
            platform: 'YouTube',
            author: channelName,
            category: '视频',
            publishedAt,
            fetchedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('[RSS Parser] 解析视频项失败:', error.message);
      }
    }
  } catch (error) {
    console.error('[RSS Parser] 解析 RSS 失败:', error.message);
  }

  // 只返回最新的 5 个视频
  return videos.slice(0, 5);
}

// ============================================================
// 延迟函数
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 测试模式：只抓取不保存
// ============================================================
async function testMode() {
  try {
    console.log('🚀 YouTube 测试模式抓取（不保存数据库）');
    console.log('='.repeat(60));
    console.log(`RSSHub: ${CONFIG.RSSHUB_URL}`);
    console.log(`频道数量: ${CONFIG.YOUTUBE_CHANNELS.length}`);
    console.log('='.repeat(60));
    console.log('');

    const allResults = [];

    // 逐个处理频道（无重试）
    for (let i = 0; i < CONFIG.YOUTUBE_CHANNELS.length; i++) {
      const channel = CONFIG.YOUTUBE_CHANNELS[i];

      console.log(`\n[${i + 1}/${CONFIG.YOUTUBE_CHANNELS.length}] ${channel.name}`);
      console.log('-'.repeat(60));

      // 构建 RSSHub URL
      const rssPath = channel.type === 'channel'
        ? `/youtube/channel/${channel.id}`
        : `/youtube/user/${channel.id}`;

      const url = `${CONFIG.RSSHUB_URL}${rssPath}`;

      try {
        console.log(`📡 请求: ${url}`);

        // 获取数据
        const response = await httpRequest(url, {
          timeout: CONFIG.API_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        console.log(`   HTTP 状态: ${response.status}`);

        if (response.status !== 200) {
          // 打印错误响应内容（调试用）
          if (response.body) {
            console.log(`   响应内容预览: ${response.body.substring(0, 200)}...`);
          }
          throw new Error(`HTTP ${response.status}`);
        }

        // 调试：打印原始响应的前500字符
        console.log(`   响应预览: ${response.body.substring(0, 300)}...\n`);

        // 解析数据
        const videos = parseYouTubeRSS(response.body, channel.name);

        console.log(`   ✅ 成功解析: ${videos.length} 个视频\n`);

        // 打印视频详情
        if (videos.length > 0) {
          console.log('   📹 视频列表:');
          videos.forEach((video, index) => {
            console.log(`\n   ${index + 1}. ${video.title}`);
            console.log(`      ID: ${video.id}`);
            console.log(`      链接: ${video.link}`);
            console.log(`      发布: ${video.publishedAt.toLocaleString('zh-CN')}`);
            console.log(`      描述: ${video.description.substring(0, 80)}...`);
            if (video.thumbnail) {
              console.log(`      缩略图: ${video.thumbnail}`);
            }
          });
        }

        allResults.push({
          channel: channel.name,
          success: true,
          videoCount: videos.length,
          videos,
        });

      } catch (error) {
        console.log(`   ❌ 失败: ${error.message}\n`);

        allResults.push({
          channel: channel.name,
          success: false,
          error: error.message,
        });
      }

      // 频道之间间隔（如果不是最后一个）
      if (i < CONFIG.YOUTUBE_CHANNELS.length - 1) {
        console.log(`\n⏱️  等待 5 秒后处理下一个频道...\n`);
        await sleep(5000);
      }
    }

    // 打印汇总报告
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    测试结果汇总                            ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    const successCount = allResults.filter(r => r.success).length;
    const failureCount = allResults.filter(r => !r.success).length;
    const totalVideos = allResults.reduce((sum, r) => sum + (r.videoCount || 0), 0);

    console.log(`📊 成功: ${successCount}/${CONFIG.YOUTUBE_CHANNELS.length} 个频道`);
    console.log(`❌ 失败: ${failureCount}/${CONFIG.YOUTUBE_CHANNELS.length} 个频道`);
    console.log(`📹 总视频数: ${totalVideos} 个`);
    console.log('');

    console.log('═'.repeat(60));
    console.log('✨ 测试完成！（未保存到数据库）');
    console.log('═'.repeat(60));
    console.log('');

    // 返回退出码
    process.exit(failureCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 测试模式执行出错:', error);
    process.exit(1);
  }
}

// ============================================================
// 主函数（生产模式：保存到数据库）
// ============================================================
async function main() {
  let client;

  try {
    console.log('🚀 YouTube 数据抓取');
    console.log('');

    // 从数据库加载频道配置
    const channels = await loadYouTubeChannels();

    if (channels.length === 0) {
      console.log('⏹️  没有需要抓取的频道，退出');
      process.exit(0);
    }

    console.log('');

    // 连接数据库（用于保存文章）
    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    const db = client.db();
    const collection = db.collection('articles');

    // 初始化追踪器（使用数据库配置）
    const tracker = new ChannelTracker(channels);

    let round = 0;
    let currentInterval = CONFIG.INITIAL_INTERVAL;

    while (tracker.hasPending() && round < CONFIG.MAX_RETRIES) {
      round++;
      const pending = tracker.getPending();

      console.log(`\n🔄 第 ${round} 轮 - 待处理: ${pending.length} 个频道`);

      for (const channel of pending) {
        console.log(`\n[${channel.name}] 开始抓取并保存...`);

        try {
          // 一次请求完成：获取 RSS + 解析 + 保存
          const result = await fetchAndSaveChannel(channel, collection);

          console.log(`✅ [${channel.name}] 成功！`);
          tracker.markSuccess(channel.id, result);
        } catch (error) {
          const errorMsg = error.message || '未知错误';
          console.log(`❌ [${channel.name}] 失败: ${errorMsg}`);

          const shouldRetry = tracker.markRetry(channel.id, errorMsg);
          if (!shouldRetry) {
            console.log(`⚠️  [${channel.name}] 已达最大重试次数，放弃`);
          }
        }

        // 同一轮内的频道之间也要间隔
        if (pending.indexOf(channel) < pending.length - 1) {
          const randomOffset = Math.floor(Math.random() * CONFIG.RANDOM_OFFSET * 2) - CONFIG.RANDOM_OFFSET;
          const actualInterval = currentInterval + randomOffset;
          console.log(`⏱️  等待 ${(actualInterval / 1000).toFixed(1)} 秒...`);
          await sleep(actualInterval);
        }
      }

      // 如果还有待处理的，准备下一轮
      if (tracker.hasPending()) {
        const nextInterval = currentInterval * CONFIG.INTERVAL_MULTIPLIER;
        currentInterval = Math.min(nextInterval, CONFIG.MAX_INTERVAL);

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
    const totalStats = tracker.succeeded.reduce((acc, ch) => ({
      new: (acc.new || 0) + (ch.saveResult?.newCount || 0),
      updated: (acc.updated || 0) + (ch.saveResult?.updateCount || 0),
      failed: (acc.failed || 0) + (ch.saveResult?.failedCount || 0),
    }), {});

    console.log('\n' + '='.repeat(60));
    console.log('💾 数据保存汇总');
    console.log('='.repeat(60));
    console.log(`新增视频: ${totalStats.new || 0} 个`);
    console.log(`更新视频: ${totalStats.updated || 0} 个`);
    console.log(`失败视频: ${totalStats.failed || 0} 个`);
    console.log('='.repeat(60));

    console.log('\n✨ 脚本执行完成！\n');

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
  // 检查是否启用测试模式
  const TEST_MODE = process.env.TEST_MODE === 'true' || process.argv.includes('--test');

  if (TEST_MODE) {
    // 测试模式：只抓取不保存
    testMode().catch(error => {
      console.error('\n❌ 测试模式执行出错:', error);
      process.exit(1);
    });
  } else {
    // 生产模式：保存到数据库
    main().catch(error => {
      console.error('\n❌ 脚本执行出错:', error);
      process.exit(1);
    });
  }
}

module.exports = { fetchAndSaveChannel, ChannelTracker, parseYouTubeRSS, testMode };
