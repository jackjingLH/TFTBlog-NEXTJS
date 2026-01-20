export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <div className="flex-1 flex items-start justify-center pt-20">
        <div className="max-w-md mx-auto px-6">
          {/* 小红书跳转卡片 */}
          <div className="group relative">
            <a
              href="https://www.xiaohongshu.com/user/profile/5cb2b50b0000000016014b2e?xsec_token=ABwG32rMJKQMVle4s0_ooVl1W9mkn3nniAVygilygoH-M%3D&xsec_source=pc_search"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-8 rounded-3xl bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative text-center">
                {/* UP主头像 */}
                <div className="w-24 h-24 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <img
                    src="https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo3174k5eimjq305n5imk5liipeo5d5nuo?imageView2/2/w/540/format/webp|imageMogr2/strip2"
                    alt="金铲铲屎官"
                    className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  金铲铲屎官
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  点击访问小红书主页 →
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © 2024 TFT金铲铲博客. 专注于云顶之弈内容聚合
        </p>
      </footer>
    </main>
  );
}
