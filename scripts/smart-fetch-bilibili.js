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

const http = require('http');
const https = require('https');

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  // RSSHub 实例地址
  RSSHUB_URL: 'http://localhost:1200',

  // UP主列表（按粉丝数排序，大V在前可能有优势）
  UP_MASTERS: [
    { uid: '18343134', name: '林小北Lindo', fans: '186万' },
    { uid: '388063772', name: 'GoDlike_神超', fans: '84.46万' },
    { uid: '262943792', name: '手刃猫咪', fans: '15.69万' },
  ],

  // 重试配置
  INITIAL_INTERVAL: 15000,    // 初始间隔：15秒
  MAX_RETRIES: 10,             // 最大重试次数
  INTERVAL_MULTIPLIER: 2,      // 间隔倍增系数

  // API配置
  API_URL: 'http://localhost:3000/api/feeds/refresh-single',
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

  markSuccess(uid) {
    const index = this.pending.findIndex(up => up.uid === uid);
    if (index !== -1) {
      const up = this.pending.splice(index, 1)[0];
      this.succeeded.push({
        ...up,
        finalRetries: up.retries,
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

    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
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
// RSSHub API 调用
// ============================================================
async function fetchUPMaster(uid) {
  const url = `${CONFIG.RSSHUB_URL}/bilibili/user/video/${uid}`;

  try {
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

    return { success: true };
  } catch (error) {
    throw error;
  }
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
  console.log('🚀 B站数据智能抓取脚本');
  console.log('='.repeat(60));
  console.log(`RSSHub: ${CONFIG.RSSHUB_URL}`);
  console.log(`初始间隔: ${CONFIG.INITIAL_INTERVAL / 1000}秒`);
  console.log(`最大重试: ${CONFIG.MAX_RETRIES}次`);
  console.log(`UP主数量: ${CONFIG.UP_MASTERS.length}`);
  console.log('='.repeat(60));
  console.log('');

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
      console.log(`\n[${up.name}] 开始抓取...`);

      try {
        await fetchUPMaster(up.uid);
        console.log(`✅ [${up.name}] 成功！`);
        tracker.markSuccess(up.uid);
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
        console.log(`⏱️  等待 ${currentInterval / 1000} 秒...`);
        await sleep(currentInterval);
      }
    }

    // 如果还有待处理的，准备下一轮
    if (tracker.hasPending()) {
      // 递增间隔时间
      currentInterval *= CONFIG.INTERVAL_MULTIPLIER;

      console.log(`\n📊 当前状态: 成功 ${tracker.succeeded.length} | 待处理 ${tracker.getPending().length} | 失败 ${tracker.failed.length}`);
      console.log(`⏱️  等待 ${currentInterval / 1000} 秒后开始下一轮...`);
      await sleep(currentInterval);
    }
  }

  // 打印最终报告
  tracker.printReport();

  // 如果全部成功，调用API保存数据
  if (tracker.succeeded.length > 0) {
    console.log('\n💾 准备保存数据到数据库...');
    try {
      const response = await httpRequest('http://localhost:3000/api/feeds/refresh', {
        method: 'POST',
      });

      if (response.status === 200) {
        const result = JSON.parse(response.body);
        console.log('✅ 数据已保存到数据库');
        console.log(`   新增: ${result.stats.new} 篇`);
        console.log(`   更新: ${result.stats.updated} 篇`);
      } else {
        console.log('⚠️  保存失败:', `HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️  保存出错:', error.message);
    }
  }

  console.log('\n✨ 脚本执行完成！\n');

  // 返回退出码
  process.exit(tracker.failed.length > 0 ? 1 : 0);
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

module.exports = { fetchUPMaster, UPMasterTracker };
