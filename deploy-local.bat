@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM TFT Blog Next.js 本地部署到服务器脚本 (Windows版本)
REM 使用 rsync 同步文件到服务器

set SERVER_USER=root
set SERVER_HOST=47.99.202.3
set SERVER_PATH=/var/www/TFTBlog-NEXTJS
set LOCAL_PATH=./

echo ================================
echo TFT Blog 本地部署脚本 (Windows)
echo ================================
echo.

REM 1. 检查本地是否有未提交的更改
echo 步骤 1: 检查本地更改...
git status -s > temp_status.txt
set /p git_status=<temp_status.txt
del temp_status.txt

if not "!git_status!"=="" (
    echo ⚠️  检测到未提交的更改
    set /p commit_choice="是否要提交这些更改? (y/n): "
    if /i "!commit_choice!"=="y" (
        set /p commit_message="请输入提交信息: "
        git add .
        git commit -m "!commit_message!

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        echo ✅ 代码已提交
    )
) else (
    echo ✅ 没有未提交的更改
)

echo.

REM 2. 推送到 GitHub
echo 步骤 2: 推送到 GitHub...
set /p push_choice="是否推送到 GitHub? (y/n): "
if /i "!push_choice!"=="y" (
    git push origin master
    echo ✅ 代码已推送到 GitHub
) else (
    echo ⏭️  跳过推送到 GitHub
)

echo.

REM 3. 使用 rsync 同步文件到服务器
echo 步骤 3: 同步文件到服务器...
echo 正在同步文件...

rsync -avz --progress --exclude "node_modules" --exclude ".next" --exclude ".git" --exclude ".env.local" --exclude ".claude" --exclude "logs" --exclude "deploy.sh" --exclude "deploy-local.sh" --exclude "deploy-local.bat" %LOCAL_PATH% %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/

if errorlevel 1 (
    echo ❌ 文件同步失败
    pause
    exit /b 1
)

echo ✅ 文件同步完成
echo.

REM 4. 在服务器上安装依赖
echo 步骤 4: 安装依赖...
ssh %SERVER_USER%@%SERVER_HOST% "cd %SERVER_PATH% && npm install"
echo ✅ 依赖安装完成
echo.

REM 5. 在服务器上构建项目
echo 步骤 5: 构建项目...
ssh %SERVER_USER%@%SERVER_HOST% "cd %SERVER_PATH% && npm run build"
echo ✅ 项目构建完成
echo.

REM 6. 重启 PM2 应用
echo 步骤 6: 重启应用...
ssh %SERVER_USER%@%SERVER_HOST% "pm2 restart tftblog-nextjs"
echo ✅ 应用已重启
echo.

REM 7. 检查应用状态
echo 步骤 7: 检查应用状态...
ssh %SERVER_USER%@%SERVER_HOST% "pm2 status tftblog-nextjs"

echo.
echo ================================
echo 🎉 部署完成！
echo ================================
echo 访问地址: http://47.99.202.3
echo.

pause
