import dotenv from 'dotenv';

// 先加载环境变量，再导入模块
dotenv.config({ path: '.env.local' });

import dbConnect from '../lib/mongodb.js';
import Admin from '../models/Admin.js';

async function createAdmin() {
  try {
    await dbConnect();

    const email = process.env.ADMIN_EMAIL || 'admin@tftblog.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123456';

    // 检查是否已存在
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('✅ 管理员账号已存在:', email);
      process.exit(0);
    }

    // 创建管理员
    const admin = await Admin.create({
      email,
      password,
      name: 'Admin',
      role: 'admin',
    });

    console.log('✅ 管理员账号创建成功!');
    console.log('邮箱:', admin.email);
    console.log('密码:', password);
    console.log('\n⚠️  请立即修改默认密码!');

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员失败:', error);
    process.exit(1);
  }
}

createAdmin();
