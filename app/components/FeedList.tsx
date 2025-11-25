'use client';

import { useState, useEffect } from 'react';
import { FeedArticle } from '@/types/feed';

interface FeedListProps {
  initialLimit?: number;
}

export default function FeedList({ initialLimit = 10 }: FeedListProps) {
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sources = ['all', '荡狗天天开心', '手刃猫咪', '襄平霸王东'];

  // 获取文章数据
  const fetchArticles = async (source: string = 'all') => {
    setLoading(true);
    setError('');

    try {
      const url =
        source === 'all'
          ? `/api/feeds?limit=${initialLimit}`
          : `/api/feeds?source=${source}&limit=${initialLimit}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'success') {
        setArticles(data.data);
        if (data.lastUpdated) {
          setLastUpdated(new Date(data.lastUpdated));
        }
      } else {
        setError(data.message || '获取文章失败');
      }
    } catch (err: any) {
      setError('网络错误，请稍后重试');
      console.error('获取文章失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchArticles(selectedSource);
  }, []);

  // 切换数据源
  const handleSourceChange = (source: string) => {
    setSelectedSource(source);
    fetchArticles(source);
  };

  // 手动刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const res = await fetch('/api/feeds/refresh', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        // 刷新成功，重新获取文章
        await fetchArticles(selectedSource);
        alert(`✅ 刷新成功！共获取 ${data.count} 篇文章`);
      } else {
        alert(`❌ 刷新失败: ${data.message}`);
      }
    } catch (error: any) {
      alert(`❌ 刷新失败: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
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

  return (
    <div className="w-full">
      {/* 标题和筛选 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            最新攻略聚合
          </h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              更新于 {formatTime(lastUpdated)}
            </p>
          )}
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
          {refreshing ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {/* 来源筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sources.map((source) => (
          <button
            key={source}
            onClick={() => handleSourceChange(source)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedSource === source
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {source === 'all' ? '全部' : source}
          </button>
        ))}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600 mt-4">加载中...</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 文章列表 */}
      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无文章数据，请稍后再试
        </div>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {article.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {article.source}
                    </span>
                    <span>{formatTime(article.publishedAt)}</span>
                  </div>
                </div>

                {/* 外链图标 */}
                <div className="ml-4 text-gray-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      {!loading && articles.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          显示近一个月内的最新内容
        </div>
      )}
    </div>
  );
}
