/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'production' || process.env.USE_REMOTE_GUIDE_API !== '1') {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: '/api/guides/:path*',
          destination: 'https://www.jingcc.cc/api/guides/:path*',
        },
        {
          source: '/uploads/:path*',
          destination: 'https://www.jingcc.cc/uploads/:path*',
        },
      ],
    };
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
    }

    return config;
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
