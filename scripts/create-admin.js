const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// 管理员 Schema
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true, default: 'Admin' },
  role: { type: String, default: 'admin', enum: ['admin'] },
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function createAdmin() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI 未设置');
      console.error('当前环境变量:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ 已连接到 MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@tftblog.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123456';

    // 检查是否已存在
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('✅ 管理员账号已存在:', email);
      await mongoose.disconnect();
      process.exit(0);
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建管理员
    const admin = await Admin.create({
      email,
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
    });

    console.log('✅ 管理员账号创建成功!');
    console.log('邮箱:', admin.email);
    console.log('密码:', password);
    console.log('\n⚠️  请立即修改默认密码!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员失败:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
