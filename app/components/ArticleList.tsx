import { Article } from '@/types/article';

interface ArticleListProps {
  articles: Article[];
}

export default function ArticleList({ articles }: ArticleListProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-4">
        {articles.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            暂无文章
          </div>
        ) : (
          articles.map((article) => (
            <article
              key={article.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {article.source}
                  </span>
                  {article.publishedAt && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(article.publishedAt).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {article.title}
                </a>

                {article.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                    {article.description}
                  </p>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
