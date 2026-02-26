import GuidesList from './components/GuidesList';

export default function Home() {
  return (
    <main className="min-h-screen bg-bgDark-800">

      {/* Hero 区域 */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">

          {/* 游戏名称并列 */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="text-4xl sm:text-5xl font-bold text-textLight-100">云顶之弈</span>
            <span className="text-textLight-300 text-3xl font-light">/</span>
            <span className="text-4xl sm:text-5xl font-bold text-textLight-100">金铲铲之战</span>
          </div>

          {/* 核心标语 */}
          <p className="text-primary-400 font-semibold text-lg sm:text-xl tracking-wide mb-5">
            全网攻略，一站直达
          </p>

          {/* 俏皮描述 */}
          <p className="text-textLight-300 text-base sm:text-lg leading-relaxed">
            攻略太分散？高手藏得太深？<br />
            别找了，都在这。
          </p>

        </div>
      </div>

      {/* 攻略聚合列表 */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GuidesList initialLimit={20} />
        </div>
      </div>

    </main>
  );
}
