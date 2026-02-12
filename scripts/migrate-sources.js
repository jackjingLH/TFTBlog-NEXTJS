/**
 * 数据源配置迁移脚本
 * 将硬编码的博主配置迁移到 MongoDB sources 集合
 *
 * 使用方法：
 *   node scripts/migrate-sources.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// 所有数据源配置
const SOURCES = [
  // ========== YouTube (3个频道) ==========
  {
    platform: 'YouTube',
    name: 'Reroll',
    enabled: true,
    youtube: {
      type: 'user',
      id: '@RerollTFT',
      fans: '120万+',
      description: 'TFT 攻略、版本更新、新英雄评测'
    }
  },
  {
    platform: 'YouTube',
    name: 'LearningTFT',
    enabled: true,
    youtube: {
      type: 'user',
      id: '@LearningTFT',
      fans: '80万+',
      description: 'TFT 教程、新手指南'
    }
  },
  {
    platform: 'YouTube',
    name: 'Yi Is Yordle TFT',
    enabled: true,
    youtube: {
      type: 'user',
      id: '@YiIsYordleTFT',
      fans: '50万+',
      description: 'TFT 战术分析、阵容搭配'
    }
  },

  // ========== B站 (6个UP主) ==========
  {
    platform: 'Bilibili',
    name: '林小北Lindo',
    enabled: true,
    bilibili: {
      uid: '18343134',
      fans: '186万'
    }
  },
  {
    platform: 'Bilibili',
    name: 'GoDlike_神超',
    enabled: true,
    bilibili: {
      uid: '388063772',
      fans: '84.46万'
    }
  },
  {
    platform: 'Bilibili',
    name: '手刃猫咪',
    enabled: true,
    bilibili: {
      uid: '262943792',
      fans: '15.69万'
    }
  },
  {
    platform: 'Bilibili',
    name: '兔子解说JokerTu',
    enabled: true,
    bilibili: {
      uid: '14306063',
      fans: '待更新'
    }
  },
  {
    platform: 'Bilibili',
    name: '襄平霸王东',
    enabled: true,
    bilibili: {
      uid: '37452208',
      fans: '待更新'
    }
  },
  {
    platform: 'Bilibili',
    name: '云顶风向标',
    enabled: true,
    bilibili: {
      uid: '3546666107931417',
      fans: '待更新'
    }
  },

  // ========== Tacter (2个作者) ==========
  {
    platform: 'Tacter',
    name: 'TFTips',
    enabled: true,
    tacter: {
      username: 'tftips',
      description: 'I create guides'
    }
  },
  {
    platform: 'Tacter',
    name: 'ExTIRIA',
    enabled: true,
    tacter: {
      username: 'extiria',
      description: 'I play TFT'
    }
  },

  // ========== TFTimes (3个固定源) ==========
  {
    platform: 'TFTimes',
    name: 'TFT Times - メタ＆攻略',
    enabled: true,
    tftimes: {
      category: 'メタ＆攻略'
    }
  },
  {
    platform: 'TFTimes',
    name: 'TFT Times - パッチノート',
    enabled: true,
    tftimes: {
      category: 'パッチノート'
    }
  },
  {
    platform: 'TFTimes',
    name: 'TFT Times - ニュース',
    enabled: true,
    tftimes: {
      category: 'ニュース'
    }
  }
];

async function main() {
  let client;

  try {
    console.log('🚀 数据源配置迁移脚本');
    console.log('='.repeat(70));
    console.log('');

    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI 环境变量未设置');
    }

    console.log('📡 连接 MongoDB...');
    client = await MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ 数据库连接成功\n');

    const db = client.db();
    const collection = db.collection('sources');

    // 检查现有数据
    const existingCount = await collection.countDocuments();
    console.log(`📊 当前 sources 集合中有 ${existingCount} 条数据\n`);

    // 创建索引
    console.log('📋 创建索引...');
    try {
      await collection.createIndex({ platform: 1, enabled: 1 });
      await collection.createIndex({ 'youtube.id': 1 }, { unique: true, sparse: true });
      await collection.createIndex({ 'bilibili.uid': 1 }, { unique: true, sparse: true });
      await collection.createIndex({ 'tacter.username': 1 }, { unique: true, sparse: true });
      console.log('✅ 索引创建完成\n');
    } catch (error) {
      console.log('⚠️  索引已存在，跳过创建\n');
    }

    // 统计变量
    let inserted = 0, skipped = 0, failed = 0;

    console.log('📥 开始迁移数据...');
    console.log('-'.repeat(70));

    for (const source of SOURCES) {
      try {
        // 构建唯一性查询
        let query = {};
        if (source.platform === 'YouTube') {
          query = { 'youtube.id': source.youtube.id };
        } else if (source.platform === 'Bilibili') {
          query = { 'bilibili.uid': source.bilibili.uid };
        } else if (source.platform === 'Tacter') {
          query = { 'tacter.username': source.tacter.username };
        } else if (source.platform === 'TFTimes') {
          query = { platform: 'TFTimes', name: source.name };
        }

        // 检查是否已存在
        const existing = await collection.findOne(query);

        if (existing) {
          console.log(`⏭️  跳过: ${source.platform.padEnd(10)} | ${source.name}`);
          skipped++;
        } else {
          // 插入新数据
          await collection.insertOne({
            ...source,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`✅ 插入: ${source.platform.padEnd(10)} | ${source.name}`);
          inserted++;
        }
      } catch (error) {
        console.error(`❌ 失败: ${source.platform.padEnd(10)} | ${source.name}`);
        console.error(`   错误: ${error.message}`);
        failed++;
      }
    }

    console.log('-'.repeat(70));
    console.log('');
    console.log('📊 迁移统计');
    console.log('='.repeat(70));
    console.log(`总计数据源: ${SOURCES.length} 个`);
    console.log(`✅ 成功插入: ${inserted} 个`);
    console.log(`⏭️  已存在跳过: ${skipped} 个`);
    console.log(`❌ 失败: ${failed} 个`);
    console.log('='.repeat(70));
    console.log('');

    // 显示平台统计
    const platformStats = await collection.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('📈 平台数据源统计');
    console.log('-'.repeat(70));
    platformStats.forEach(stat => {
      console.log(`${stat._id.padEnd(10)}: ${stat.count} 个`);
    });
    console.log('-'.repeat(70));
    console.log('');

    if (failed > 0) {
      console.error('⚠️  迁移完成，但有失败项，请检查错误日志');
      process.exit(1);
    } else {
      console.log('🎉 迁移完成！');
      process.exit(0);
    }
  } catch (error) {
    console.error('');
    console.error('❌ 迁移失败:');
    console.error('='.repeat(70));
    console.error(error.message);
    console.error('='.repeat(70));
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('📡 数据库连接已关闭');
    }
  }
}

// 执行迁移
main();
