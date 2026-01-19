import mongoose from 'mongoose';

/**
 * 文章数据模型
 * @see CLAUDE.md 文档同步规则
 */
export interface IArticle {
  id: string;                    // 唯一标识（来自 RSS feed）
  title: string;                 // 标题
  description: string;           // 描述
  link: string;                  // 链接
  thumbnail?: string;            // 缩略图/封面图 URL
  platform: string;              // 平台（B站、TFTimes、YouTube等）
  author: string;                // 作者/UP主名称
  category?: string;             // 分类
  publishedAt: Date;             // 发布时间
  fetchedAt: Date;               // 抓取时间
}

const ArticleSchema = new mongoose.Schema<IArticle>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    link: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    platform: {
      type: String,
      required: true,
      index: true,
    },
    author: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: '',
    },
    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

// 复合索引：按平台和发布时间查询
ArticleSchema.index({ platform: 1, publishedAt: -1 });
// 复合索引：按作者和发布时间查询
ArticleSchema.index({ author: 1, publishedAt: -1 });

// 避免重复编译模型
export default mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
