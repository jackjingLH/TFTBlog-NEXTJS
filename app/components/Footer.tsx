export default function Footer() {
  return (
    <footer className="bg-bgDark-800 mt-auto">
      <div
        className="w-full h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #7C3AED 30%, #F43F5E 70%, transparent 100%)',
          boxShadow: '0 0 8px rgba(124, 58, 237, 0.3)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <div
            className="text-lg font-bold mb-2 bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #F43F5E 100%)' }}
          >
            铲什么铲
          </div>
        </div>

        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-textLight-300"
          style={{ borderTop: '1px solid rgba(55, 48, 163, 0.3)' }}
        >
          <p>&copy; {new Date().getFullYear()} 铲什么铲</p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-400 transition-colors"
          >
            闽ICP备2026003321号
          </a>
        </div>
      </div>
    </footer>
  );
}