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
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2535 30%, #1f1f2e 60%, #1a1f28 90%, #181825 100%)',
    }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8 flex-col lg:flex-row">
          {/* 左侧目录 - 大屏幕显示 */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="lg:sticky top-8 rounded-lg p-4" style={{
              background: 'rgba(30, 35, 48, 0.6)',
              border: '1px solid rgba(78, 201, 176, 0.2)',
              backdropFilter: 'blur(10px)',
              maxHeight: 'calc(100vh - 4rem)', // 固定高度
            }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: '#4ec9b0' }}>
                攻略目录
              </h2>
              <nav
                className="space-y-1 overflow-y-auto custom-scrollbar"
                style={{
                  maxHeight: 'calc(100vh - 10rem)', // 导航区域可滚动
                }}
              >
                {allGuides.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className={`block px-3 py-2 rounded-lg transition ${
                      g.slug === guide.slug
                        ? ''
                        : ''
                    }`}
                    style={
                      g.slug === guide.slug
                        ? {
                            background: 'linear-gradient(135deg, #4ec9b0 0%, #3a9d88 100%)',
                            color: '#1a1a1a',
                            fontWeight: 'bold'
                          }
                        : {
                            color: '#d4d4d4',
                            borderLeft: '2px solid transparent'
                          }
                    }
                  >
                    <div className="font-medium truncate">{g.title}</div>
                    <div className="text-xs opacity-75 mt-0.5">{g.category}</div>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* 右侧内容 */}
          <main className="w-full lg:flex-1 rounded-lg shadow-lg overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2535 30%, #1f1f2e 60%, #1a1f28 90%, #181825 100%)',
              maxWidth: '750px', // 移动端友好宽度，两侧留白可以补充其他内容
              margin: '0 auto', // 居中显示
            }}>
            {/* 文章头部 */}
            <header className="mb-8 pb-6 px-8 pt-8" style={{
              borderBottom: '2px solid rgba(78, 201, 176, 0.3)'
            }}>
              {/* 标签 */}
              {guide.tags && guide.tags.length > 0 && (
                <div className="flex gap-3 mb-4">
                  {guide.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-1 text-sm font-semibold rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.95) 0%, rgba(255, 152, 0, 0.95) 100%)',
                        color: '#1a1a1a',
                        border: '2px solid rgba(255, 193, 7, 1)',
                        boxShadow: '0 3px 10px rgba(255, 193, 7, 0.4)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-5xl font-black mb-4" style={{
                color: '#ffffff',
                letterSpacing: '2px',
                lineHeight: '1.3'
              }}>
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

              <div className="flex items-center gap-4 text-sm" style={{ color: '#9cdcfe' }}>
                <span>来源：{guide.source}</span>
              </div>
            </header>

            {/* Markdown 内容 */}
            <article className="prose prose-lg max-w-none px-8 pb-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // 自定义 h1 渲染 - 隐藏（因为已经在header显示了）
                  h1: ({ node, ...props }) => null,

                  // 自定义 h2 渲染 - 参考 mdToImage 样式
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-2xl font-bold mt-6 mb-4 pl-6 py-2"
                      style={{
                        color: '#4ec9b0',
                        background: 'linear-gradient(90deg, rgba(78, 201, 176, 0.05) 0%, rgba(78, 201, 176, 0.02) 50%, rgba(78, 201, 176, 0.05) 100%)',
                        borderLeft: '4px solid #4ec9b0',
                        borderTop: '1px solid rgba(78, 201, 176, 0.1)',
                        borderBottom: '1px solid rgba(78, 201, 176, 0.1)',
                      }}
                      {...props}
                    />
                  ),

                  // 自定义 h3 渲染
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-xl font-bold mt-5 mb-3 pl-6 py-1"
                      style={{
                        color: '#4ec9b0',
                        background: 'linear-gradient(90deg, rgba(86, 156, 214, 0.03) 0%, transparent 50%, rgba(86, 156, 214, 0.03) 100%)',
                        borderLeft: '3px solid #569cd6',
                      }}
                      {...props}
                    />
                  ),

                  // 自定义段落渲染
                  p: ({ node, ...props }) => (
                    <p
                      className="my-4 leading-relaxed"
                      style={{ color: '#d4d4d4' }}
                      {...props}
                    />
                  ),

                  // 自定义图片渲染 - 修复相对路径并限制宽度
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
                        style={{ maxWidth: '100%' }} // 限制图片最大宽度
                        alt={props.alt || ''}
                      />
                    );
                  },

                  // 自定义链接渲染
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="hover:underline"
                      style={{ color: '#3794ff' }}
                      target={props.href?.startsWith('http') ? '_blank' : undefined}
                      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    />
                  ),

                  // 自定义 strong 渲染
                  strong: ({ node, ...props }) => (
                    <strong style={{ color: '#569cd6', fontWeight: 'bold' }} {...props} />
                  ),

                  // 自定义 em 渲染
                  em: ({ node, ...props }) => (
                    <em style={{ color: '#dcdcaa', fontStyle: 'italic' }} {...props} />
                  ),

                  // 自定义列表渲染
                  ul: ({ node, ...props }) => (
                    <ul className="my-4 pl-6" style={{ color: '#d4d4d4' }} {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="my-4 pl-6" style={{ color: '#d4d4d4' }} {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="my-2" style={{ color: '#d4d4d4' }} {...props} />
                  ),

                  // 自定义代码块渲染
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code
                        className="px-2 py-0.5 rounded text-sm"
                        style={{
                          background: 'linear-gradient(135deg, rgba(45, 45, 48, 0.9) 0%, rgba(35, 35, 38, 0.9) 100%)',
                          color: '#ce9178',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        {...props}
                      />
                    ) : (
                      <code
                        className="block p-4 rounded-lg overflow-x-auto"
                        style={{
                          background: 'linear-gradient(135deg, rgba(45, 45, 48, 0.95) 0%, rgba(35, 35, 38, 0.95) 100%)',
                          color: '#d4d4d4',
                          border: '1px solid rgba(78, 201, 176, 0.2)'
                        }}
                        {...props}
                      />
                    ),

                  // 自定义表格渲染
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table
                        className="min-w-full border-collapse rounded-lg overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(45, 45, 48, 0.9) 0%, rgba(35, 35, 38, 0.9) 100%)',
                          border: '1px solid rgba(78, 201, 176, 0.3)',
                        }}
                        {...props}
                      />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="border border-gray-700 px-4 py-2 font-semibold"
                      style={{
                        background: 'rgba(30, 30, 30, 0.95)',
                        color: '#4ec9b0',
                        borderBottom: '2px solid #007acc'
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

                  // 自定义引用块渲染
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 pl-4 my-4 py-2 italic rounded"
                      style={{
                        borderColor: '#007acc',
                        color: '#9cdcfe',
                        background: 'rgba(0, 122, 204, 0.1)'
                      }}
                      {...props}
                    />
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
