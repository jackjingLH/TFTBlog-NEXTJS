export default function Footer() {
  return (
    <footer className="bg-surface mt-auto border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-lg font-bold text-text-primary mb-2">
            铲什么铲
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-text-muted border-t border-border">
          <p>&copy; {new Date().getFullYear()} 铲什么铲</p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            闽ICP备2026003321号
          </a>
        </div>
      </div>
    </footer>
  );
}