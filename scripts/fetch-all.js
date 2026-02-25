/**
 * 统一数据抓取脚本
 *
 * 功能：
 * - 串行执行所有数据抓取任务
 * - 支持 B站 (Bilibili)、抖音 (Douyin)、TFT Times、TFTips、YouTube 和 Tacter
 * - 支持指定平台抓取
 * - 汇总统计信息
 *
 * 使用方法：
 *   node scripts/fetch-all.js                    # 抓取所有平台
 *   node scripts/fetch-all.js TFTimes            # 仅抓取 TFTimes
 *   node scripts/fetch-all.js TFTimes,YouTube    # 抓取 TFTimes 和 YouTube
 */

const { spawn } = require('child_process');
const path = require('path');

// ============================================================
// 配置
// ============================================================
const ALL_SCRIPTS = [
  {
    name: 'TFTimes',
    path: path.join(__dirname, 'fetch-tftimes.js'),
    description: 'TFT Times 官网文章抓取',
  },
  {
    name: 'TFTips',
    path: path.join(__dirname, 'fetch-tftips.js'),
    description: 'TFTips 阵容推荐抓取',
  },
  {
    name: 'YouTube',
    path: path.join(__dirname, 'fetch-youtube.js'),
    description: 'YouTube 频道视频抓取',
  },
  {
    name: 'Tacter',
    path: path.join(__dirname, 'fetch-tacter.js'),
    description: 'Tacter 博主攻略抓取',
  },
  {
    name: 'Bilibili',
    path: path.join(__dirname, 'smart-fetch-bilibili.js'),
    description: 'B站UP主视频抓取',
  },
  {
    name: 'Douyin',
    path: path.join(__dirname, 'fetch-douyin.js'),
    description: '抖音账号视频抓取',
  },
];

// 解析命令行参数，过滤脚本
function getScriptsToRun() {
  const args = process.argv.slice(2);

  // 如果没有参数，运行所有脚本
  if (args.length === 0) {
    return ALL_SCRIPTS;
  }

  // 解析平台参数（支持逗号分隔）
  const platforms = args[0].split(',').map(p => p.trim());

  // 过滤脚本
  const scripts = ALL_SCRIPTS.filter(script =>
    platforms.includes(script.name)
  );

  if (scripts.length === 0) {
    console.error(`❌ 无效的平台参数: ${args[0]}`);
    console.error(`可用平台: ${ALL_SCRIPTS.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  return scripts;
}

// ============================================================
// 执行脚本函数
// ============================================================
function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 启动: ${script.name} (${script.description})`);
    console.log(`   脚本: ${script.path}`);
    console.log('-'.repeat(60));

    const child = spawn('node', [script.path], {
      stdio: 'inherit', // 继承父进程的输入输出
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('-'.repeat(60));
        console.log(`✅ ${script.name} 执行完成`);
        resolve({ name: script.name, success: true, code });
      } else {
        console.log('-'.repeat(60));
        console.log(`❌ ${script.name} 执行失败 (退出码: ${code})`);
        resolve({ name: script.name, success: false, code });
      }
    });

    child.on('error', (error) => {
      console.error(`❌ ${script.name} 执行出错:`, error.message);
      reject({ name: script.name, success: false, error: error.message });
    });
  });
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  const SCRIPTS = getScriptsToRun();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          TFT Blog - 统一数据抓取脚本                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`⏰ 开始时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`📋 任务数量: ${SCRIPTS.length}`);
  console.log(`🎯 平台列表: ${SCRIPTS.map(s => s.name).join(', ')}`);
  console.log('');

  const startTime = Date.now();
  const results = [];

  // 串行执行脚本（避免资源竞争）
  for (const script of SCRIPTS) {
    try {
      const result = await runScript(script);
      results.push(result);
    } catch (error) {
      results.push(error);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // 打印汇总报告
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    执行汇总报告                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`⏱️  总耗时: ${duration} 秒`);
  console.log(`⏰ 结束时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');

  // 统计
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log('📊 执行结果:');
  console.log(`   ✅ 成功: ${successCount}`);
  console.log(`   ❌ 失败: ${failureCount}`);
  console.log('');

  // 详细结果
  console.log('📋 任务详情:');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? '成功' : `失败 (退出码: ${result.code || 'N/A'})`;
    console.log(`   ${index + 1}. ${icon} ${result.name}: ${status}`);
  });

  console.log('');
  console.log('═'.repeat(60));

  // 退出码：所有成功则为0，有失败则为1
  const exitCode = failureCount > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log('✨ 所有任务执行完成！');
  } else {
    console.log('⚠️  部分任务执行失败，请检查日志');
  }

  console.log('═'.repeat(60));
  console.log('');

  process.exit(exitCode);
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

module.exports = { main };
