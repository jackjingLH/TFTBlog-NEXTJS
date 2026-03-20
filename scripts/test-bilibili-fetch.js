/**
 * 测试B站抓取（单个UP主）
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');
const { MongoClient } = require('mongodb');

const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  RSSHUB_URL: 'http://localhost:1200',
  // 测试UP主：手刃猫咪
  TEST_UID: '262943792',
};

// HTTP 请求函数
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    }).on('error', reject);
  });
}

// 解析RSS
function parseRSS(xml) {
  const articles = [];

  // 提取作者名称
  const channelTitleMatch = xml.match(/<title>(.*?) 的 bilibili 空间<\/title>/);
  const authorName = channelTitleMatch ? channelTitleMatch[1] : 'Unknown';

  // 提取 items
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  const items = xml.match(itemPattern) || [];

  console.log(`\n📝 作者名称: ${authorName}`);
  console.log(`📊 找到 ${items.length} 个视频\n`);

  for (let i = 0; i < Math.min(3, items.length); i++) {
    const item = items[i];

    const titleMatch = item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

    console.log(`视频 ${i + 1}:`);
    console.log(`  标题: ${titleMatch ? titleMatch[1] : 'N/A'}`);
    console.log(`  链接: ${linkMatch ? linkMatch[1] : 'N/A'}`);
    console.log(`  发布: ${pubDateMatch ? pubDateMatch[1] : 'N/A'}`);

    // 提取封面
    const descMatch = item.match(/<description>(.*?)<\/description>/s);
    if (descMatch) {
      const imgMatch = descMatch[1].match(/<img src="([^"]+)"/);
      if (imgMatch) {
        const thumbnail = imgMatch[1].substring(0, 80) + '...';
        console.log(`  封面: ${thumbnail}`);
      }
    }
    console.log('');
  }

  return { authorName, videoCount: items.length };
}

async function main() {
  console.log('🚀 测试B站 RSS 抓取');
  console.log('='.repeat(60));

  const url = `${CONFIG.RSSHUB_URL}/bilibili/user/video/${CONFIG.TEST_UID}`;
  console.log(`URL: ${url}\n`);

  try {
    console.log('📡 正在抓取...');
    const xml = await httpRequest(url);

    const result = parseRSS(xml);

    console.log('='.repeat(60));
    console.log(`\n✅ 测试成功！`);
    console.log(`   作者: ${result.authorName}`);
    console.log(`   视频数: ${result.videoCount}`);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

main();
