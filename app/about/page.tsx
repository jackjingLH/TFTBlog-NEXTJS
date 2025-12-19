'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Stats {
  totalPosts: number;
  totalCategories: number;
  dailyUpdates: number;
  supportedLanguages: number;
}

interface AboutData {
  title: string;
  description: string;
  content: string;
  features: Feature[];
  stats: Stats;
  updatedAt: string;
}

export default function AboutPage() {
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAboutData() {
      try {
        const response = await fetch('/api/about');
        const result = await response.json();

        if (result.status === 'success') {
          setAboutData(result.data);
        } else {
          setError(result.message || '获取数据失败');
        }
      } catch (err) {
        setError('网络请求失败');
        console.error('获取关于页面数据失败:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAboutData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-gray-200 dark:border-gray-800 rounded-full"></div>
          <div className="w-16 h-16 border-2 border-t-transparent border-blue-500 rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            加载失败
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!aboutData) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {aboutData.title}
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {aboutData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {aboutData.stats.totalCategories}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">内容分类</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {aboutData.stats.dailyUpdates}+
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">每日更新</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {aboutData.stats.supportedLanguages}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">支持语言</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">24/7</div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">实时更新</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {aboutData.features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white dark:bg-gray-950 rounded-3xl p-8 sm:p-12 border border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {aboutData.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2024 TFT金铲铲博客. 专注于云顶之弈内容聚合
          </p>
        </div>
      </section>
    </main>
  );
}
