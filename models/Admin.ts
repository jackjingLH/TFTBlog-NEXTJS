import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * 管理员数据模型
 * @see CLAUDE.md 项目规范
 */
export interface IAdmin {
  email: string;
  password: string;
  name: string;
  role: 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new mongoose.Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      default: 'Admin',
    },
    role: {
      type: String,
      default: 'admin',
      enum: ['admin'],
    },
  },
  {
    timestamps: true,
  }
);

// 保存前自动哈希密码
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 密码验证方法
AdminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 安全地导出模型，避免 mongoose.models 为 undefined 的问题
let Admin;
try {
  // 尝试获取已存在的模型
  Admin = mongoose.model<IAdmin>('Admin');
} catch {
  // 如果模型不存在，创建新模型
  Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
}

export default Admin;
