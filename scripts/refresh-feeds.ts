#!/usr/bin/env node

/**
 * CLI 脚本：手动刷新文章数据
 *
 * 使用方法：
 * npm run refresh-feeds
 *
 * 或直接运行：
 * npx ts-node scripts/refresh-feeds.ts
 */

async function main() {
  console.log('='.repeat(50));
  console.log('🔄 开始刷新文章数据...');
  console.log('='.repeat(50));

  // 从环境变量读取配置
  const port = process.env.PORT || '3000';
  const apiKey = process.env.ADMIN_API_KEY || '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;

  const apiUrl = `${baseUrl}/api/feeds/refresh`;

  try {
    console.log(`📡 请求地址: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `HTTP ${response.status}: ${errorData.message || response.statusText}`
      );
    }

    const result = await response.json();

    console.log('\n✅ 刷新成功！');
    console.log('='.repeat(50));
    console.log(`📊 文章数量: ${result.count}`);
    console.log(`🕒 更新时间: ${new Date(result.updatedAt).toLocaleString('zh-CN')}`);
    console.log(`📁 数据源: ${result.sources.join(', ')}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 刷新失败！');
    console.error('='.repeat(50));
    console.error('错误信息:', error.message);
    console.error('\n💡 提示:');
    console.error('  1. 确保开发服务器正在运行 (npm run dev)');
    console.error('  2. 检查 .env.local 中的配置');
    console.error('  3. 确保网络可以访问 RSSHub');
    console.error('='.repeat(50));

    process.exit(1);
  }
}

main();
