@echo off
chcp 65001 >nul
echo ========================================
echo   Notification Generator Server
echo   Starting HTTP server on port 8000...
echo ========================================
echo.
echo   Open http://localhost:8000/generator_new.html
echo   Press Ctrl+C to stop
echo ========================================
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "server.ps1"

pause
