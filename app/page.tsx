import GuidesList from './components/GuidesList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* TFT 攻略聚合区域 - 全屏高度 */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GuidesList initialLimit={20} />
        </div>
      </div>
    </main>
  );
}
