'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FeedArticle } from '@/types/feed';

// 图片代理函数 - 绕过防盗链
function getProxiedImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  // YouTube 图片不使用代理（服务器在国内无法访问，让客户端浏览器直接加载）
  const isYouTube = imageUrl.includes('ytimg.com') || imageUrl.includes('ggpht.com');
  if (isYouTube) {
    return imageUrl; // 直接返回原URL
  }

  // B站图片需要代理（防盗链）
  const isBilibili = imageUrl.includes('hdslb.com') || imageUrl.includes('bilibili.com');
  if (isBilibili) {
    // 使用代理API
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // 抖音图片需要代理（防盗链）
  const isDouyin = imageUrl.includes('douyinpic.com') || imageUrl.includes('douyin.com');
  if (isDouyin) {
    // 使用代理API
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // 其他图片直接返回原URL
  return imageUrl;
}

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
    color: 'bg-primary-500',
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
    color: 'bg-primary-500',
    authors: [
      { id: 'tft_master', name: '云顶大师兄', count: 267 },
      { id: 'king', name: '王者导师', count: 198 },
      { id: 'pro_guide', name: '职业攻略君', count: 176 }
    ]
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    color: 'bg-primary-500',
    authors: [
      // 作者数据将从 API 动态加载
      { id: 'jcc700', name: '金铲铲700', count: 0 }
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    color: 'bg-primary-500',
    authors: [
      // 作者数据将从 API 动态加载
      { id: 'reroll', name: 'Reroll', count: 0 },
      { id: 'learningtft', name: 'LearningTFT', count: 0 },
      { id: 'yiisyordle', name: 'Yi Is Yordle TFT', count: 0 }
    ]
  },
  {
    id: 'tacter',
    name: 'Tacter',
    icon: '🎯',
    color: 'bg-primary-500',
    authors: [
      // 作者数据将从 API 动态加载
      { id: 'tftips', name: 'TFTips', count: 0 },
      { id: 'extiria', name: 'ExTIRIA', count: 0 }
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
          if (platformName === 'Bilibili') {
            authorsData['bilibili'] = authorList;
          } else if (platformName === 'TFTimes') {
            authorsData['tftimes'] = authorList;
          } else if (platformName === 'YouTube') {
            authorsData['youtube'] = authorList;
          } else if (platformName === 'Tacter') {
            authorsData['tacter'] = authorList;
          } else if (platformName === 'Douyin') {
            authorsData['douyin'] = authorList;
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
          'bilibili': 'Bilibili',
          'tftimes': 'TFTimes',
          'youtube': 'YouTube',
          'tacter': 'Tacter',
          'douyin': 'Douyin',
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
    fetchAuthors(); // 先获取作者列表
    fetchArticles(1);
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
    // 统一使用橙色系，不再区分不同分类
    return 'bg-primary-500/20 text-primary-400';
  };

  // 获取平台默认背景色 - 统一深色背景，不再使用彩色渐变
  const getPlatformBg = (platform: string) => {
    return 'bg-bgDark-700';
  };

  return (
    <div className="w-full">

      {/* 筛选控制区 */}
      <div className="bg-bgDark-700 rounded-xl shadow-sm border border-border p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* 左侧筛选标签 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 平台选择 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-textLight-200">平台：</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePlatformChange('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPlatform === 'all'
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-bgDark-600 text-textLight-200 hover:bg-bgDark-500'
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
                        : 'bg-bgDark-600 text-textLight-200 hover:bg-bgDark-500'
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
                <span className="text-sm font-medium text-textLight-200">博主：</span>
                <div className="relative">
                  <button
                    onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[120px] text-left flex items-center justify-between ${
                      selectedAuthor === 'all'
                        ? 'bg-bgDark-600 text-textLight-200 hover:bg-bgDark-500'
                        : 'bg-primary-500/20 text-primary-400'
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
                    <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto" style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d44' }}>
                      <button
                        onClick={() => handleAuthorChange('all')}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg ${
                          selectedAuthor === 'all' ? 'text-primary-400 font-medium' : 'text-textLight-200'
                        }`}
                        style={{ backgroundColor: selectedAuthor === 'all' ? 'rgba(255, 133, 0, 0.2)' : '#1a1a2e' }}
                        onMouseEnter={(e) => {
                          if (selectedAuthor !== 'all') {
                            e.currentTarget.style.backgroundColor = '#232339';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedAuthor !== 'all') {
                            e.currentTarget.style.backgroundColor = '#1a1a2e';
                          }
                        }}
                      >
                        全部博主
                      </button>
                      {currentAuthors.map((author, index) => (
                        <button
                          key={author.id}
                          onClick={() => handleAuthorChange(author.id)}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                            index === currentAuthors.length - 1 ? 'rounded-b-lg' : ''
                          } ${
                            selectedAuthor === author.id ? 'text-primary-400 font-medium' : 'text-textLight-200'
                          }`}
                          style={{ backgroundColor: selectedAuthor === author.id ? 'rgba(255, 133, 0, 0.2)' : '#1a1a2e' }}
                          onMouseEnter={(e) => {
                            if (selectedAuthor !== author.id) {
                              e.currentTarget.style.backgroundColor = '#232339';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedAuthor !== author.id) {
                              e.currentTarget.style.backgroundColor = '#1a1a2e';
                            }
                          }}
                        >
                          <span>{author.name}</span>
                          {author.count && (
                            <span className="text-xs text-textLight-300">{author.count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右侧更新时间 */}
          {lastUpdated && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-textLight-300">
                更新于 {formatTime(lastUpdated)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="bg-bgDark-700 rounded-xl shadow-sm border border-border p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-bgDark-600 border-t-primary-500"></div>
            <p className="text-textLight-200 mt-4">加载中...</p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
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
                className="group relative bg-bgDark-700 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-border overflow-hidden hover:-translate-y-1 min-h-[200px]"
                style={{
                  backgroundImage: article.thumbnail
                    ? `url("${getProxiedImageUrl(article.thumbnail)}")`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* 背景遮罩层 - 确保文字可读 */}
                <div className={`absolute inset-0 ${
                  article.thumbnail
                    ? 'bg-gradient-to-t from-black/95 via-black/70 to-black/40'
                    : getPlatformBg(article.platform)
                }`}></div>

                {/* 内容层 */}
                <div className="relative h-full p-5 flex flex-col justify-end">
                  {/* 顶部：分类标签 - 绝对定位 */}
                  <div className="absolute top-4 left-5 right-5 flex items-start justify-between">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-lg ${
                      article.thumbnail
                        ? 'bg-primary-500/30 text-primary-300 backdrop-blur-sm'
                        : getCategoryColor(article.category || '')
                    }`}>
                      {article.category}
                    </span>
                    <div className="text-primary-400 group-hover:text-primary-300 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>

                  {/* 底部：标题和信息 - 靠底部对齐 */}
                  <div className="pt-12">
                    {/* 文章标题 */}
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:scale-105 transition-transform text-textLight-100">
                      {article.title}
                    </h3>

                    {/* 文章描述 */}
                    <p className="text-sm mb-3 line-clamp-2 text-textLight-200">
                      {article.description}
                    </p>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md font-medium ${
                          article.thumbnail
                            ? 'bg-primary-500/30 text-primary-300 backdrop-blur-sm'
                            : 'bg-primary-500/30 text-primary-300'
                        }`}>
                          {article.platform}
                        </span>
                        <span className="truncate max-w-[120px] text-textLight-200">
                          {article.author}
                        </span>
                      </div>
                      <span className="text-textLight-200">
                        {formatTime(article.publishedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 无图片时显示平台图标 */}
                {!article.thumbnail && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary-500/20 pointer-events-none -mt-8">
                    <div className="text-7xl">
                      {article.platform === 'YouTube' && '▶️'}
                      {article.platform === 'Bilibili' && '📺'}
                      {article.platform === 'TFTimes' && '🏆'}
                      {article.platform === 'Tacter' && '🎯'}
                      {article.platform === 'Douyin' && '🎵'}
                    </div>
                  </div>
                )}
              </a>
            ))}
          </div>

          {/* 加载更多指示器 */}
          {loadingMore && (
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center px-4 py-2 text-sm text-textLight-200">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-bgDark-600 border-t-primary-500 mr-2"></div>
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
            <div className="mt-8 text-center text-sm text-textLight-300">
              已加载全部内容
            </div>
          )}
        </>
      )}

      {/* 空状态 */}
      {!loading && !error && articles.length === 0 && (
        <div className="bg-bgDark-700 rounded-xl shadow-sm border border-border p-12">
          <div className="text-center text-textLight-200">
            <div className="w-16 h-16 bg-bgDark-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-textLight-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
