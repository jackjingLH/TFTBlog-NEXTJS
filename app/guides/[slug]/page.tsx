import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getAllGuides, getGuideBySlug } from '@/lib/guides';
import Link from 'next/link';

// 生成静态路径
export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuideBySlug(params.slug);
  const allGuides = getAllGuides();

  if (!guide) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* 左侧目录 */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-8">
              <h2 className="text-xl font-bold mb-4 text-gray-800">攻略目录</h2>
              <nav className="space-y-1">
                {allGuides.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className={`block px-3 py-2 rounded-lg transition ${
                      g.slug === guide.slug
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{g.title}</div>
                    <div className="text-xs opacity-75 mt-0.5">{g.category}</div>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* 右侧内容 */}
          <main className="flex-1 bg-white rounded-lg shadow-lg p-8">
            {/* 文章头部 */}
            <header className="mb-8 border-b pb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {guide.title}
              </h1>
              <p className="text-gray-600 text-lg mb-4">{guide.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>作者：{guide.author}</span>
                <span>•</span>
                <span>发布：{new Date(guide.date).toLocaleDateString('zh-CN')}</span>
                <span>•</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {guide.category}
                </span>
              </div>
              {guide.tags && guide.tags.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {guide.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Markdown 内容 */}
            <article className="prose prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // 自定义图片渲染
                  img: ({ node, ...props }) => (
                    <img
                      {...props}
                      className="rounded-lg shadow-md my-4"
                      alt={props.alt || ''}
                    />
                  ),
                  // 自定义链接渲染
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-blue-600 hover:underline"
                      target={props.href?.startsWith('http') ? '_blank' : undefined}
                      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    />
                  ),
                  // 自定义代码块渲染
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto" {...props} />
                    ),
                  // 自定义表格渲染
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-gray-300 px-4 py-2" {...props} />
                  ),
                  // 自定义引用块渲染
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4" {...props} />
                  ),
                }}
              >
                {guide.content}
              </ReactMarkdown>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
