@echo off
cd /d "%~dp0"

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Start the server in background (no window)
start /b node server.js

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open dashboard in browser
start http://localhost:3001

REM Exit immediately
exit
