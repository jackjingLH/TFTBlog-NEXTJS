/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-markdown@10, remark-gfm@4, rehype-raw@7 及其传递依赖均为纯 ESM 包
  // transpilePackages 让 Next.js 的 SWC 将它们转换为 CJS 再打包，避免 webpack worker 崩溃
  transpilePackages: [
    'react-markdown',
    'unified',
    'bail',
    'is-plain-obj',
    'trough',
    'vfile',
    'vfile-message',
    'remark-gfm',
    'rehype-raw',
    'rehype-sanitize',
    'remark-parse',
    'remark-rehype',
    'hast-util-to-jsx-runtime',
    'hast-util-whitespace',
    'property-information',
    'space-separated-tokens',
    'comma-separated-tokens',
    'unist-util-position',
    'unist-util-stringify-position',
    'micromark',
    'mdast-util-from-markdown',
    'mdast-util-to-string',
  ],
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
