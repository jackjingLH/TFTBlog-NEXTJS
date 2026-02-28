@echo off
timeout /t 10 /nobreak >nul
start "TFT 抓取日志" powershell -NoExit -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content 'C:\Users\jinglihao\.pm2\logs\fetch-job-local-out.log' -Wait -Tail 80 -Encoding UTF8"
