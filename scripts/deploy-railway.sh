#!/bin/bash

# UUON Foundation - Railway Deployment Script
# Usage: bash scripts/deploy-railway.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       UUON Foundation - Railway Deployment Script           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI not found. Installing..."
  npm install -g @railway/cli
fi

# Check if logged in
echo "🔐 Checking Railway login..."
railway whoami || railway login

echo ""
echo "📋 DEPLOYMENT STEPS:"
echo ""
echo "1. GitHub Push (auto-triggers CI/CD)"
echo "2. Railway Dashboard Setup"
echo "3. Environment Variables"
echo "4. Live Deployment"
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add -A
git commit -m "Deploy: UUON system to Railway" || true
git push origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "Next steps (do this in Railway dashboard):"
echo ""
echo "1. Go to https://railway.app/dashboard"
echo "2. Create new project → Deploy from GitHub"
echo "3. Select: UUON-Foundation/UUON-Foundation"
echo "4. Click Deploy"
echo "5. Go to Settings → Variables"
echo "6. Add these variables:"
echo ""
cat << 'VARS'
DATABASE_URL = [Railway will auto-create this]
NODE_ENV = production
PORT = 8080
API_BASE_URL = [Copy from Railway deployment URL]
REPLIT_CLIENT_ID = [Your Replit OAuth ID]
REPLIT_CLIENT_SECRET = [Your Replit OAuth Secret]
BLOCKCHAIN_RPC_URL = [Your blockchain RPC URL]
VARS

echo ""
echo "7. Railway will auto-deploy when you save variables"
echo ""
echo "📊 Monitor deployment:"
echo "   • Logs: https://railway.app/dashboard → Logs tab"
echo "   • Metrics: https://railway.app/dashboard → Metrics tab"
echo "   • URL: Check 'Deployments' for live app URL"
echo ""
