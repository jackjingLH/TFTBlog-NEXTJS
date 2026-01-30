export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">
            © {new Date().getFullYear()} TFT金铲铲博客 - 云顶之弈攻略资讯聚合平台
          </p>
          <p>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              闽ICP备2026003321号
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
