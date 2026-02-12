const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function setAdminRole() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ 数据库已连接');

    const email = '169010501@qq.com';

    const result = await mongoose.connection.db.collection('admins').updateOne(
      { email },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ 未找到邮箱为 ${email} 的用户`);
    } else if (result.modifiedCount > 0) {
      console.log(`✅ 成功将 ${email} 设置为管理员`);
    } else {
      console.log(`ℹ️  ${email} 已经是管理员了`);
    }

    // 验证修改结果
    const user = await mongoose.connection.db.collection('admins').findOne({ email });
    console.log('\n当前用户信息：');
    console.log(`  邮箱: ${user.email}`);
    console.log(`  姓名: ${user.name}`);
    console.log(`  角色: ${user.role}`);
    console.log(`  登录方式: ${user.provider}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ 数据库连接已关闭');
  }
}

setAdminRole();
