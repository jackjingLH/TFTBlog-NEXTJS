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
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // 抖音图片需要代理（防盗链）
  const isDouyin = imageUrl.includes('douyinpic.com') || imageUrl.includes('douyin.com');
  if (isDouyin) {
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

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
    icon: 'svg',
    color: 'bg-primary-500',
    authors: [
      { id: 'official', name: '官方资讯', count: 0 },
      { id: 'strategy', name: '攻略解析', count: 0 },
      { id: 'news', name: '新闻资讯', count: 0 }
    ]
  },
  {
    id: 'tftips',
    name: 'TFTips',
    icon: 'svg',
    color: 'bg-primary-500',
    authors: [
      { id: 'tftips_official', name: 'TFTips', count: 0 }
    ]
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: 'svg',
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
    icon: 'svg',
    color: 'bg-primary-500',
    authors: [
      { id: 'jcc700', name: '金铲铲700', count: 0 }
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'svg',
    color: 'bg-primary-500',
    authors: [
      { id: 'reroll', name: 'Reroll', count: 0 },
      { id: 'learningtft', name: 'LearningTFT', count: 0 },
      { id: 'yiisyordle', name: 'Yi Is Yordle TFT', count: 0 }
    ]
  },
  {
    id: 'tacter',
    name: 'Tacter',
    icon: 'svg',
    color: 'bg-primary-500',
    authors: [
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

        Object.entries(result.data).forEach(([platformName, authors]) => {
          const authorList = (authors as Array<{ name: string; count: number }>).map((author, index) => ({
            id: `author_${index}`,
            name: author.name,
            count: author.count
          }));

          if (platformName === 'Bilibili') authorsData['bilibili'] = authorList;
          else if (platformName === 'TFTimes') authorsData['tftimes'] = authorList;
          else if (platformName === 'TFTips') authorsData['tftips'] = authorList;
          else if (platformName === 'YouTube') authorsData['youtube'] = authorList;
          else if (platformName === 'Tacter') authorsData['tacter'] = authorList;
          else if (platformName === 'Douyin') authorsData['douyin'] = authorList;
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

    const filterPlatform = platform !== undefined ? platform : selectedPlatform;
    const filterAuthor = author !== undefined ? author : selectedAuthor;

    try {
      let apiUrl = `/api/feeds?page=${pageNum}&limit=20`;
      if (filterPlatform !== 'all') {
        const platformMap: Record<string, string> = {
          'bilibili': 'Bilibili',
          'tftimes': 'TFTimes',
          'tftips': 'TFTips',
          'youtube': 'YouTube',
          'tacter': 'Tacter',
          'douyin': 'Douyin',
        };
        apiUrl += `&platform=${platformMap[filterPlatform] || filterPlatform}`;
      }
      if (filterAuthor !== 'all') {
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
        const hasMoreData = newArticles.length === 20;
        setHasMore(hasMoreData);

        if (isLoadMore) {
          setArticles((prev) => [...prev, ...newArticles]);
        } else {
          setArticles(newArticles);
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
      if (!isLoadMore) setArticles([]);
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
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMore]);

  // 页面加载时获取数据
  useEffect(() => {
    fetchAuthors();
    fetchArticles(1);
  }, []);

  // 从 localStorage 恢复视图模式（挂载后读取，避免 SSR 水合不匹配）
  useEffect(() => {
    const saved = localStorage.getItem('guideViewMode') as 'grid' | 'list';
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);

  // 视图模式变化时持久化
  useEffect(() => {
    localStorage.setItem('guideViewMode', viewMode);
  }, [viewMode]);

  // 切换平台
  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    setSelectedAuthor('all');
    setShowAuthorDropdown(false);
    setPage(1);
    setHasMore(true);
    fetchArticles(1, false, platformId, 'all');
  };

  // 切换作者
  const handleAuthorChange = (authorId: string) => {
    setSelectedAuthor(authorId);
    setShowAuthorDropdown(false);
    setPage(1);
    setHasMore(true);
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
    return 'bg-primary-500/20 text-primary-400';
  };

  // 获取平台默认背景色
  const getPlatformBg = (platform: string) => {
    return 'bg-bgDark-700';
  };

  return (
    <div className="w-full">

      {/* 筛选控制区 - glassmorphism + sticky */}
      <div
        className="rounded-xl p-4 sm:p-6 mb-6 sticky top-16 z-40"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(22, 33, 62, 0.85)',
          border: '1px solid rgba(55, 48, 163, 0.5)',
          boxShadow: '0 4px 24px rgba(124, 58, 237, 0.08)',
        }}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* 左侧筛选标签 */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
            {/* 平台选择 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-textLight-200">平台：</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePlatformChange('all')}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-[box-shadow,border-color,background-color] duration-200"
                  style={
                    selectedPlatform === 'all'
                      ? {
                          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                          color: '#fff',
                          boxShadow: '0 0 14px rgba(124, 58, 237, 0.55)',
                        }
                      : {
                          background: 'rgba(30, 27, 75, 0.8)',
                          color: '#B4B4C5',
                          border: '1px solid rgba(55, 48, 163, 0.4)',
                        }
                  }
                >
                  全部平台
                </button>
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformChange(platform.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-[box-shadow,border-color,background-color] duration-200 flex items-center gap-1"
                    style={
                      selectedPlatform === platform.id
                        ? {
                            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                            color: '#fff',
                            boxShadow: '0 0 14px rgba(124, 58, 237, 0.55)',
                          }
                        : {
                            background: 'rgba(30, 27, 75, 0.8)',
                            color: '#B4B4C5',
                            border: '1px solid rgba(55, 48, 163, 0.4)',
                          }
                    }
                  >
                    {platform.id === 'tftips' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: 'currentColor' }}>
                        <path style={{ fillOpacity: 1, strokeWidth: 0.242424 }} d="m 113.50683,2.4056419 c -1.57088,0.00273 -3.14001,0.969192 -6.53485,2.9027593 -6.78969,3.8671346 -6.5339,3.4296407 -6.52003,11.1402978 0.0139,7.710655 -0.24318,7.275112 6.56038,11.118633 6.80356,3.843522 6.28989,3.843806 13.07957,-0.02333 6.78969,-3.867135 6.5339,-3.429641 6.52003,-11.140296 -0.0139,-7.710657 0.244,-7.2742803 -6.55955,-11.1178021 -3.40179,-1.9217609 -4.97469,-2.8829925 -6.54555,-2.8802637 z m 0.12351,7.0894309 c 0.77684,-0.0013 1.55385,0.465287 3.23613,1.3988902 3.36456,1.867208 3.23751,1.655546 3.24437,5.401433 0.006,3.745885 0.13391,3.533584 -3.22378,5.412262 -3.3577,1.878679 -3.10442,1.878039 -6.46897,0.01084 -3.36456,-1.867207 -3.23751,-1.654713 -3.24437,-5.400599 -0.006,-3.745885 -0.13309,-3.533584 3.22461,-5.412263 1.67885,-0.9393392 2.45517,-1.4092282 3.23201,-1.4105542 z" transform="matrix(0.82933656,0,0,0.80530515,-82.645364,-1.7181152)" />
                      </svg>
                    ) : platform.id === 'tftimes' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    ) : platform.id === 'bilibili' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#00A1D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M3 10a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4v-6z" />
                        <path d="M8 3l2 3" />
                        <path d="M16 3l-2 3" />
                        <path d="M9 13v-2" />
                        <path d="M15 11v2" />
                      </svg>
                    ) : platform.id === 'youtube' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8"/>
                        <path d="M10 9l5 3l-5 3l0 -6"/>
                      </svg>
                    ) : platform.id === 'douyin' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917"/>
                      </svg>
                    ) : platform.id === 'tacter' ? (
                      <svg viewBox="0 0 32 32" className="w-4 h-4">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.7458 0V6.50847H25.4915V19.2542C29.0117 19.2542 32 16.2659 32 12.7458V0H12.7458ZM0 12.7458H6.50847V19.2542C2.91342 19.2542 0 16.3408 0 12.7458ZM19.2542 12.7458V32H12.7458V12.7458H19.2542Z" fill="#F1E9D6"/>
                      </svg>
                    ) : (
                      <span>{platform.icon}</span>
                    )}
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
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-[box-shadow,border-color] duration-200 min-w-[120px] text-left flex items-center justify-between"
                    style={
                      selectedAuthor === 'all'
                        ? {
                            background: 'rgba(30, 27, 75, 0.8)',
                            color: '#B4B4C5',
                            border: '1px solid rgba(55, 48, 163, 0.4)',
                          }
                        : {
                            background: 'rgba(124, 58, 237, 0.15)',
                            color: '#A78BFA',
                            border: '1px solid rgba(124, 58, 237, 0.5)',
                          }
                    }
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
                    <div
                      className="absolute top-full left-0 mt-1 w-48 rounded-lg z-50 max-h-96 overflow-y-auto custom-scrollbar"
                      style={{
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        background: 'rgba(15, 15, 35, 0.95)',
                        border: '1px solid rgba(55, 48, 163, 0.6)',
                        boxShadow: '0 8px 32px rgba(124, 58, 237, 0.25)',
                      }}
                    >
                      <button
                        onClick={() => handleAuthorChange('all')}
                        className="w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg hover:bg-white/5"
                        style={{
                          color: selectedAuthor === 'all' ? '#A78BFA' : '#B4B4C5',
                          fontWeight: selectedAuthor === 'all' ? '600' : '400',
                          background: selectedAuthor === 'all' ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                        }}
                      >
                        全部博主
                      </button>
                      {currentAuthors.map((author, index) => (
                        <button
                          key={author.id}
                          onClick={() => handleAuthorChange(author.id)}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between hover:bg-white/5 ${
                            index === currentAuthors.length - 1 ? 'rounded-b-lg' : ''
                          }`}
                          style={{
                            color: selectedAuthor === author.id ? '#A78BFA' : '#B4B4C5',
                            fontWeight: selectedAuthor === author.id ? '600' : '400',
                            background: selectedAuthor === author.id ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
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

          {/* 右侧：更新时间 + 视图切换 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {lastUpdated && (
              <span className="text-sm text-textLight-300">
                更新于 {formatTime(lastUpdated)}
              </span>
            )}
            {/* 视图切换按钮 */}
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid rgba(55, 48, 163, 0.4)' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 transition-colors"
                title="网格视图"
                style={
                  viewMode === 'grid'
                    ? { background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: '#fff' }
                    : { background: 'rgba(30, 27, 75, 0.8)', color: '#B4B4C5' }
                }
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 transition-colors"
                title="列表视图"
                style={
                  viewMode === 'list'
                    ? { background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: '#fff' }
                    : { background: 'rgba(30, 27, 75, 0.8)', color: '#B4B4C5' }
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div
          className="rounded-xl p-12"
          style={{
            background: 'rgba(22, 33, 62, 0.7)',
            border: '1px solid rgba(55, 48, 163, 0.5)',
          }}
        >
          <div className="flex flex-col items-center justify-center">
            <div
              className="inline-block animate-spin rounded-full h-12 w-12 border-4"
              style={{
                borderColor: 'rgba(30, 27, 75, 0.8)',
                borderTopColor: '#7C3AED',
                boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)',
              }}
            />
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

      {/* 文章列表 */}
      {!loading && !error && articles.length > 0 && (
        <>
          {/* 网格视图 */}
          {viewMode === 'grid' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-xl overflow-hidden min-h-[200px] transition-[box-shadow,border-color] duration-200"
                style={{
                  background: article.thumbnail ? undefined : '#16213E',
                  backgroundImage: article.thumbnail
                    ? `url("${getProxiedImageUrl(article.thumbnail)}")`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(55, 48, 163, 0.5)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(124, 58, 237, 0.35), 0 4px 20px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(55, 48, 163, 0.5)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
                }}
              >
                {/* 背景遮罩层 */}
                <div className={`absolute inset-0 ${
                  article.thumbnail
                    ? 'bg-gradient-to-t from-black/95 via-black/70 to-black/40'
                    : getPlatformBg(article.platform)
                }`} />

                {/* 内容层 */}
                <div className="relative h-full p-5 flex flex-col justify-end">
                  {/* 顶部：分类标签 */}
                  <div className="absolute top-4 left-5 right-5 flex items-start justify-between">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-lg"
                      style={{
                        background: 'rgba(124, 58, 237, 0.25)',
                        color: '#A78BFA',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(124, 58, 237, 0.35)',
                      }}
                    >
                      {article.category}
                    </span>
                    <div className="text-primary-400 group-hover:text-primary-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>

                  {/* 底部：标题和信息 */}
                  <div className="pt-12">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors text-textLight-100">
                      {article.title}
                    </h3>
                    <p className="text-sm mb-3 line-clamp-2 text-textLight-200">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-md font-medium"
                          style={{
                            background: 'rgba(124, 58, 237, 0.2)',
                            color: '#A78BFA',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
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
                  <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none -mt-8"
                    style={{ color: 'rgba(124, 58, 237, 0.15)' }}
                  >
                    {article.platform === 'TFTips' ? (
                      <svg viewBox="0 0 94 23" className="w-32 h-32" style={{ fill: 'currentColor' }}>
                        <path style={{ fillOpacity: 1, strokeWidth: 0.242424 }} d="m 113.50683,2.4056419 c -1.57088,0.00273 -3.14001,0.969192 -6.53485,2.9027593 -6.78969,3.8671346 -6.5339,3.4296407 -6.52003,11.1402978 0.0139,7.710655 -0.24318,7.275112 6.56038,11.118633 6.80356,3.843522 6.28989,3.843806 13.07957,-0.02333 6.78969,-3.867135 6.5339,-3.429641 6.52003,-11.140296 -0.0139,-7.710657 0.244,-7.2742803 -6.55955,-11.1178021 -3.40179,-1.9217609 -4.97469,-2.8829925 -6.54555,-2.8802637 z m 0.12351,7.0894309 c 0.77684,-0.0013 1.55385,0.465287 3.23613,1.3988902 3.36456,1.867208 3.23751,1.655546 3.24437,5.401433 0.006,3.745885 0.13391,3.533584 -3.22378,5.412262 -3.3577,1.878679 -3.10442,1.878039 -6.46897,0.01084 -3.36456,-1.867207 -3.23751,-1.654713 -3.24437,-5.400599 -0.006,-3.745885 -0.13309,-3.533584 3.22461,-5.412263 1.67885,-0.9393392 2.45517,-1.4092282 3.23201,-1.4105542 z" transform="matrix(0.82933656,0,0,0.80530515,-82.645364,-1.7181152)" />
                      </svg>
                    ) : article.platform === 'TFTimes' ? (
                      <svg viewBox="0 0 24 24" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    ) : (
                      <div className="text-7xl">
                        {article.platform === 'YouTube' && (
                          <svg viewBox="0 0 24 24" className="w-24 h-24" fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8"/>
                            <path d="M10 9l5 3l-5 3l0 -6"/>
                          </svg>
                        )}
                        {article.platform === 'Bilibili' && (
                          <svg viewBox="0 0 24 24" className="w-24 h-24" fill="none" stroke="#00A1D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M3 10a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4v-6z" />
                            <path d="M8 3l2 3" />
                            <path d="M16 3l-2 3" />
                            <path d="M9 13v-2" />
                            <path d="M15 11v2" />
                          </svg>
                        )}
                        {article.platform === 'Tacter' && (
                          <svg viewBox="0 0 32 32" className="w-24 h-24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12.7458 0V6.50847H25.4915V19.2542C29.0117 19.2542 32 16.2659 32 12.7458V0H12.7458ZM0 12.7458H6.50847V19.2542C2.91342 19.2542 0 16.3408 0 12.7458ZM19.2542 12.7458V32H12.7458V12.7458H19.2542Z" fill="#F1E9D6"/>
                          </svg>
                        )}
                        {article.platform === 'Douyin' && (
                          <svg viewBox="0 0 24 24" className="w-24 h-24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917"/>
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </a>
            ))}
          </div>
          )}

          {/* 列表视图 */}
          {viewMode === 'list' && (
            <div className="flex flex-col gap-3">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-4 rounded-xl overflow-hidden transition-[box-shadow,border-color] duration-200"
                  style={{
                    background: 'rgba(22, 33, 62, 0.7)',
                    border: '1px solid rgba(55, 48, 163, 0.5)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.8)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.25), 0 4px 12px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(55, 48, 163, 0.5)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                  }}
                >
                  {/* 缩略图 */}
                  <div
                    className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden"
                    style={{ minHeight: '90px' }}
                  >
                    {article.thumbnail ? (
                      <img
                        src={getProxiedImageUrl(article.thumbnail)}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        style={{ minHeight: '90px' }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: '#16213E', minHeight: '90px', color: 'rgba(124, 58, 237, 0.25)' }}
                      >
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 py-3 pr-4 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-sm font-semibold mb-1 line-clamp-2 group-hover:text-primary-400 transition-colors text-textLight-100">
                        {article.title}
                      </h3>
                      <p className="text-xs text-textLight-200 line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md font-medium"
                          style={{
                            background: 'rgba(124, 58, 237, 0.2)',
                            color: '#A78BFA',
                          }}
                        >
                          {article.platform}
                        </span>
                        <span className="truncate max-w-[100px] text-textLight-200">{article.author}</span>
                      </div>
                      <span className="text-textLight-300">{formatTime(article.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* 加载更多指示器 */}
          {loadingMore && (
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center px-4 py-2 text-sm text-textLight-200">
                <div
                  className="inline-block animate-spin rounded-full h-5 w-5 border-2 mr-2"
                  style={{
                    borderColor: 'rgba(30, 27, 75, 0.8)',
                    borderTopColor: '#7C3AED',
                  }}
                />
                加载更多内容...
              </div>
            </div>
          )}

          {/* 无限滚动哨兵元素 */}
          {hasMore && !loadingMore && (
            <div ref={observerTarget} className="h-10 mt-8" />
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
        <div
          className="rounded-xl p-12"
          style={{
            background: 'rgba(22, 33, 62, 0.7)',
            border: '1px solid rgba(55, 48, 163, 0.5)',
          }}
        >
          <div className="text-center text-textLight-200">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(30, 27, 75, 0.8)' }}
            >
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
