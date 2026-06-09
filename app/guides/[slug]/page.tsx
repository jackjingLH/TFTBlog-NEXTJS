import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarkdownContent from '@/app/components/MarkdownContent';
import { formatDate, getAllGuides, getGuideBySlug } from '@/lib/guides';

interface GuideDetailPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export function generateMetadata({ params }: GuideDetailPageProps) {
  const guide = getGuideBySlug(params.slug);

  if (!guide) {
    return {
      title: '攻略不存在 - 铲什么铲',
    };
  }

  return {
    title: `${guide.title} - 铲什么铲`,
    description: guide.excerpt,
  };
}

export default function GuideDetailPage({ params }: GuideDetailPageProps) {
  const guide = getGuideBySlug(params.slug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#090d12] text-white">
      <article className="mx-auto max-w-3xl px-4 pb-12 pt-5 sm:px-6">
        <Link href="/guides" className="inline-flex min-h-11 items-center text-sm font-semibold text-cyan-200 hover:text-cyan-100">
          返回攻略库
        </Link>

        <header className="mt-3 border-b border-white/10 pb-6">
          <div className="flex flex-wrap gap-2">
            {guide.tags.slice(0, 6).map((tag) => (
              <span key={tag} className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-white">{guide.title}</h1>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
            <span>{formatDate(guide.updatedAt)} 更新</span>
            <span>{guide.readingMinutes} 分钟阅读</span>
            <span>来源：{guide.source}</span>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-300">{guide.excerpt}</p>
        </header>

        {guide.headings.length > 0 ? (
          <nav className="my-5 flex gap-2 overflow-x-auto border-b border-white/10 pb-4" aria-label="文章目录">
            {guide.headings.slice(0, 8).map((heading) => (
              <a
                key={`${heading.id}-${heading.text}`}
                href={`#${heading.id}`}
                className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
              >
                {heading.text}
              </a>
            ))}
          </nav>
        ) : null}

        <MarkdownContent content={guide.content} slug={guide.slug} />
      </article>
    </main>
  );
}
