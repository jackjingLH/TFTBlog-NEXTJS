import mongoose from 'mongoose';

/**
 * 数据源接口定义
 * 支持 YouTube、Bilibili、Douyin、Tacter、TFTimes 五个平台
 */
export interface ISource {
  platform: 'YouTube' | 'Bilibili' | 'Douyin' | 'Tacter' | 'TFTimes';
  name: string;
  enabled: boolean;

  // 平台特定字段（按平台选填）
  youtube?: {
    type: 'user' | 'channel';
    id: string;                 // 频道 ID，如 '@RerollTFT'
    fans?: string;
    description?: string;
  };

  bilibili?: {
    uid: string;                // UP主用户ID
    fans?: string;
  };

  douyin?: {
    userId: string;             // 抖音用户ID
    fans?: string;
    description?: string;
  };

  tacter?: {
    username: string;           // Tacter 用户名
    description?: string;
  };

  tftimes?: {
    category: string;           // TFTimes 分类
  };

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Mongoose Schema 定义
 */
const SourceSchema = new mongoose.Schema<ISource>(
  {
    platform: {
      type: String,
      enum: ['YouTube', 'Bilibili', 'Douyin', 'Tacter', 'TFTimes'],
      required: [true, '平台类型必填'],
    },
    name: {
      type: String,
      required: [true, '名称必填'],
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },

    // YouTube 配置
    youtube: {
      type: {
        type: String,
        enum: ['user', 'channel'],
      },
      id: String,
      fans: String,
      description: String,
    },

    // B站配置
    bilibili: {
      uid: String,
      fans: String,
    },

    // 抖音配置
    douyin: {
      userId: String,
      fans: String,
      description: String,
    },

    // Tacter 配置
    tacter: {
      username: String,
      description: String,
    },

    // TFTimes 配置
    tftimes: {
      category: String,
    },
  },
  {
    timestamps: true,  // 自动添加 createdAt 和 updatedAt
    collection: 'sources',
  }
);

// 创建复合索引
SourceSchema.index({ platform: 1, enabled: 1 });

// 唯一性索引（稀疏索引，只对存在该字段的文档生效）
SourceSchema.index({ 'youtube.id': 1 }, { unique: true, sparse: true });
SourceSchema.index({ 'bilibili.uid': 1 }, { unique: true, sparse: true });
SourceSchema.index({ 'douyin.userId': 1 }, { unique: true, sparse: true });
SourceSchema.index({ 'tacter.username': 1 }, { unique: true, sparse: true });

// 导出模型（开发环境下强制重新注册以避免热重载缓存问题）
if (process.env.NODE_ENV === 'development' && mongoose.models.Source) {
  delete mongoose.models.Source;
}
export default mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);
