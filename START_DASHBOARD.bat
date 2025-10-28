@echo off
echo Starting Zoho Dashboard...
echo.

cd /d "%~dp0"

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Starting the dashboard server...
echo.
echo Dashboard will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
