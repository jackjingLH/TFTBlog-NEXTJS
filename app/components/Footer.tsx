export default function Footer() {
  return (
    <footer className="bg-bgDark-800 border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-textLight-200">
          <p className="mb-2">
            © {new Date().getFullYear()} TFT金铲铲博客 - 云顶之弈攻略资讯聚合平台
          </p>
          <p>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textLight-300 hover:text-primary-500 transition-colors"
            >
              闽ICP备2026003321号
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
