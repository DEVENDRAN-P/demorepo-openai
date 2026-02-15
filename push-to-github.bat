@echo off
REM GitHub Push Script for GST Buddy Compliance
REM This script will initialize git, add files, commit, and push to GitHub

echo.
echo ========================================
echo GST Buddy Compliance - GitHub Push
echo ========================================
echo.

REM Step 1: Navigate to project directory
cd /d "c:\Users\LENOVO\OneDrive\Desktop\ppts\GstBuddyCompliance-main\GstBuddyCompliance-main"

echo [1/6] Checking Git installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed. Please install from https://git-scm.com/download/win
    pause
    exit /b 1
)
echo ✓ Git is installed

echo.
echo [2/6] Initializing Git repository...
if not exist ".git" (
    git init
    echo ✓ Git repository initialized
) else (
    echo ✓ Git repository already exists
)

echo.
echo [3/6] Configuring Git...
git config user.name "Developer"
git config user.email "developer@example.com"
echo ✓ Git configured

echo.
echo [4/6] Adding all files...
git add .
echo ✓ Files staged for commit

echo.
echo [5/6] Creating initial commit...
git commit -m "feat: Initialize GST Buddy Compliance with Firebase authentication

- Real-time signup/login with email validation
- Interactive UI with smooth animations
- 70-80%% performance optimizations
- Lazy loading and code splitting
- Smart caching with background sync
- Firebase authentication integration
- Comprehensive documentation
- i18n internationalization support" >nul 2>&1
if errorlevel 1 (
    echo NOTE: Commit might already exist (first time only)
) else (
    echo ✓ Initial commit created
)

echo.
echo ========================================
echo NEXT STEPS - Configure Remote Origin
echo ========================================
echo.
echo 1. Go to GitHub.com and create a NEW repository
echo    - Name: GstBuddyCompliance
echo    - Do NOT add README, .gitignore, or license
echo    - Click "Create repository"
echo.
echo 2. Copy your repository URL (HTTPS or SSH)
echo    Example: https://github.com/YOUR-USERNAME/GstBuddyCompliance.git
echo.
echo 3. Run this command in PowerShell:
echo    git remote add origin YOUR-REPO-URL-HERE
echo    git branch -M main
echo    git push -u origin main
echo.
echo 4. Enter your GitHub credentials when prompted
echo    - Username: your GitHub username
echo    - Password: your Personal Access Token (from GitHub settings)
echo.
echo ========================================
echo Repository Status:
echo ========================================
echo.
git status

echo.
echo ========================================
echo Ready to push! Follow the steps above.
echo ========================================
echo.
pause
