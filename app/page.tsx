import FeedList from './components/FeedList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 页面头部 */}
      <div className="py-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            金铲铲博客
          </h1>
          <p className="text-blue-100 text-lg">
            云顶之弈攻略聚合 · 每日更新最新内容
          </p>
        </div>
      </div>

      {/* TFT 攻略聚合区域 */}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeedList initialLimit={15} />
        </div>
      </div>
    </main>
  );
}
