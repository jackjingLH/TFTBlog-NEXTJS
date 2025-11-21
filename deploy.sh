#!/bin/bash

# TFT Blog Next.js 部署脚本
# 用于在服务器上部署应用

set -e

echo "======================================"
echo "开始部署 TFT Blog Next.js 应用"
echo "======================================"

# 1. 拉取最新代码
echo "📦 拉取最新代码..."
git pull origin master

# 2. 安装依赖
echo "📦 安装依赖..."
npm install --production=false

# 3. 构建项目
echo "🔨 构建项目..."
npm run build

# 4. 创建日志目录
echo "📁 创建日志目录..."
mkdir -p logs

# 5. 使用 PM2 重启应用
echo "🚀 重启应用..."
if pm2 list | grep -q "tftblog-nextjs"; then
  echo "应用已存在，重启中..."
  pm2 restart ecosystem.config.js
else
  echo "首次部署，启动应用..."
  pm2 start ecosystem.config.js
fi

# 6. 保存 PM2 配置
echo "💾 保存 PM2 配置..."
pm2 save

echo "======================================"
echo "✅ 部署完成！"
echo "======================================"
echo ""
echo "查看应用状态: pm2 status"
echo "查看应用日志: pm2 logs tftblog-nextjs"
echo "停止应用: pm2 stop tftblog-nextjs"
echo "重启应用: pm2 restart tftblog-nextjs"
