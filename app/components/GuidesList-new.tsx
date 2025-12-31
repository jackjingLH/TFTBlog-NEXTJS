'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
      // 作者数据将从 API 动态加载
      { id: 'placeholder', name: '加载中...', count: 0 }
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    color: 'bg-red-600',
    authors: [
      // 作者数据将从 API 动态加载
      { id: 'placeholder', name: '加载中...', count: 0 }
    ]
  },
  {
    id: 'tacter',
    name: 'Tacter',
    icon: '⚔️',
    color: 'bg-indigo-600',
    authors: [
      // 作者数据将从 API 动态加载
      { id: 'placeholder', name: '加载中...', count: 0 }
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

  // 无限滚动相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 动态作者列表
  const [dynamicAuthors, setDynamicAuthors] = useState<Record<string, Author[]>>({});

  // 获取当前选中平台的作者列表
  const currentAuthors = selectedPlatform === 'all'
    ? []
    : (dynamicAuthors[selectedPlatform] || platforms.find(p => p.id === selectedPlatform)?.authors || []);

  // 获取作者列表
  const fetchAuthors = async () => {
    try {
      const response = await fetch('/api/authors');
      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const authorsData: Record<string, Author[]> = {};

        // 转换数据格式
        Object.entries(result.data).forEach(([platformName, authors]) => {
          const authorList = (authors as Array<{ name: string; count: number }>).map((author, index) => ({
            id: `author_${index}`,
            name: author.name,
            count: author.count
          }));

          // 映射平台名称到平台ID
          if (platformName === 'B站') {
            authorsData['bilibili'] = authorList;
          } else if (platformName === 'TFTimes') {
            authorsData['tftimes'] = authorList;
          } else if (platformName === 'YouTube') {
            authorsData['youtube'] = authorList;
          } else if (platformName === 'Tacter') {
            authorsData['tacter'] = authorList;
          }
        });

        setDynamicAuthors(authorsData);
      }
    } catch (error) {
      console.error('[GuidesList] 获取作者列表失败:', error);
    }
  };

  // 获取文章数据
  const fetchArticles = async (
    pageNum: number,
    isLoadMore = false,
    platform?: string,
    author?: string
  ) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    // 使用传入的参数，如果没有则使用当前状态
    const filterPlatform = platform !== undefined ? platform : selectedPlatform;
    const filterAuthor = author !== undefined ? author : selectedAuthor;

    try {
      // 构建 API URL
      let apiUrl = `/api/feeds?page=${pageNum}&limit=20`;
      if (filterPlatform !== 'all') {
        // 映射平台 ID 到数据库中的平台名称
        const platformMap: Record<string, string> = {
          'bilibili': 'B站',
          'tftimes': 'TFTimes',
          'youtube': 'YouTube',
          'tacter': 'Tacter',
        };
        apiUrl += `&platform=${platformMap[filterPlatform] || filterPlatform}`;
      }
      if (filterAuthor !== 'all') {
        // 根据作者ID查找实际的作者名称
        const authorList = dynamicAuthors[filterPlatform] || [];
        const selectedAuthorObj = authorList.find(a => a.id === filterAuthor);
        if (selectedAuthorObj) {
          apiUrl += `&author=${encodeURIComponent(selectedAuthorObj.name)}`;
        }
      }

      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const newArticles = result.data;

        // 判断是否还有更多数据
        const hasMoreData = newArticles.length === 20;
        setHasMore(hasMoreData);

        if (isLoadMore) {
          // 追加数据
          setArticles((prev) => [...prev, ...newArticles]);
        } else {
          // 替换数据
          setArticles(newArticles);

          // 更新时间：使用最新文章的 fetchedAt
          if (newArticles.length > 0) {
            const latestFetchedAt = new Date(
              Math.max(...newArticles.map((a: FeedArticle) => new Date(a.fetchedAt).getTime()))
            );
            setLastUpdated(latestFetchedAt);
          }
        }
      } else {
        throw new Error('API 返回错误: ' + (result.message || '未知错误'));
      }
    } catch (err: any) {
      const errorMessage = err.message || '获取文章失败，请稍后重试';
      setError(errorMessage);
      console.error('[GuidesList] 获取文章失败:', err);
      if (!isLoadMore) {
        setArticles([]);
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 加载更多数据
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchArticles(nextPage, true);
    }
  }, [loadingMore, hasMore, loading, page]);

  // 无限滚动监听
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore]);

  // 页面加载时获取数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 客户端环境，延迟一下确保组件完全挂载
      const timer = setTimeout(() => {
        fetchAuthors(); // 先获取作者列表
        fetchArticles(1);
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
    setPage(1);
    setHasMore(true);
    // 重新获取数据 - 传入新的平台和重置的作者参数
    fetchArticles(1, false, platformId, 'all');
  };

  // 切换作者
  const handleAuthorChange = (authorId: string) => {
    console.log('[GuidesList] Author changed to:', authorId);
    setSelectedAuthor(authorId);
    setShowAuthorDropdown(false);
    setPage(1);
    setHasMore(true);
    // 重新获取数据 - 传入当前平台和新的作者参数
    fetchArticles(1, false, selectedPlatform, authorId);
  };

  // 手动刷新数据 - 强制刷新模式
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchArticles(1, false); // 重新从第一页加载
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
        <>
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

          {/* 加载更多指示器 */}
          {loadingMore && (
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center px-4 py-2 text-sm text-gray-600">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600 mr-2"></div>
                加载更多内容...
              </div>
            </div>
          )}

          {/* 无限滚动哨兵元素 */}
          {hasMore && !loadingMore && (
            <div ref={observerTarget} className="h-10 mt-8"></div>
          )}

          {/* 已加载全部提示 */}
          {!hasMore && !loadingMore && (
            <div className="mt-8 text-center text-sm text-gray-500">
              已加载全部内容
            </div>
          )}
        </>
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
    </div>
  );
}
