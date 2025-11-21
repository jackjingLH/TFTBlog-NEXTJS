import ArticleList from './components/ArticleList';
import { Article } from '@/types/article';

// 示例数据，后续将从 API 获取
const sampleArticles: Article[] = [
  {
    id: '1',
    title: '深入理解 React 18 的并发特性',
    source: '技术博客',
    url: 'https://example.com/article1',
    publishedAt: '2025-01-15',
    description: '本文深入探讨了 React 18 引入的并发渲染特性，包括自动批处理、Transitions 和 Suspense 的改进。',
  },
  {
    id: '2',
    title: 'Next.js 15 新特性全览',
    source: 'Next.js 官方',
    url: 'https://example.com/article2',
    publishedAt: '2025-01-10',
    description: 'Next.js 15 带来了许多激动人心的新特性，包括改进的缓存策略、更快的编译速度等。',
  },
  {
    id: '3',
    title: 'TypeScript 5.0 发布：装饰器正式支持',
    source: 'TypeScript 博客',
    url: 'https://example.com/article3',
    publishedAt: '2025-01-05',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            技术文章聚合
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            汇聚各大技术平台的优质文章
          </p>
        </div>
      </div>
      <ArticleList articles={sampleArticles} />
    </main>
  );
}
