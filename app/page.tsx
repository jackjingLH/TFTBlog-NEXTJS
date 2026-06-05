export default function Home() {
  return (
    <main className="min-h-[calc(100vh-10rem)] overflow-hidden bg-bgDark-800">
      <section className="relative isolate flex min-h-[calc(100vh-10rem)] items-center px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 -z-10 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(rgba(167, 139, 250, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(167, 139, 250, 0.08) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 78%, transparent)',
          }}
        />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary-400/35 bg-bgDark-700/60 px-3 py-1.5 text-sm text-primary-400">
              <span className="h-2 w-2 rounded-full bg-accent-500 shadow-[0_0_14px_rgba(244,63,94,0.85)]" />
              网站更新中
            </div>

            <h1 className="text-4xl font-bold leading-tight text-textLight-100 sm:text-6xl">
              铲什么铲正在重建
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-textLight-200 sm:text-lg">
              我们正在整理新版 TFT 攻略内容、页面结构和后台工具。正式上线后，这里会恢复阵容攻略、版本更新和内容管理能力。
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_18px_rgba(124,58,237,0.35)] transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-bgDark-800"
              >
                管理后台
              </a>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border/70 px-5 py-3 text-sm font-semibold text-textLight-200 transition hover:border-primary-400 hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-bgDark-800"
              >
                备案信息
              </a>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-[2rem] border border-primary-400/25 bg-bgDark-700/70 shadow-[0_24px_80px_rgba(0,0,0,0.35)]" />
            <div className="absolute inset-6 rounded-2xl border border-border/60 bg-bgDark-800/80 p-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <span className="text-sm font-medium text-textLight-200">Release Board</span>
                <span className="rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-500">
                  Rebuild
                </span>
              </div>

              <div className="mt-7 space-y-5">
                {[
                  ['内容结构', '进行中', '72%'],
                  ['页面体验', '设计中', '54%'],
                  ['后台工具', '整理中', '38%'],
                ].map(([label, status, width]) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-textLight-100">{label}</span>
                      <span className="text-textLight-300">{status}</span>
                    </div>
                    <div className="h-2 rounded-full bg-bgDark-600">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                        style={{ width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-primary-400/25 bg-primary-500/10 px-4 py-3">
                <p className="text-sm leading-6 text-textLight-200">
                  新版首页会优先展示可浏览、可搜索、可持续维护的 TFT 攻略内容。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
