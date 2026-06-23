'use client';

import Image from 'next/image';
import Link from 'next/link';
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
}

interface GuideDetail extends GuideSummary {
  id: number;
  contentMarkdown: string;
  status: string;
  createdAt: string;
  modifiedAt: string;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

// Guide Card Component
function GuideCard({ guide }: { guide: GuideSummary }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      {guide.coverUrl && (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <Image
            src={guide.coverUrl}
            alt={guide.title}
            width={400}
            height={225}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}
      <div className="p-5">
        <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-accent transition-colors">
          {guide.title}
        </h3>
        <p className="text-text-secondary text-sm mb-3 line-clamp-2">
          {guide.excerpt}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {guide.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-accent-light text-accent rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
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
    fetch('/api/guides', { cache: 'no-store' })
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

  return (
    <main className="min-h-screen bg-background">
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

      {/* Guides Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">最新攻略</h2>

        {loading && <LoadingBlock />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// Guide List Shell
export function GuideListShell() {
  const [guides, setGuides] = useState<GuideSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/guides', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then((data) => {
        setGuides(data.guides || data);
        setLoading(false);
      })
      .catch(() => {
        setError('无法加载攻略列表');
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-text-primary">攻略列表</h1>
          <p className="mt-2 text-text-secondary">
            浏览所有 TFT 云顶之弈阵容攻略
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        {loading && <LoadingBlock />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// Guide Detail Shell
export function GuideDetailShell({ slug }: { slug: string }) {
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guides/${slug}`, { cache: 'no-store' })
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
  }, [slug]);

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
    <main className="min-h-screen bg-background">
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/guides"
          className="inline-flex items-center text-text-secondary hover:text-accent mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回攻略列表
        </Link>

        {/* Cover Image */}
        {guide.coverUrl && (
          <div className="mb-8 rounded-lg overflow-hidden border border-border">
            <Image
              src={guide.coverUrl}
              alt={guide.title}
              width={900}
              height={500}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        )}

        {/* Title and Meta */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            {guide.title}
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {guide.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-sm bg-accent-light text-accent rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>来源：{guide.source}</span>
            <span>更新：{formatDate(guide.updatedAt)}</span>
            <span>阅读时间：{guide.readingMinutes} 分钟</span>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <MarkdownContent markdown={guide.contentMarkdown} />
        </div>
      </article>
    </main>
  );
}
