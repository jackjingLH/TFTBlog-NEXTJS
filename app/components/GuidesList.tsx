'use client';

import { useState, useEffect } from 'react';
import { FeedArticle } from '@/types/feed';

// 定义平台和博主的数据结构
interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  authors: Author[];
}

interface Author {
  id: string;
  name: string;
  avatar?: string;
  count?: number;
}

interface GuidesListProps {
  initialLimit?: number;
}

// 平台数据配置
const platforms: Platform[] = [
  {
    id: 'tftimes',
    name: 'TFTimes',
    icon: '🏆',
    color: 'bg-red-600',
    authors: [
      { id: 'official', name: '官方资讯', count: 0 },
      { id: 'strategy', name: '攻略解析', count: 0 },
      { id: 'news', name: '新闻资讯', count: 0 }
    ]
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    color: 'bg-pink-500',
    authors: [
      { id: 'tft_master', name: '云顶大师兄', count: 267 },
      { id: 'king', name: '王者导师', count: 198 },
      { id: 'pro_guide', name: '职业攻略君', count: 176 }
    ]
  },
  {
    id: 'xiaohongshu',
    name: '��红书',
    icon: '📕',
    color: 'bg-red-500',
    authors: [
      { id: 'tft_girl', name: '云顶小姐姐', count: 89 },
      { id: 'game_life', name: '游戏生活家', count: 134 }
    ]
  },
  {
    id: 'nga',
    name: 'NGA论坛',
    icon: '💬',
    color: 'bg-blue-600',
    authors: [
      { id: 'pro_player', name: '职业选手', count: 78 },
      { id: 'theorist', name: '理论派', count: 156 }
    ]
  },
  {
    id: 'taptap',
    name: 'TapTap',
    icon: '🎮',
    color: 'bg-purple-600',
    authors: [
      { id: 'guide_master', name: '攻略大师', count: 203 },
      { id: 'data_analyst', name: '数据分析师', count: 167 }
    ]
  }
];

export default function GuidesList({ initialLimit = 20 }: GuidesListProps) {
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  // 获取当前选中平台的作者列表
  const currentAuthors = selectedPlatform === 'all'
    ? []
    : platforms.find(p => p.id === selectedPlatform)?.authors || [];

  // 获取文章数据
  const fetchArticles = async (forceRefresh = false, platform?: string, author?: string) => {
    setLoading(true);
    setError('');

    // 使用传入的参数，如果没有则使用当前状态
    const filterPlatform = platform !== undefined ? platform : selectedPlatform;
    const filterAuthor = author !== undefined ? author : selectedAuthor;

    try {
      let allArticles: FeedArticle[] = [];

      // 直接调用 API 获取数据
      try {
        const response = await fetch('/api/feeds?limit=20');
        const result = await response.json();

        if (result.status === 'success' && result.data) {
          allArticles.push(...result.data);
        } else {
          throw new Error('API 返回错误: ' + (result.message || '未知错误'));
        }
      } catch (error) {
        console.error('[GuidesList] API 调用失败:', error);
        throw new Error('无法获取数据: ' + error.message);
      }

      // 如果没有数据，显示错误
      if (allArticles.length === 0) {
        throw new Error('暂时没有可用的文章数据');
      }

      // 根据筛选条件过滤文章
      let filteredArticles = [...allArticles];

      if (filterPlatform !== 'all') {
        if (filterPlatform === 'tftimes') {
          // 只显示 TFTimes 数据
          filteredArticles = filteredArticles.filter(article =>
            article.platform === 'TFTimes'
          );

          // 根据选择的作者（分类）进一步过滤
          if (filterAuthor !== 'all') {
            const categoryMap: Record<string, string> = {
              'official': '新闻',
              'strategy': '攻略',
              'news': '新闻'
            };
            const targetCategory = categoryMap[filterAuthor];
            if (targetCategory) {
              filteredArticles = filteredArticles.filter(article =>
                article.category === targetCategory
              );
            }
          }
        } else if (filterPlatform === 'bilibili') {
          // 只显示 B 站数据
          filteredArticles = filteredArticles.filter(article =>
            article.platform === 'B站'
          );

          // 根据选择的博主进一步过滤
          if (filterAuthor !== 'all') {
            // 目前只有一个博主，后续可以根据需要扩展
            const authorMap: Record<string, string> = {
              'tft_master': '云顶大师兄',
              'king': '王者导师',
              'pro_guide': '职业攻略君'
            };
            // B站数据暂时不过滤，显示所有B站内容
          }
        } else {
          // 其他平台暂时没有数据
          filteredArticles = [];
        }
      }

      // 按发布时间排序
      filteredArticles.sort((a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      const finalArticles = filteredArticles.slice(0, initialLimit);
      setArticles(finalArticles);
      setLastUpdated(new Date());

    } catch (err: any) {
      const errorMessage = err.message || '获取文章失败，请稍后重试';
      setError(errorMessage);
      console.error('[GuidesList] 获取文章失败:', err);
      setArticles([]); // 清空文章列表
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 客户端环境，延迟一下确保组件完全挂载
      const timer = setTimeout(() => {
        fetchArticles();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []); // 只在组件挂载时执行一次

  // 切换平台
  const handlePlatformChange = (platformId: string) => {
    console.log('[GuidesList] Platform changed to:', platformId);
    setSelectedPlatform(platformId);
    setSelectedAuthor('all'); // 重置作者选择
    setShowAuthorDropdown(false);
    // 重新获取数据 - 传入新的平台和重置的作者参数
    fetchArticles(false, platformId, 'all');
  };

  // 切换作者
  const handleAuthorChange = (authorId: string) => {
    console.log('[GuidesList] Author changed to:', authorId);
    setSelectedAuthor(authorId);
    setShowAuthorDropdown(false);
    // 重新获取数据 - 传入当前平台和新的作者参数
    fetchArticles(false, selectedPlatform, authorId);
  };

  // 手动刷新数据 - 强制刷新模式
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchArticles(true); // 传入 true 强制刷新
    setRefreshing(false);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    return '刚刚';
  };

  // 获取分类标签颜色
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '阵容攻略': 'bg-blue-100 text-blue-800',
      '英雄解析': 'bg-green-100 text-green-800',
      '装备合成': 'bg-purple-100 text-purple-800',
      '版本更新': 'bg-orange-100 text-orange-800',
      '新手教程': 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full">

      {/* 筛选控制区 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* 左侧筛选标签 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 平台选择 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">平台：</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePlatformChange('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPlatform === 'all'
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部平台
                </button>
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformChange(platform.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                      selectedPlatform === platform.id
                        ? `${platform.color.replace('bg-', 'bg-')} text-white shadow-md`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 作者选择 - 仅在选择平台后显示 */}
            {selectedPlatform !== 'all' && currentAuthors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">博主：</span>
                <div className="relative">
                  <button
                    onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[120px] text-left flex items-center justify-between ${
                      selectedAuthor === 'all'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedAuthor === 'all'
                      ? '全部博主'
                      : currentAuthors.find(a => a.id === selectedAuthor)?.name
                    }
                    <svg
                      className={`w-4 h-4 ml-2 transition-transform ${showAuthorDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAuthorDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => handleAuthorChange('all')}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                          selectedAuthor === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        全部博主
                      </button>
                      {currentAuthors.map((author) => (
                        <button
                          key={author.id}
                          onClick={() => handleAuthorChange(author.id)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                            selectedAuthor === author.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <span>{author.name}</span>
                          {author.count && (
                            <span className="text-xs text-gray-500">{author.count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右侧刷新按钮和更新时间 */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                更新于 {formatTime(lastUpdated)}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? '刷新中...' : '刷新'}
            </button>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-600 mt-4">加载中...</p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 文章网格 */}
      {!loading && !error && articles.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden hover:-translate-y-1"
            >
              <div className="p-6">
                {/* 文章头部 */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                    {article.category}
                  </span>
                  <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>

                {/* 文章标题 */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>

                {/* 文章描述 */}
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {article.description}
                </p>

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {article.platform}
                    </span>
                    <span className="text-gray-600">
                      {article.author}
                    </span>
                  </div>
                  <span>{formatTime(article.publishedAt)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && articles.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">暂无相关内容</p>
            <p className="text-sm">请尝试选择其他平台或博主</p>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {!loading && !error && articles.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          显示 {articles.length} 篇最新攻略内容
        </div>
      )}
    </div>
  );
}