// 文章源数据接口
export interface FeedArticle {
  id: string;              // 唯一标识 (基于 link 生成)
  title: string;           // 文章标题
  description: string;     // 摘要/描述
  link: string;            // 跳转链接
  source: string;          // 来源 (NGA/TapTap/Bilibili等)
  category?: string;       // 分类（可选）
  publishedAt: Date;       // 发布时间
  fetchedAt: Date;         // 抓取时间
}

// 缓存数据结构
export interface FeedCache {
  articles: FeedArticle[];
  lastUpdated: Date;
}

// RSS源配置
export interface RSSSource {
  name: string;            // 源名称
  url: string;             // RSSHub URL
  source: string;          // 来源标识
}

// API响应结构
export interface FeedResponse {
  status: 'success' | 'error';
  data: FeedArticle[];
  total: number;
  page: number;
  pageSize: number;
  cached: boolean;
  lastUpdated?: Date;
  message?: string;
}
