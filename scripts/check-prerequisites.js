/**
 * B站数据抓取预检查脚本
 *
 * 功能：
 * - 检查环境变量配置
 * - 验证 MongoDB 连接
 * - 测试 RSSHub 服务
 * - 检查 B站 Cookie 有效性
 * - 生成详细的检查报告
 *
 * 使用方法：
 *   node scripts/check-prerequisites.js
 *
 * 也可以从其他脚本导入使用：
 *   const { checkPrerequisites } = require('./check-prerequisites');
 *   const result = await checkPrerequisites();
 *   if (!result.passed) { ... }
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
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://47.99.202.3:27017/tftblog',
  RSSHUB_URL: 'http://localhost:1200',
  BILIBILI_COOKIE: process.env.BILIBILI_COOKIE || '',
  TEST_UP_MASTER: { uid: '18343134', name: '林小北Lindo' }, // 用于测试的UP主
};

// ============================================================
// HTTP 请求辅助函数
// ============================================================
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const headers = { ...options.headers };

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
// 预检查主函数
// ============================================================
async function checkPrerequisites() {
  const results = {
    passed: true,
    checks: [],
    timestamp: new Date().toISOString(),
  };

  function addCheck(name, passed, message, details = null) {
    results.checks.push({ name, passed, message, details });
    if (!passed && !message.includes('⚠️')) {
      results.passed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔍 B站数据抓取 - 环境预检查');
  console.log('='.repeat(60));
  console.log(`检查时间: ${new Date().toLocaleString('zh-CN')}`);

  // ============================================================
  // 1. 环境变量检查
  // ============================================================
  console.log('\n[1/5] 检查环境变量...');
  const hasMongoUri = !!CONFIG.MONGODB_URI;
  const hasCookie = !!CONFIG.BILIBILI_COOKIE;

  addCheck('MONGODB_URI', hasMongoUri,
    hasMongoUri ? `✅ 已配置: ${CONFIG.MONGODB_URI.replace(/\/\/.*@/, '//***@')}` : '❌ 未配置');
  addCheck('BILIBILI_COOKIE', hasCookie,
    hasCookie ? `✅ 已配置 (长度: ${CONFIG.BILIBILI_COOKIE.length} 字符)` : '❌ 未配置');

  if (!hasMongoUri || !hasCookie) {
    console.log('   ❌ 环境变量缺失，请检查 .env.local 文件');
    return results;
  }
  console.log('   ✅ 环境变量完整');

  // ============================================================
  // 2. MongoDB 连接检查
  // ============================================================
  console.log('\n[2/5] 检查 MongoDB 连接...');
  let mongoClient;
  try {
    mongoClient = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    const db = mongoClient.db();

    addCheck('MongoDB 连接', true, `✅ 已连接: ${db.databaseName}`);
    console.log(`   ✅ 数据库连接成功: ${db.databaseName}`);

    // 检查集合
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    const hasArticles = collectionNames.includes('articles');

    addCheck('articles 集合', hasArticles,
      hasArticles ? '✅ 集合存在' : '⚠️  集合不存在（将自动创建）',
      { collections: collectionNames });

    if (hasArticles) {
      const count = await db.collection('articles').countDocuments();
      const platformStats = await db.collection('articles').aggregate([
        { $group: { _id: '$platform', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      console.log(`   ✅ articles 集合存在 (当前 ${count} 条记录)`);
      if (platformStats.length > 0) {
        console.log('      平台分布:', platformStats.map(s => `${s._id}: ${s.count}`).join(', '));
      }

      addCheck('数据统计', true, `✅ 当前记录数: ${count}`,
        { totalRecords: count, platformStats });
    } else {
      console.log('   ⚠️  articles 集合不存在（首次运行时将自动创建）');
    }

    await mongoClient.close();
  } catch (error) {
    addCheck('MongoDB 连接', false, `❌ 连接失败: ${error.message}`);
    console.log(`   ❌ 数据库连接失败: ${error.message}`);
    if (mongoClient) await mongoClient.close();
    return results;
  }

  // ============================================================
  // 3. RSSHub 服务检查
  // ============================================================
  console.log('\n[3/5] 检查 RSSHub 服务...');
  try {
    const response = await httpRequest(CONFIG.RSSHUB_URL, { timeout: 5000 });
    const isRunning = response.status === 200;

    addCheck('RSSHub 服务', isRunning,
      isRunning ? `✅ 运行中: ${CONFIG.RSSHUB_URL}` : `❌ 服务异常 (HTTP ${response.status})`);

    if (isRunning) {
      console.log(`   ✅ RSSHub 服务正常: ${CONFIG.RSSHUB_URL}`);
    } else {
      console.log(`   ❌ RSSHub 服务异常 (HTTP ${response.status})`);
      console.log('      提示: 请确保 RSSHub 已启动，使用命令: docker ps 查看容器状态');
      return results;
    }
  } catch (error) {
    addCheck('RSSHub 服务', false, `❌ 无法访问: ${error.message}`);
    console.log(`   ❌ RSSHub 服务不可用: ${error.message}`);
    console.log('      提示: 请先启动 RSSHub 服务');
    return results;
  }

  // ============================================================
  // 4. RSSHub B站路由测试
  // ============================================================
  console.log('\n[4/5] 测试 RSSHub B站路由...');
  try {
    const testUrl = `${CONFIG.RSSHUB_URL}/bilibili/user/video/${CONFIG.TEST_UP_MASTER.uid}`;
    console.log(`   测试UP主: ${CONFIG.TEST_UP_MASTER.name} (UID: ${CONFIG.TEST_UP_MASTER.uid})`);

    const response = await httpRequest(testUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': CONFIG.BILIBILI_COOKIE,
      }
    });

    const isXml = (response.headers['content-type'] || '').includes('xml');
    const routeWorks = response.status === 200 && isXml;

    // 检查是否是风控错误
    if (response.status === 503 && (response.body.includes('风控') || response.body.includes('-352'))) {
      addCheck('B站路由测试', false, `❌ B站风控 (-352)，需要更换IP或使用代理`);
      console.log(`   ❌ 遇到B站风控 (-352)`);
      console.log('      建议: 1) 更换代理IP  2) 增加请求间隔  3) 更新Cookie');
      return results;
    }

    addCheck('B站路由测试', routeWorks,
      routeWorks ? `✅ 路由正常` : `❌ 路由异常 (HTTP ${response.status})`);

    if (routeWorks) {
      // 简单解析RSS，统计文章数
      const itemMatches = response.body.match(/<item>/g);
      const articleCount = itemMatches ? itemMatches.length : 0;
      console.log(`   ✅ RSSHub B站路由正常 (获取到 ${articleCount} 个视频)`);
    } else {
      console.log(`   ❌ RSSHub B站路由异常 (HTTP ${response.status})`);
    }
  } catch (error) {
    addCheck('B站路由测试', false, `❌ 测试失败: ${error.message}`);
    console.log(`   ❌ RSSHub B站路由测试失败: ${error.message}`);
  }

  // ============================================================
  // 5. B站 Cookie 有效性检查
  // ============================================================
  console.log('\n[5/5] 检查 B站 Cookie 有效性...');
  try {
    const testUrl = 'https://api.bilibili.com/x/web-interface/nav';
    const response = await httpRequest(testUrl, {
      timeout: 10000,
      headers: {
        'Cookie': CONFIG.BILIBILI_COOKIE,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    let cookieValid = false;
    let username = '未知';
    let isLogin = false;

    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        isLogin = data.code === 0 && data.data && data.data.isLogin;
        cookieValid = isLogin;
        if (isLogin) {
          username = data.data.uname || '未知';
        }
      } catch (e) {
        console.log('   ⚠️  解析B站响应失败');
      }
    }

    // Cookie 过期是警告，不是致命错误
    addCheck('Cookie 有效性', true,
      cookieValid ? `✅ Cookie 有效 (用户: ${username})` :
                   '⚠️  Cookie 可能已过期（RSSHub 仍可获取公开数据）',
      { isValid: cookieValid, username });

    if (cookieValid) {
      console.log(`   ✅ B站 Cookie 有效 (登录用户: ${username})`);
    } else {
      console.log('   ⚠️  B站 Cookie 可能已过期');
      console.log('      影响: 可能无法获取部分受限内容');
      console.log('      建议: 从浏览器更新Cookie（不影响大部分公开视频的抓取）');
    }
  } catch (error) {
    addCheck('Cookie 有效性', true, `⚠️  检查失败: ${error.message}`);
    console.log(`   ⚠️  无法验证 Cookie (${error.message})`);
    console.log('      不影响基本功能，RSSHub 仍可获取公开数据');
  }

  // ============================================================
  // 打印最终汇总
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 预检查结果汇总');
  console.log('='.repeat(60));

  const passed = results.checks.filter(c => c.passed).length;
  const failed = results.checks.filter(c => !c.passed).length;
  const warnings = results.checks.filter(c => !c.passed && c.message.includes('⚠️')).length;
  const criticalFailed = failed - warnings;

  console.log(`✅ 通过: ${passed}/${results.checks.length}`);
  console.log(`❌ 失败: ${criticalFailed}/${results.checks.length}`);
  console.log(`⚠️  警告: ${warnings}/${results.checks.length}`);

  console.log('\n详细检查项:');
  results.checks.forEach((check, index) => {
    const icon = check.passed ? '✅' : (check.message.includes('⚠️') ? '⚠️ ' : '❌');
    console.log(`${index + 1}. [${icon}] ${check.name}`);
    console.log(`   ${check.message}`);
  });

  console.log('\n' + '='.repeat(60));

  if (results.passed) {
    console.log('✅ 所有关键检查通过，可以开始抓取！');
    console.log('\n运行抓取命令:');
    console.log('   node scripts/smart-fetch-bilibili.js');
  } else {
    console.log('❌ 存在关键问题，请修复后再运行');
    console.log('\n常见问题解决:');
    console.log('1. MongoDB 连接失败 → 检查数据库服务是否运行');
    console.log('2. RSSHub 不可用 → 启动 RSSHub: docker start <container-id>');
    console.log('3. B站风控 (-352) → 更换代理IP或增加请求间隔');
    console.log('4. Cookie 过期 → 从浏览器更新 BILIBILI_COOKIE 环境变量');
  }

  console.log('='.repeat(60));
  console.log('');

  return results;
}

// ============================================================
// 延迟函数
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 主执行
// ============================================================
async function main() {
  try {
    const result = await checkPrerequisites();

    // 返回适当的退出码
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ 预检查过程出错:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他脚本使用
module.exports = { checkPrerequisites };
