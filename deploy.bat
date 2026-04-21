@echo off
REM Railway Deployment Script for SmartStudy Hub (Windows)
REM This script automates the deployment process

echo.
echo 🚀 SmartStudy Hub - Railway Deployment Script (Windows)
echo ======================================================
echo.

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing Railway CLI...
    npm install -g railway
)

echo 🔐 Logging into Railway...
call railway login

echo 🔗 Linking to Railway project...
call railway link

echo 📝 Setting environment variables...
echo Please configure these in Railway dashboard:
echo   - DB_HOST (from MySQL service)
echo   - DB_USER (from MySQL service)
echo   - DB_PASSWORD (from MySQL service)
echo   - DB_NAME = classroom_system
echo   - SESSION_SECRET = smartstudy_session_secret_key_2024
echo.

pause

echo 🗄️  Please run the SQL from database.sql in Railway MySQL UI
echo.

pause

echo 🚀 Starting deployment...
call railway up

echo ✅ Deployment complete!
echo.
echo Your app is being deployed. Check the dashboard for the URL.
