/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 禁用可能导致 worker 问题的实验性功能
    serverComponentsExternalPackages: [],
  },
  // 确保 worker 配置正确
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // 客户端构建时的优化
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // 开发环境优化文件监视器，避免进程重启和端口递增问题
    if (dev) {
      config.watchOptions = {
        poll: 1000, // 每秒轮询一次文件变化，比事件监听更稳定
        aggregateTimeout: 300, // 文件变化后等待300ms再重新构建，避免频繁编译
        ignored: ['**/node_modules', '**/.git', '**/.next'], // 忽略不需要监视的目录
      };
    }

    return config;
  },
  // 设置并发工作进程数量
  swcMinify: true,
  // 优化构建性能
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
