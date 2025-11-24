#!/bin/bash

# TFT Blog Next.js 本地部署到服务器脚本
# 使用 rsync 同步文件到服务器

set -e  # 遇到错误立即退出

# 配置变量
SERVER_USER="root"
SERVER_HOST="47.99.202.3"
SERVER_PATH="/var/www/TFTBlog-NEXTJS"
LOCAL_PATH="./"

echo "================================"
echo "TFT Blog 本地部署脚本"
echo "================================"

# 1. 检查本地是否有未提交的更改
echo ""
echo "步骤 1: 检查本地更改..."
if [[ -n $(git status -s) ]]; then
    echo "⚠️  检测到未提交的更改"
    read -p "是否要提交这些更改? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入提交信息: " commit_message
        git add .
        git commit -m "$commit_message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        echo "✅ 代码已提交"
    fi
else
    echo "✅ 没有未提交的更改"
fi

# 2. 推送到 GitHub
echo ""
echo "步骤 2: 推送到 GitHub..."
read -p "是否推送到 GitHub? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin master
    echo "✅ 代码已推送到 GitHub"
else
    echo "⏭️  跳过推送到 GitHub"
fi

# 3. 使用 rsync 同步文件到服务器
echo ""
echo "步骤 3: 同步文件到服务器..."
echo "正在同步文件..."

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '.claude' \
    --exclude 'logs' \
    --exclude 'deploy.sh' \
    --exclude 'deploy-local.sh' \
    ${LOCAL_PATH} ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

echo "✅ 文件同步完成"

# 4. 在服务器上安装依赖
echo ""
echo "步骤 4: 安装依赖..."
ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && npm install"
echo "✅ 依赖安装完成"

# 5. 在服务器上构建项目
echo ""
echo "步骤 5: 构建项目..."
ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && npm run build"
echo "✅ 项目构建完成"

# 6. 重启 PM2 应用
echo ""
echo "步骤 6: 重启应用..."
ssh ${SERVER_USER}@${SERVER_HOST} "pm2 restart tftblog-nextjs"
echo "✅ 应用已重启"

# 7. 检查应用状态
echo ""
echo "步骤 7: 检查应用状态..."
ssh ${SERVER_USER}@${SERVER_HOST} "pm2 status tftblog-nextjs"

echo ""
echo "================================"
echo "🎉 部署完成！"
echo "================================"
echo "访问地址: http://47.99.202.3"
echo ""
