@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM TFT Blog Next.js 简化部署脚本 (Windows版本)
REM 使用 SCP 传输关键文件到服务器

set SERVER_USER=root
set SERVER_HOST=47.99.202.3
set SERVER_PATH=/var/www/TFTBlog-NEXTJS

echo ================================
echo TFT Blog 简化部署脚本
echo ================================
echo.
echo 本脚本将执行以下操作:
echo 1. 提交并推送代码到 GitHub (可选)
echo 2. 传输更新的文件到服务器
echo 3. 在服务器上重新构建并重启应用
echo.

REM 询问是否需要提交代码
set /p commit_choice="是否需要提交代码到 Git? (y/n, 默认 n): "
if /i "%commit_choice%"=="y" (
    echo.
    echo 检查未提交的更改...
    git status -s
    echo.
    set /p commit_message="请输入提交信息: "
    git add .
    git commit -m "!commit_message!

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    echo ✅ 代码已提交

    echo.
    set /p push_choice="是否推送到 GitHub? (y/n, 默认 y): "
    if /i "!push_choice!"=="" set push_choice=y
    if /i "!push_choice!"=="y" (
        git push origin master
        echo ✅ 代码已推送到 GitHub
    )
)

echo.
echo ================================
echo 开始传输文件到服务器...
echo ================================
echo.

REM 传输主要源代码文件
echo 传输 app 目录...
scp -r app %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/

echo 传输 lib 目录...
scp -r lib %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/

echo 传输 models 目录...
scp -r models %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul

echo 传输配置文件...
scp package.json %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/
scp tsconfig.json %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/
scp next.config.ts %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul
scp tailwind.config.ts %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul
scp postcss.config.mjs %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul

echo.
echo ✅ 文件传输完成

echo.
echo ================================
echo 在服务器上构建并重启应用...
echo ================================

REM 在服务器上执行部署命令
ssh %SERVER_USER%@%SERVER_HOST% "cd %SERVER_PATH% && npm install && npm run build && pm2 restart tftblog-nextjs"

if errorlevel 1 (
    echo.
    echo ❌ 部署过程中出现错误
    pause
    exit /b 1
)

echo.
echo ================================
echo 🎉 部署完成！
echo ================================
echo.
echo 访问地址: http://47.99.202.3
echo.
echo 查看应用状态: ssh %SERVER_USER%@%SERVER_HOST% "pm2 status"
echo 查看应用日志: ssh %SERVER_USER%@%SERVER_HOST% "pm2 logs tftblog-nextjs --lines 50"
echo.

pause
