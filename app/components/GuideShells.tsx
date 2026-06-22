'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import MarkdownContent from './MarkdownContent';

interface GuideSummary {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  source: string;
  updatedAt: string;
  publishedAt: string | null;
  readingMinutes: number;
  tags: string[];
}

interface GuideDetail extends GuideSummary {
  id: number;
  contentMarkdown: string;
  status: string;
  createdAt: string;
  modifiedAt: string;
}

const featureLabels = ['移动端阅读', '阵容攻略', '资料查询'];

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

function slugifyHeading(text: string) {
  return text
    .replace(/[`*_#]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function getHeadings(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (!match) return null;
      const text = match[2].trim();
      return { id: slugifyHeading(text), text };
    })
    .filter((heading): heading is { id: string; text: string } => Boolean(heading));
}

function GuideCover({ guide, compact = false }: { guide: Pick<GuideSummary, 'title' | 'coverUrl'>; compact?: boolean }) {
  if (!guide.coverUrl) return null;

  return (
    <Image
      src={guide.coverUrl}
      alt={`${guide.title} 封面`}
      width={compact ? 240 : 900}
      height={compact ? 180 : 520}
      className={compact ? 'h-full min-h-[92px] w-full object-cover' : 'h-auto w-full object-contain'}
      unoptimized
    />
  );
}

function LoadingBlock({ label = '内容加载中' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
      {label}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100">
      {message}
    </div>
  );
}

function useGuideSummaries() {
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch('/api/guides', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`攻略加载失败：${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setGuides(Array.isArray(data.guides) ? data.guides : []);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : '攻略加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { guides, loading, error };
}

export function HomeGuideShell() {
  const { guides, loading, error } = useGuideSummaries();
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
              <a href="/guides" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#0d141b]">
                看攻略
              </a>
              <a href="/data" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d141b]">
                查资料
              </a>
            </div>
          </div>

          {loading ? <LoadingBlock label="推荐攻略加载中" /> : null}
          {error ? <ErrorBlock message={error} /> : null}
          {!loading && !error && featured ? (
            <a href={`/guides/${featured.slug}`} className="block rounded-lg border border-white/10 bg-[#111b24] p-4 transition hover:border-cyan-200/40">
              {featured.coverUrl ? (
                <div className="mb-4 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                  <GuideCover guide={featured} />
                </div>
              ) : null}
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
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Latest</p>
            <h2 className="mt-2 text-2xl font-bold">最新攻略</h2>
          </div>
          <a href="/guides" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            全部
          </a>
        </div>

        {!loading && !error && guides.length === 0 ? <LoadingBlock label="攻略内容准备中" /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {latestGuides.map((guide) => (
            <a key={guide.slug} href={`/guides/${guide.slug}`} className="grid grid-cols-[92px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-cyan-200/35 sm:p-4">
              {guide.coverUrl ? (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                  <GuideCover guide={guide} compact />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="truncate">{guide.source}</span>
                  <span className="shrink-0">{guide.readingMinutes} 分钟</span>
                </div>
                <h3 className="mt-2 break-words text-xl font-semibold leading-snug text-white">{guide.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export function GuidesListShell() {
  const { guides, loading, error } = useGuideSummaries();
  const tags = useMemo(() => Array.from(new Set(guides.flatMap((guide) => guide.tags))).slice(0, 14), [guides]);

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
        {loading ? <LoadingBlock label="攻略库加载中" /> : null}
        {error ? <ErrorBlock message={error} /> : null}
        {!loading && !error && guides.length === 0 ? <LoadingBlock label="攻略内容准备中" /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {guides.map((guide) => (
            <a key={guide.slug} href={`/guides/${guide.slug}`} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition hover:border-cyan-200/35">
              {guide.coverUrl ? (
                <div className="border-b border-white/10 bg-slate-950">
                  <GuideCover guide={guide} />
                </div>
              ) : null}
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span className="truncate">{guide.source}</span>
                  <span className="shrink-0">{formatDate(guide.updatedAt)}</span>
                </div>
                <h2 className="mt-3 break-words text-2xl font-bold leading-snug text-white">{guide.title}</h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {guide.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export function GuideDetailShell() {
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = window.location.pathname.replace(/^\/guides\/+/, '').replace(/\/+$/, '');
    let active = true;

    fetch(`/api/guides/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((response) => {
        if (response.status === 404) throw new Error('这篇攻略暂时不存在');
        if (!response.ok) throw new Error(`攻略加载失败：${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setGuide(data.guide || null);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : '攻略加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const headings = useMemo(() => (guide ? getHeadings(guide.contentMarkdown) : []), [guide]);

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <article className="mx-auto min-w-0 max-w-3xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        <a href="/guides" className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/40 hover:text-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#090d12]">
          <span aria-hidden="true" className="mr-1.5">‹</span>
          攻略库
        </a>

        {loading ? <div className="mt-4"><LoadingBlock label="攻略正文加载中" /></div> : null}
        {error ? <div className="mt-4"><ErrorBlock message={error} /></div> : null}
        {!loading && !error && guide ? (
          <>
            <header className="mt-4 min-w-0 border-b border-white/10 pb-5 sm:pb-7">
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {guide.tags.slice(0, 6).map((tag) => (
                  <span key={tag} className="shrink-0 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="mt-4 break-words text-[2rem] font-bold leading-tight text-white sm:text-4xl">{guide.title}</h1>
              <div className="mt-4 grid gap-2 text-sm text-slate-400 sm:flex sm:flex-wrap sm:gap-x-4">
                <span>{formatDate(guide.updatedAt)} 更新</span>
                <span>{guide.readingMinutes} 分钟阅读</span>
                <span>来源：{guide.source}</span>
              </div>
              <p className="mt-4 text-base leading-7 text-slate-300">{guide.excerpt}</p>
              {guide.coverUrl ? (
                <figure className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                  <GuideCover guide={guide} />
                </figure>
              ) : null}
            </header>

            {headings.length > 0 ? (
              <nav className="-mx-4 my-4 flex snap-x gap-2 overflow-x-auto border-b border-white/10 px-4 pb-4 sm:mx-0 sm:px-0" aria-label="文章目录">
                {headings.slice(0, 8).map((heading) => (
                  <a key={`${heading.id}-${heading.text}`} href={`#${heading.id}`} className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-cyan-200/35 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#090d12]">
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : null}

            <MarkdownContent content={guide.contentMarkdown} slug={guide.slug} />
          </>
        ) : null}
      </article>
    </main>
  );
}
