import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getAllGuides, getGuideBySlug } from '@/lib/guides';
import Link from 'next/link';
import GuideSidebar from './GuideSidebar';
import ReadingProgress from '@/app/components/ReadingProgress';
import BackToTop from '@/app/components/BackToTop';

// 生成静态路径
export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

// 生成每篇攻略的独立 SEO 元数据
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = getGuideBySlug(params.slug);
  if (!guide) return {};

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://47.99.202.3';
  const description = guide.description || `${guide.title} - 云顶之弈攻略`;

  return {
    title: guide.title,
    description,
    keywords: [...(guide.tags || []), '云顶之弈', '金铲铲之战', 'TFT攻略'],
    openGraph: {
      title: guide.title,
      description,
      url: `${baseUrl}/guides/${params.slug}`,
      type: 'article',
      ...(guide.cover ? { images: [`${baseUrl}/guides/${params.slug}/${guide.cover}`] } : {}),
    },
    alternates: {
      canonical: `${baseUrl}/guides/${params.slug}`,
    },
  };
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuideBySlug(params.slug);
  const allGuides = getAllGuides();

  if (!guide) {
    notFound();
  }

  // 计算上一篇 / 下一篇
  const currentIndex = allGuides.findIndex((g) => g.slug === params.slug);
  const prevGuide = currentIndex > 0 ? allGuides[currentIndex - 1] : null;
  const nextGuide = currentIndex < allGuides.length - 1 ? allGuides[currentIndex + 1] : null;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0F0F23 0%, #111827 50%, #0F0F23 100%)' }}
    >
      {/* 阅读进度条 */}
      <ReadingProgress />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8 flex-col lg:flex-row">

          {/* 左侧目录 - 桌面粘性 + 移动端抽屉 */}
          <GuideSidebar allGuides={allGuides} currentSlug={params.slug} />

          {/* 右侧内容 */}
          <main
            className="w-full lg:flex-1 rounded-xl shadow-lg overflow-hidden"
            style={{
              background: 'rgba(15, 15, 35, 0.6)',
              border: '1px solid rgba(55, 48, 163, 0.4)',
              maxWidth: '750px',
              margin: '0 auto',
            }}
          >
            {/* 文章头部 */}
            <header
              className="mb-8 pb-6 px-8 pt-8"
              style={{ borderBottom: '2px solid rgba(124, 58, 237, 0.3)' }}
            >
              {/* 标签 badge - 玫红色系 */}
              {guide.tags && guide.tags.length > 0 && (
                <div className="flex gap-3 mb-4">
                  {guide.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-1 text-sm font-semibold rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, rgba(244,63,94,0.85), rgba(225,29,72,0.85))',
                        color: '#fff',
                        border: '1px solid rgba(244,63,94,0.6)',
                        boxShadow: '0 3px 10px rgba(244,63,94,0.3)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1
                className="text-5xl font-black mb-4"
                style={{
                  color: '#ffffff',
                  letterSpacing: '2px',
                  lineHeight: '1.3',
                  textShadow: '0 0 30px rgba(167,139,250,0.2)',
                }}
              >
                {guide.title}
              </h1>
              <p className="text-lg mb-4" style={{ color: '#d4d4d4' }}>
                {guide.description}
              </p>

              {/* 封面图 */}
              {guide.cover && (
                <div className="my-6">
                  <img
                    src={`/guides/${params.slug}/${guide.cover}`}
                    alt={guide.title}
                    className="rounded-lg shadow-md w-full"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              )}

              <div className="flex items-center gap-4 text-sm" style={{ color: '#A78BFA' }}>
                <span>来源：{guide.source}</span>
              </div>
            </header>

            {/* Markdown 内容 */}
            <article className="prose prose-lg max-w-none px-8 pb-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ node, ...props }) => null,

                  // h2 - 紫色渐变 + 左侧 neon 边框
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-2xl font-bold mt-6 mb-4 pl-6 py-2"
                      style={{
                        color: '#A78BFA',
                        background: 'linear-gradient(90deg, rgba(124,58,237,0.08) 0%, transparent 100%)',
                        borderLeft: '4px solid #7C3AED',
                        borderTop: '1px solid rgba(124,58,237,0.1)',
                        borderBottom: '1px solid rgba(124,58,237,0.1)',
                        boxShadow: '-4px 0 12px rgba(124,58,237,0.2)',
                      }}
                      {...props}
                    />
                  ),

                  // h3 - 紫色 + 左侧边框
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-xl font-bold mt-5 mb-3 pl-6 py-1"
                      style={{
                        color: '#A78BFA',
                        background: 'linear-gradient(90deg, rgba(124,58,237,0.05) 0%, transparent 60%)',
                        borderLeft: '3px solid #6D28D9',
                      }}
                      {...props}
                    />
                  ),

                  p: ({ node, ...props }) => (
                    <p className="my-4 leading-relaxed" style={{ color: '#d4d4d4' }} {...props} />
                  ),

                  img: ({ node, ...props }) => {
                    let src = props.src || '';
                    if (src && !src.startsWith('http') && !src.startsWith('/')) {
                      src = `/guides/${params.slug}/${src}`;
                    }
                    return (
                      <img
                        {...props}
                        src={src}
                        className="rounded-lg shadow-md my-4 w-full"
                        style={{ maxWidth: '100%' }}
                        alt={props.alt || ''}
                      />
                    );
                  },

                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="hover:underline"
                      style={{ color: '#A78BFA' }}
                      target={props.href?.startsWith('http') ? '_blank' : undefined}
                      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    />
                  ),

                  strong: ({ node, ...props }) => (
                    <strong style={{ color: '#C4B5FD', fontWeight: 'bold' }} {...props} />
                  ),

                  em: ({ node, ...props }) => (
                    <em style={{ color: '#F9A8D4', fontStyle: 'italic' }} {...props} />
                  ),

                  ul: ({ node, ...props }) => (
                    <ul className="my-4 pl-6" style={{ color: '#d4d4d4' }} {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="my-4 pl-6" style={{ color: '#d4d4d4' }} {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="my-2" style={{ color: '#d4d4d4' }} {...props} />
                  ),

                  // 代码块 - 深色背景 + 紫色上边框
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code
                        className="px-2 py-0.5 rounded text-sm"
                        style={{
                          background: 'rgba(30, 27, 75, 0.9)',
                          color: '#F9A8D4',
                          border: '1px solid rgba(124, 58, 237, 0.3)',
                        }}
                        {...props}
                      />
                    ) : (
                      <code
                        className="block p-4 rounded-lg overflow-x-auto"
                        style={{
                          background: 'rgba(15, 15, 35, 0.95)',
                          color: '#d4d4d4',
                          borderTop: '2px solid #7C3AED',
                          borderLeft: '1px solid rgba(124, 58, 237, 0.3)',
                          borderRight: '1px solid rgba(124, 58, 237, 0.3)',
                          borderBottom: '1px solid rgba(124, 58, 237, 0.3)',
                          boxShadow: '0 -2px 12px rgba(124, 58, 237, 0.2)',
                        }}
                        {...props}
                      />
                    ),

                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table
                        className="min-w-full border-collapse rounded-lg overflow-hidden"
                        style={{
                          background: 'rgba(22, 33, 62, 0.9)',
                          border: '1px solid rgba(55, 48, 163, 0.5)',
                        }}
                        {...props}
                      />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="border border-gray-700 px-4 py-2 font-semibold"
                      style={{
                        background: 'rgba(30, 27, 75, 0.95)',
                        color: '#A78BFA',
                        borderBottom: '2px solid #7C3AED',
                      }}
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      className="border border-gray-700 px-4 py-2"
                      style={{ color: '#d4d4d4' }}
                      {...props}
                    />
                  ),

                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 pl-4 my-4 py-2 italic rounded"
                      style={{
                        borderColor: '#7C3AED',
                        color: '#C4B5FD',
                        background: 'rgba(124, 58, 237, 0.08)',
                      }}
                      {...props}
                    />
                  ),
                }}
              >
                {guide.content}
              </ReactMarkdown>
            </article>

            {/* 上一篇 / 下一篇导航 */}
            {(prevGuide || nextGuide) && (
              <div
                className="px-8 pb-8 pt-4"
                style={{ borderTop: '1px solid rgba(55, 48, 163, 0.4)' }}
              >
                <div className="flex gap-3 flex-col sm:flex-row">
                  {prevGuide && (
                    <Link
                      href={`/guides/${prevGuide.slug}`}
                      className="guide-nav-card flex-1 group block rounded-xl p-4"
                    >
                      <div className="text-xs text-textLight-300 mb-1">← 上一篇</div>
                      <div
                        className="text-sm font-medium line-clamp-2 group-hover:text-primary-400 transition-colors"
                        style={{ color: '#d4d4d4' }}
                      >
                        {prevGuide.title}
                      </div>
                    </Link>
                  )}
                  {nextGuide && (
                    <Link
                      href={`/guides/${nextGuide.slug}`}
                      className="guide-nav-card flex-1 group block rounded-xl p-4 text-right"
                    >
                      <div className="text-xs text-textLight-300 mb-1">下一篇 →</div>
                      <div
                        className="text-sm font-medium line-clamp-2 group-hover:text-primary-400 transition-colors"
                        style={{ color: '#d4d4d4' }}
                      >
                        {nextGuide.title}
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 回到顶部按钮 */}
      <BackToTop />
    </div>
  );
}
