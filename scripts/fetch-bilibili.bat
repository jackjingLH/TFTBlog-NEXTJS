@echo off
REM ============================================================
REM B站数据抓取脚本 (Windows批处理)
REM ============================================================
REM 使用说明：
REM 1. 确保已切换到可用的代理IP
REM 2. 确保 RSSHub Docker 容器正在运行
REM 3. 双击运行此脚本
REM ============================================================

chcp 65001 >nul
echo.
echo ============================================================
echo 🚀 B站数据智能抓取
echo ============================================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 RSSHub 是否运行
echo 📡 检查 RSSHub 状态...
curl -s -I http://localhost:1200 | findstr "200 OK" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: RSSHub 未运行，请先启动 Docker 容器
    echo.
    echo 启动命令:
    echo   docker start rsshub
    echo.
    pause
    exit /b 1
)
echo ✅ RSSHub 正常运行
echo.

REM 检查开发服务器
echo 📡 检查开发服务器状态...
curl -s http://localhost:3000/api/feeds/refresh | findstr "success\|error" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  警告: 开发服务器可能未运行
    echo.
    echo 请在另一个终端运行: npm run dev
    echo.
    set /p continue="是否继续执行? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)
echo.

REM 执行抓取脚本
echo 🎯 开始执行智能抓取...
echo ============================================================
echo.

node scripts/smart-fetch-bilibili.js

echo.
echo ============================================================
echo ✨ 执行完成
echo ============================================================
echo.
pause
