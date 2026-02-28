import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-bgDark-800 mt-auto">
      {/* 紫→玫红渐变分割线 */}
      <div
        className="w-full h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #7C3AED 30%, #F43F5E 70%, transparent 100%)',
          boxShadow: '0 0 8px rgba(124, 58, 237, 0.3)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 三列网格 - 桌面；移动端垂直堆叠 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* 第一列：品牌 */}
          <div>
            <div
              className="text-lg font-bold mb-2 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #F43F5E 100%)' }}
            >
              铲什么铲
            </div>
            <p className="text-sm text-textLight-300 leading-relaxed">
              云顶之弈 / 金铲铲之战<br />全网攻略一站直达
            </p>
          </div>

          {/* 第二列：快速导航 */}
          <div>
            <h3 className="text-xs font-semibold text-textLight-300 uppercase tracking-wider mb-3">
              快速导航
            </h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: '首页' },
                { href: '/guides', label: '攻略列表' },
                { href: '/about', label: '关于本站' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-textLight-200 hover:text-primary-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 第三列：内容平台 */}
          <div>
            <h3 className="text-xs font-semibold text-textLight-300 uppercase tracking-wider mb-3">
              内容平台
            </h3>
            <ul className="space-y-2">
              {[
                { label: 'TFTimes', color: '#A78BFA' },
                { label: 'TFTips', color: '#A78BFA' },
                { label: 'B站 Bilibili', color: '#00A1D6' },
                { label: 'YouTube', color: '#FF4444' },
                { label: '抖音', color: '#ffffff' },
                { label: 'Tacter', color: '#F1E9D6' },
              ].map(({ label, color }) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                  />
                  <span className="text-sm text-textLight-200">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 底部版权行 */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-textLight-300"
          style={{ borderTop: '1px solid rgba(55, 48, 163, 0.3)' }}
        >
          <p>© {new Date().getFullYear()} TFT金铲铲博客 · 专注于云顶之弈内容聚合</p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-400 transition-colors"
          >
            闽ICP备2026003321号
          </a>
        </div>
      </div>
    </footer>
  );
}
