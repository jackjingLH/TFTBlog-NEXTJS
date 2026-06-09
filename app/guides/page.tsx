import Link from 'next/link';
import { formatDate, getAllGuides } from '@/lib/guides';

export const metadata = {
  title: '攻略 - 铲什么铲',
  description: 'TFT 阵容攻略、运营节奏与强化符文整理。',
};

export default function GuidesPage() {
  const guides = getAllGuides();
  const tags = Array.from(new Set(guides.flatMap((guide) => guide.tags))).slice(0, 14);

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <section className="border-b border-white/10 bg-[#0d141b] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Guides</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">攻略库</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            先收敛为移动端单列阅读流，重点展示阵容思路、装备优先级、运营阶段和可用条件。
          </p>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tags.map((tag) => (
              <span key={tag} className="shrink-0 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-200/35"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{guide.source}</span>
                <span>{formatDate(guide.updatedAt)}</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-snug text-white">{guide.title}</h2>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {guide.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
