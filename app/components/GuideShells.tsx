'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  pinned?: boolean;
}

interface GuideDetail extends GuideSummary {
  id: number;
  contentMarkdown: string;
  status: string;
  createdAt: string;
  modifiedAt: string;
}

const staticGuideShellSlug = '__guide_shell__';
const guideShellRevision = '2026-06-24-guide-runtime-pathname';

function getGuideSlugFromPathname(pathname: string | null) {
  const parts = (pathname || '').split('/').filter(Boolean);
  const guidesIndex = parts.indexOf('guides');
  const slug = guidesIndex >= 0 ? parts[guidesIndex + 1] : null;

  if (!slug) return null;

  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

// Featured Guide Card Component (AIHero Editorial Style)
export function FeaturedGuideCard({ guide }: { guide: GuideSummary }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Cover - Desktop: 40-45% width, Mobile: full width on top */}
        {guide.coverUrl ? (
          <div className="w-full sm:w-[42%] aspect-[16/8.4] bg-gray-100 overflow-hidden flex-shrink-0">
            <Image
              src={guide.coverUrl}
              alt={guide.title}
              width={600}
              height={400}
              className="w-full h-full object-cover object-left"
              unoptimized
            />
          </div>
        ) : (
          <div
            data-testid="featured-cover-placeholder"
            className="w-full sm:w-[42%] aspect-[16/8.4] bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center flex-shrink-0"
          >
            <span className="text-gray-400 text-3xl font-semibold">TFT</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
          {/* Pin Badge (optional) */}
          {guide.pinned && (
            <div className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit mb-3">
              📌 精选推荐
            </div>
          )}

          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
            {guide.title}
          </h3>

          <p className="text-gray-600 text-base mb-4 line-clamp-3">
            {guide.excerpt}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {guide.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>来源：{guide.source}</span>
            <span>更新：{formatDate(guide.updatedAt)}</span>
            <span>阅读：{guide.readingMinutes} 分钟</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Regular Guide Card Component (AIHero Editorial Style)
export function RegularGuideCard({ guide }: { guide: GuideSummary }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 relative"
    >
      {/* Pin Indicator */}
      {guide.pinned && (
        <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white px-2 py-0.5 text-xs rounded flex items-center gap-1">
          📌 置顶
        </div>
      )}

      {guide.coverUrl ? (
        <div className="aspect-[16/8.4] bg-gray-100 overflow-hidden">
          <Image
            src={guide.coverUrl}
            alt={guide.title}
            width={400}
            height={225}
            className="w-full h-full object-cover object-left"
            unoptimized
          />
        </div>
      ) : (
        <div
          data-testid="cover-placeholder"
          className="aspect-[16/8.4] bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center"
        >
          <span className="text-gray-400 text-2xl font-semibold">TFT</span>
        </div>
      )}
      <div className="p-5">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {guide.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {guide.excerpt}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {guide.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{guide.source}</span>
          <span>{formatDate(guide.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// Loading Component
function LoadingBlock() {
  return (
    <div className="text-center py-12">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
      <p className="mt-4 text-text-secondary">加载中...</p>
    </div>
  );
}

// Error Component
function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {message}
    </div>
  );
}

// Home Page Shell
export function HomeGuideShell() {
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/guides?limit=50', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then((data) => {
        setGuides(data.guides || data);
        setLoading(false);
      })
      .catch(() => {
        setError('无法加载攻略');
        setLoading(false);
      });
  }, []);

  const pinnedGuides = guides.filter(g => g.pinned);
  const regularGuides = guides.filter(g => !g.pinned);

  return (
    <main className="min-h-screen bg-background" data-guide-shell-revision={guideShellRevision}>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-surface to-background border-b border-border py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-text-primary mb-4">
            铲什么铲
          </h1>
          <p className="text-xl text-text-secondary">
            TFT 云顶之弈攻略 · 阵容推荐 · 数据查询
          </p>
        </div>
      </section>

      {loading && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <LoadingBlock />
        </section>
      )}

      {error && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <ErrorBlock message={error} />
        </section>
      )}

      {!loading && !error && (
        <>
          {/* Pinned Guides Section */}
          {pinnedGuides.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 py-12 border-b border-border">
              <h2 className="text-2xl font-bold text-text-primary mb-6">精选攻略</h2>
              <div className="space-y-6">
                {pinnedGuides.map((guide) => (
                  <FeaturedGuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          )}

          {/* Regular Guides Section */}
          {regularGuides.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 py-12">
              <h2 className="text-2xl font-bold text-text-primary mb-6">
                {pinnedGuides.length > 0 ? '更多攻略' : '最新攻略'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularGuides.map((guide) => (
                  <RegularGuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

// Guide List Shell
export function GuideListShell() {
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchGuides = async (pageNum: number, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true);

      const res = await fetch(`/api/guides?page=${pageNum}&limit=12`, { cache: 'no-store' });
      if (!res.ok) throw new Error('加载失败');

      const data = await res.json();

      if (append) {
        setGuides(prev => [...prev, ...(data.guides || [])]);
      } else {
        setGuides(data.guides || []);
      }

      setHasMore(data.pagination?.hasMore || false);
      setLoading(false);
      setLoadingMore(false);
    } catch {
      setError('无法加载攻略列表');
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchGuides(1, false);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGuides(nextPage, true);
  };

  // Featured guide selection: prioritize pinned, fallback to first guide
  const featuredGuide = guides.find(g => g.pinned) || guides[0];
  const regularGuides = featuredGuide ? guides.filter(g => g.slug !== featuredGuide.slug) : guides;

  return (
    <main className="min-h-screen bg-background" data-guide-shell-revision={guideShellRevision}>
      {/* Page Intro */}
      <section className="border-b border-gray-100 bg-white px-4 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            云顶之弈攻略精选
          </h1>
          <p className="text-lg text-gray-600">
            最新阵容推荐与策略分析
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {loading && <LoadingBlock />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && featuredGuide && (
          <>
            {/* Featured Section */}
            <section className="py-12">
              <FeaturedGuideCard guide={featuredGuide} />
            </section>

            {/* Regular Guides Section */}
            {regularGuides.length > 0 && (
              <section className="py-8">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-6">
                  最新攻略
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularGuides.map((guide) => (
                    <RegularGuideCard key={guide.slug} guide={guide} />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-12">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Guide Detail Shell
export function GuideDetailShell({ slug }: { slug: string }) {
  const pathname = usePathname();
  const pathnameSlug = getGuideSlugFromPathname(pathname);
  const effectiveSlug = slug === staticGuideShellSlug ? pathnameSlug : slug;
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveSlug || effectiveSlug === staticGuideShellSlug) {
      setError('无法加载攻略详情');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/guides/${effectiveSlug}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then((data) => {
        setGuide(data.guide || data);
        setLoading(false);
      })
      .catch(() => {
        setError('无法加载攻略详情');
        setLoading(false);
      });
  }, [effectiveSlug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-4">
          <LoadingBlock />
        </div>
      </main>
    );
  }

  if (error || !guide) {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="max-w-4xl mx-auto px-4">
          <ErrorBlock message={error || '攻略不存在'} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background" data-guide-shell-revision={guideShellRevision}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/guides"
          className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回攻略列表
        </Link>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          {guide.title}
        </h1>

        {/* Meta Information */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {guide.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>来源：{guide.source}</span>
            <span>更新：{formatDate(guide.updatedAt)}</span>
            <span>阅读：{guide.readingMinutes} 分钟</span>
          </div>
        </div>

        {/* Hero Cover Image */}
        {guide.coverUrl && (
          <div className="mb-8 rounded-lg overflow-hidden border border-gray-100">
            <Image
              src={guide.coverUrl}
              alt={guide.title}
              width={1200}
              height={600}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Article Content - Narrower Width */}
      <article className="max-w-3xl mx-auto px-4 pb-12">
        <div className="prose prose-lg max-w-none">
          <MarkdownContent markdown={guide.contentMarkdown} />
        </div>
      </article>
    </main>
  );
}
