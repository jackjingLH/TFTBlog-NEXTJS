#!/usr/bin/env node

/**
 * 测试脚本：直接访问 RSSHub URL 查看数据
 */

async function testRSS() {
  const sources = [
    {
      name: '荡狗天天开心',
      url: 'https://rsshub.app/bilibili/user/video/514939907',
    },
    {
      name: '手刃猫咪',
      url: 'https://rsshub.app/bilibili/user/video/262943792',
    },
    {
      name: '襄平霸王东',
      url: 'https://rsshub.app/bilibili/user/video/37452208',
    },
  ];

  console.log('='.repeat(60));
  console.log('🧪 测试 RSSHub 数据源');
  console.log('='.repeat(60));

  for (const source of sources) {
    console.log(`\n📡 测试: ${source.name}`);
    console.log(`URL: ${source.url}`);

    try {
      const response = await fetch(source.url);

      console.log(`状态码: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const xml = await response.text();
        console.log(`响应长度: ${xml.length} 字符`);

        // 简单统计 item 数量
        const itemMatches = xml.match(/<item>/g);
        const itemCount = itemMatches ? itemMatches.length : 0;
        console.log(`✅ 成功获取 ${itemCount} 条数据`);

        // 显示第一条的标题（如果有）
        const titleMatch = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        if (titleMatch && titleMatch[1]) {
          console.log(`最新标题: ${titleMatch[1]}`);
        }
      } else {
        console.log(`❌ 请求失败`);
      }
    } catch (error: any) {
      console.log(`❌ 错误: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 提示:');
  console.log('  - 如果遇到 429 错误，说明被限流，请等待几分钟后再试');
  console.log('  - 如果遇到 503 错误，说明 RSSHub 服务暂时不可用');
  console.log('  - 建议使用自己的 RSSHub 实例以避免公共限制');
  console.log('='.repeat(60));
}

testRSS();
