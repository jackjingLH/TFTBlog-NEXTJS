@echo off
REM TFT博客部署脚本 - Windows版本
REM 用途：自动化部署流程到云服务器

echo ========================================
echo TFT博客自动部署脚本
echo ========================================
echo.

REM 1. 检查Git状态
echo [1/6] 检查Git状态...
git status
echo.

REM 2. 添加所有更改到Git
echo [2/6] 添加代码变更...
git add .
echo.

REM 3. 提交更改
set /p commit_msg="请输入提交信息 (默认: 更新代码): "
if "%commit_msg%"=="" set commit_msg=更新代码
git commit -m "%commit_msg%"
echo.

REM 4. 推送到远程仓库
echo [3/6] 推送到远程仓库...
git push origin master
echo.

REM 5. SSH连接到服务器并部署
echo [4/6] 连接到云服务器 (47.99.202.3)...
echo [5/6] 执行服务器端部署...

ssh root@47.99.202.3 "mkdir -p /var/www && cd /var/www && if [ -d TFTBlog-NEXTJS ]; then cd TFTBlog-NEXTJS && git pull origin master; else git clone https://github.com/jackjingLH/TFTBlog-NEXTJS.git && cd TFTBlog-NEXTJS; fi && npm install && npm run build && pm2 restart tftblog-nextjs || pm2 start ecosystem.config.js && pm2 save"

echo.
echo [6/6] 部署完成!
echo.
echo ========================================
echo 访问地址: http://47.99.202.3:3000
echo PM2状态: ssh root@47.99.202.3 "pm2 status"
echo 查看日志: ssh root@47.99.202.3 "pm2 logs tftblog-nextjs"
echo ========================================
pause
