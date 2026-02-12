import mongoose from 'mongoose';

/**
 * 数据源接口定义
 * 支持 YouTube、Bilibili、Tacter、TFTimes 四个平台
 */
export interface ISource {
  platform: 'YouTube' | 'Bilibili' | 'Tacter' | 'TFTimes';
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
      enum: ['YouTube', 'Bilibili', 'Tacter', 'TFTimes'],
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
SourceSchema.index({ 'tacter.username': 1 }, { unique: true, sparse: true });

// 导出模型（防止重复编译）
export default mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);
