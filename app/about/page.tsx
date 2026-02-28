const platforms = [
  { name: 'TFTimes', desc: '日本 TFT 资讯站', type: '资讯 / 攻略', color: '#A78BFA', borderColor: 'rgba(167,139,250,0.5)' },
  { name: 'TFTips', desc: '英文策略攻略社区', type: '攻略 / 阵容', color: '#A78BFA', borderColor: 'rgba(167,139,250,0.5)' },
  { name: 'B站', desc: '哔哩哔哩', type: '视频 / 直播', color: '#00A1D6', borderColor: 'rgba(0,161,214,0.5)' },
  { name: '抖音', desc: '短视频平台', type: '短视频', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' },
  { name: 'YouTube', desc: '海外攻略视频', type: '视频 / 攻略', color: '#FF4444', borderColor: 'rgba(255,68,68,0.5)' },
  { name: 'Tacter', desc: '海外 TFT 攻略站', type: '攻略 / 阵容', color: '#F1E9D6', borderColor: 'rgba(241,233,214,0.4)' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bgDark-800 flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 pt-16 pb-10">

        {/* 网站介绍区 */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(22, 33, 62, 0.7)',
            border: '1px solid rgba(55, 48, 163, 0.5)',
            boxShadow: '0 4px 24px rgba(124, 58, 237, 0.08)',
          }}
        >
          <h1
            className="text-3xl font-bold mb-2 bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 60%, #F43F5E 100%)' }}
          >
            关于本站
          </h1>
          <p className="text-textLight-300 text-sm mb-4">云顶之弈 / 金铲铲之战内容聚合平台</p>
          <p className="text-textLight-200 text-sm leading-relaxed">
            「铲什么铲」从全网优质内容创作者处聚合最新攻略、阵容解析和版本资讯，让你在一个地方找到所有想要的信息。省去刷视频、找帖子的时间，专注于提升段位。
          </p>
        </div>

        {/* 数据统计卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '内容平台', value: '6', unit: '个', color: '#A78BFA', glow: 'rgba(167,139,250,0.3)' },
            { label: '持续聚合', value: '实时', unit: '', color: '#F43F5E', glow: 'rgba(244,63,94,0.3)' },
            { label: '内容更新', value: '每日', unit: '', color: '#A78BFA', glow: 'rgba(167,139,250,0.3)' },
          ].map(({ label, value, unit, color, glow }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: 'rgba(22, 33, 62, 0.7)',
                border: `1px solid ${color}33`,
                boxShadow: `0 0 16px ${glow}`,
              }}
            >
              <div
                className="text-2xl font-black mb-0.5"
                style={{ color, textShadow: `0 0 12px ${glow}` }}
              >
                {value}
                {unit && <span className="text-sm font-medium ml-0.5">{unit}</span>}
              </div>
              <div className="text-xs text-textLight-300">{label}</div>
            </div>
          ))}
        </div>

        {/* 平台卡片网格 */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(22, 33, 62, 0.7)',
            border: '1px solid rgba(55, 48, 163, 0.5)',
          }}
        >
          <p className="text-xs text-textLight-300 mb-4 uppercase tracking-wider">数据来源平台</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="platform-card rounded-lg p-3"
                style={{
                  border: `1px solid rgba(55, 48, 163, 0.3)`,
                  borderLeft: `3px solid ${p.borderColor}`,
                }}
              >
                <div className="font-semibold text-sm mb-0.5" style={{ color: p.color }}>
                  {p.name}
                </div>
                <div className="text-xs text-textLight-300 mb-1">{p.desc}</div>
                <div
                  className="text-xs px-1.5 py-0.5 rounded inline-block"
                  style={{
                    background: `${p.color}18`,
                    color: p.color,
                    border: `1px solid ${p.color}33`,
                  }}
                >
                  {p.type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 小红书跳转卡片 */}
        <div className="group relative">
          <a
            href="https://www.xiaohongshu.com/user/profile/5cb2b50b0000000016014b2e?xsec_token=ABwG32rMJKQMVle4s0_ooVl1W9mkn3nniAVygilygoH-M%3D&xsec_source=pc_search"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-8 rounded-3xl xhs-card transition-all duration-300"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: 'rgba(22, 33, 62, 0.8)',
            }}
          >
            {/* 背景光晕 */}
            <div
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
            />
            <div className="relative text-center">
              {/* UP主头像 */}
              <div className="w-24 h-24 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <img
                  src="https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo3174k5eimjq305n5imk5liipeo5d5nuo?imageView2/2/w/540/format/webp|imageMogr2/strip2"
                  alt="铲什么铲"
                  className="w-full h-full rounded-full object-cover shadow-lg"
                  style={{
                    border: '3px solid rgba(124, 58, 237, 0.6)',
                    boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)',
                  }}
                />
              </div>
              <h2
                className="text-2xl font-bold mb-2 bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #A78BFA 100%)' }}
              >
                铲什么铲
              </h2>
              <p className="text-sm text-textLight-300">
                点击访问小红书主页 →
              </p>
            </div>
          </a>
        </div>

      </div>
    </main>
  );
}
