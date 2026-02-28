import GuidesList from './components/GuidesList';

export default function Home() {
  return (
    <main className="min-h-screen bg-bgDark-800 scanline">

      {/* Hero 区域 */}
      <div
        className="relative border-b overflow-hidden"
        style={{
          borderColor: 'rgba(55, 48, 163, 0.5)',
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 39px,
              rgba(124,58,237,0.04) 39px,
              rgba(124,58,237,0.04) 40px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 39px,
              rgba(124,58,237,0.04) 39px,
              rgba(124,58,237,0.04) 40px
            )
          `,
        }}
      >
        {/* 背景装饰光晕球 */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-80px',
            left: '-120px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: 0.6,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-60px',
            right: '-100px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            opacity: 0.5,
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">

          {/* 游戏名称并列 */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <span
              className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #A78BFA 100%)',
                filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.3))',
              }}
            >
              云顶之弈
            </span>
            <span className="text-textLight-300 text-3xl font-light">/</span>
            <span
              className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #A78BFA 100%)',
                filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.3))',
              }}
            >
              金铲铲之战
            </span>
          </div>

          {/* 核心标语 */}
          <p
            className="font-semibold text-lg sm:text-xl tracking-wide mb-5"
            style={{
              color: '#F43F5E',
              textShadow: '0 0 12px rgba(244,63,94,0.5)',
            }}
          >
            全网攻略，一站直达
          </p>

          {/* 数据统计徽章行 */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
            {[
              { label: '6 个内容平台', color: '#A78BFA', glow: 'rgba(167,139,250,0.3)' },
              { label: '实时内容聚合', color: '#F43F5E', glow: 'rgba(244,63,94,0.3)' },
              { label: '每日持续更新', color: '#A78BFA', glow: 'rgba(167,139,250,0.3)' },
            ].map(({ label, color, glow }) => (
              <span
                key={label}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(22, 33, 62, 0.8)',
                  border: `1px solid ${color}55`,
                  color,
                  boxShadow: `0 0 8px ${glow}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mr-2"
                  style={{ background: color, boxShadow: `0 0 4px ${glow}` }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* 俏皮描述 */}
          <p className="text-textLight-200 text-base sm:text-lg leading-relaxed mb-8">
            攻略太分散？高手藏得太深？<br />
            别找了，都在这。
          </p>

          {/* CTA 按钮 */}
          <a
            href="#guides"
            className="cta-rose-btn inline-flex items-center gap-2 px-7 py-3 rounded-xl text-base font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
            }}
          >
            开始浏览
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

        </div>
      </div>

      {/* 攻略聚合列表 */}
      <div id="guides" className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GuidesList initialLimit={20} />
        </div>
      </div>

    </main>
  );
}
