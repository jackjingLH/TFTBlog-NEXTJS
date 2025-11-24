@echo off
setlocal enabledelayedexpansion

REM TFT Blog Next.js Deployment Script (Windows)
REM Transfer files to server using SCP

set SERVER_USER=root
set SERVER_HOST=47.99.202.3
set SERVER_PATH=/var/www/TFTBlog-NEXTJS

echo ================================
echo TFT Blog Deployment Script
echo ================================
echo.
echo This script will:
echo 1. Commit and push code to GitHub (optional)
echo 2. Transfer updated files to server
echo 3. Build and restart application on server
echo.

REM Ask if need to commit code
set /p commit_choice="Commit code to Git? (y/n, default n): "
if /i "%commit_choice%"=="y" (
    echo.
    echo Checking uncommitted changes...
    git status -s
    echo.
    set /p commit_message="Enter commit message: "
    git add .
    git commit -m "!commit_message!"
    echo [OK] Code committed

    echo.
    set /p push_choice="Push to GitHub? (y/n, default y): "
    if /i "!push_choice!"=="" set push_choice=y
    if /i "!push_choice!"=="y" (
        git push origin master
        echo [OK] Code pushed to GitHub
    )
)

echo.
echo ================================
echo Transferring files to server...
echo ================================
echo.

REM Transfer main source code files
echo Transferring app directory...
scp -r app %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/

echo Transferring lib directory...
scp -r lib %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/

echo Transferring models directory...
scp -r models %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul

echo Transferring config files...
scp package.json %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/
scp tsconfig.json %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/
scp next.config.ts %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul
scp tailwind.config.ts %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul
scp postcss.config.mjs %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/ 2>nul

echo.
echo [OK] Files transferred

echo.
echo ================================
echo Building and restarting app...
echo ================================

REM Execute deployment commands on server
ssh %SERVER_USER%@%SERVER_HOST% "cd %SERVER_PATH% && npm install && npm run build && pm2 restart tftblog-nextjs"

if errorlevel 1 (
    echo.
    echo [ERROR] Deployment failed
    pause
    exit /b 1
)

echo.
echo ================================
echo [SUCCESS] Deployment completed!
echo ================================
echo.
echo Visit: http://47.99.202.3
echo.
echo Check status: ssh %SERVER_USER%@%SERVER_HOST% "pm2 status"
echo Check logs: ssh %SERVER_USER%@%SERVER_HOST% "pm2 logs tftblog-nextjs --lines 50"
echo.

pause
