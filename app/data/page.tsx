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
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-text-primary">资料查询</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            初版先保留轻入口，后续逐步接英雄、羁绊、装备、强化符文数据，不做高操作量工具。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2">
        {dataSections.map((section) => (
          <article key={section.title} className="rounded-lg border border-border bg-surface p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-2xl font-bold text-text-primary">{section.title}</h2>
              <span className="rounded-full border border-accent/20 bg-accent-light px-3 py-1 text-xs text-accent font-medium">
                {section.status}
              </span>
            </div>
            <p className="text-sm leading-6 text-text-secondary">{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
