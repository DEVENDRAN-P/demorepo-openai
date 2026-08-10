@echo off
REM Quick start script for Email API server (Windows)

echo.
echo 📧 Starting GST Buddy Email API Server...
echo.

REM Check if Node.js is installed
where /q node
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node -v
echo.

REM Navigate to api folder (server.js now lives in the project root)
cd /d "%~dp0.."

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install express cors axios dotenv
    echo.
)

REM Start the server
echo 🚀 Starting server...
echo.
node server.js

pause
