const dataSections = [
  {
    title: '英雄',
    body: '费用、羁绊、定位与常用装备。',
    status: '整理中',
  },
  {
    title: '羁绊',
    body: '羁绊层级、触发人数和阵容入口。',
    status: '整理中',
  },
  {
    title: '装备',
    body: '成装方向、适配主 C 与前排承接。',
    status: '整理中',
  },
  {
    title: '强化符文',
    body: '经济、战力、专属强化和开局条件。',
    status: '整理中',
  },
];

export const metadata = {
  title: '资料 - 铲什么铲',
  description: 'TFT 资料查询入口。',
};

export default function DataPage() {
  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <section className="border-b border-white/10 bg-[#0d141b] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Data</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">资料查询</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            初版先保留轻入口，后续逐步接英雄、羁绊、装备、强化符文数据，不做高操作量工具。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:px-8">
        {dataSections.map((section) => (
          <article key={section.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
              <span className="rounded border border-amber-200/20 bg-amber-200/10 px-2 py-1 text-xs text-amber-100">
                {section.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
