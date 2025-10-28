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
echo Dashboard will be available at: http://localhost:3001
echo.

REM Start the server in a new minimized window
start /min "" node server.js

REM Wait a moment for the server to start
timeout /t 3 /nobreak >nul

REM Open the dashboard in the default browser
echo Opening dashboard in your browser...
start http://localhost:3001

echo.
echo Dashboard is now running in the background!
echo The server window is minimized - you can close this window.
echo.

REM Close this window automatically
timeout /t 2 /nobreak >nul
exit
