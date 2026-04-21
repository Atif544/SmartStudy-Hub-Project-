#!/bin/bash
# Railway Deployment Script for SmartStudy Hub
# This script automates the deployment process

echo "🚀 SmartStudy Hub - Railway Deployment Script"
echo "=============================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g railway
fi

echo "🔐 Logging into Railway..."
railway login

echo "🔗 Linking to Railway project..."
railway link

echo "📝 Setting environment variables..."
echo "Please configure these in Railway dashboard:"
echo "  - DB_HOST (from MySQL service)"
echo "  - DB_USER (from MySQL service)"
echo "  - DB_PASSWORD (from MySQL service)"
echo "  - DB_NAME = classroom_system"
echo "  - SESSION_SECRET = smartstudy_session_secret_key_2024"
echo ""

read -p "Press Enter after configuring variables in Railway dashboard..."

echo "🗄️  Initializing database..."
echo "Please run this SQL in Railway MySQL UI:"
echo "$(cat database.sql)"
echo ""

read -p "Press Enter after initializing the database..."

echo "🚀 Starting deployment..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "Your app is being deployed. Check the dashboard for the URL."
