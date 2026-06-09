import Link from 'next/link';
import { formatDate, getAllGuides } from '@/lib/guides';

const featureLabels = ['移动端阅读', '阵容攻略', '资料查询'];

export default function Home() {
  const guides = getAllGuides();
  const featured = guides[0];
  const latestGuides = guides.slice(1, 5);

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <section className="border-b border-white/10 bg-[#0d141b]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-8 pt-7 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="flex flex-col justify-end">
            <div className="flex flex-wrap gap-2">
              {featureLabels.map((label) => (
                <span key={label} className="rounded border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1 text-xs text-cyan-100">
                  {label}
                </span>
              ))}
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
              铲什么铲
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              先做适合手机阅读的 TFT 攻略站。首页突出当前可玩的阵容、运营节奏和资料入口，减少复杂操作，把内容浏览跑顺。
            </p>

            <div className="mt-6 flex gap-3">
              <Link
                href="/guides"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#0d141b]"
              >
                看攻略
              </Link>
              <Link
                href="/data"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d141b]"
              >
                查资料
              </Link>
            </div>
          </div>

          {featured ? (
            <Link
              href={`/guides/${featured.slug}`}
              className="block rounded-lg border border-white/10 bg-[#111b24] p-4 transition hover:border-cyan-200/40"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>推荐攻略</span>
                <span>{formatDate(featured.updatedAt)}</span>
              </div>
              <h2 className="mt-5 text-3xl font-bold leading-tight text-white">{featured.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">{featured.excerpt}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {featured.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Latest</p>
            <h2 className="mt-2 text-2xl font-bold">最新攻略</h2>
          </div>
          <Link href="/guides" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            全部
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {latestGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-200/35"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{guide.source}</span>
                <span>{guide.readingMinutes} 分钟</span>
              </div>
              <h3 className="mt-3 text-xl font-semibold leading-snug text-white">{guide.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
