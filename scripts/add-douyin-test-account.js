/**
 * 添加抖音测试账号到数据库
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  TEST_ACCOUNT: {
    platform: 'Douyin',
    name: '金铲铲700',
    enabled: true,
    douyin: {
      userId: 'MS4wLjABAAAAOVMfWVZBOGA264LUMwrvbF527V7b7Vnz0RfjEDtsrFdPeoAKyJiXXcWQg3iMvR6u',
      fans: '待更新',
      description: '金铲铲之战攻略博主'
    }
  }
};

async function addDouyinAccount() {
  let client;

  try {
    console.log('🚀 添加抖音测试账号到数据库');
    console.log('='.repeat(60));

    client = await MongoClient.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    const db = client.db();
    const collection = db.collection('sources');

    // 检查是否已存在
    const existing = await collection.findOne({
      platform: 'Douyin',
      'douyin.userId': CONFIG.TEST_ACCOUNT.douyin.userId
    });

    if (existing) {
      console.log('\n⚠️  该账号已存在：');
      console.log(`   名称: ${existing.name}`);
      console.log(`   平台: ${existing.platform}`);
      console.log(`   状态: ${existing.enabled ? '启用' : '禁用'}`);
      return { success: true, existed: true };
    }

    // 插入新账号
    const result = await collection.insertOne(CONFIG.TEST_ACCOUNT);

    console.log('\n✅ 成功添加抖音账号！');
    console.log(`   _id: ${result.insertedId}`);
    console.log(`   名称: ${CONFIG.TEST_ACCOUNT.name}`);
    console.log(`   平台: ${CONFIG.TEST_ACCOUNT.platform}`);
    console.log(`   用户ID: ${CONFIG.TEST_ACCOUNT.douyin.userId.substring(0, 30)}...`);

    return { success: true, existed: false, id: result.insertedId };

  } catch (error) {
    console.error('\n❌ 添加失败:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

addDouyinAccount()
  .then((result) => {
    if (result.existed) {
      console.log('\n📌 数据源已存在，无需重复添加');
    } else {
      console.log('\n🎉 数据源添加成功！');
      console.log('\n下一步：');
      console.log('  1. 运行抓取： node scripts/fetch-douyin.js');
      console.log('  2. 或访问管理后台查看： http://localhost:3000/dashboard/aggregation');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });
