try {
  const fs = require('fs');
  const path = require('path');
  const envFile = path.join(__dirname, '.env.production');
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx);
        const val = trimmed.slice(idx + 1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
} catch (e) { /* .env.production 不存在时静默跳过 */ }

module.exports = {
  apps: [
    {
      name: 'tftblog-nextjs',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://47.99.202.3:27017/tftblog',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
