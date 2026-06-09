import Link from 'next/link';
import Image from 'next/image';
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
      <article className="mx-auto min-w-0 max-w-3xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/guides"
          className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/40 hover:text-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#090d12]"
        >
          <span aria-hidden="true" className="mr-1.5">‹</span>
          攻略库
        </Link>

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
          {guide.cover ? (
            <figure className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
              <Image
                src={guide.cover}
                alt={`${guide.title} 封面`}
                width={900}
                height={520}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </figure>
          ) : null}
        </header>

        {guide.headings.length > 0 ? (
          <nav className="-mx-4 my-4 flex snap-x gap-2 overflow-x-auto border-b border-white/10 px-4 pb-4 sm:mx-0 sm:px-0" aria-label="文章目录">
            {guide.headings.slice(0, 8).map((heading) => (
              <a
                key={`${heading.id}-${heading.text}`}
                href={`#${heading.id}`}
                className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-cyan-200/35 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#090d12]"
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
