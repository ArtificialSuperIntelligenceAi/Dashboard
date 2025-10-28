@echo off
echo Starting Zoho Dashboard (Debug Mode)...
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
echo Dashboard will be available at: http://localhost:3001
echo.
echo This window will stay open to show any errors.
echo Close this window to stop the server.
echo.

REM Start the server and keep window open
node server.js

pause
