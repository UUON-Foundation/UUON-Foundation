#!/bin/bash
set -e

# UUON Foundation Billing System - Complete Setup & Deploy Script
# Usage: bash deploy.sh [local|railway]
# Mode: local = docker-compose dev | railway = push to Railway

MODE=${1:-local}
REPO="~/UUON-Foundation"

echo "🚀 UUON Billing System - Setup & Deploy ($MODE mode)"
echo "=================================================="

# Step 1: Navigate to repo
cd ~/UUON-Foundation
echo "✓ Working directory: $(pwd)"

# Step 2: Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd billing-system
npm install
cd ..

# Step 3: Verify code
echo ""
echo "🔍 Verifying code structure..."
test -f billing-system/server/index.js && echo "✓ Main server" || echo "✗ Missing server"
test -f billing-system/server/db.js && echo "✓ Database module" || echo "✗ Missing db.js"
test -f billing-system/server/handlers.js && echo "✓ Handlers" || echo "✗ Missing handlers"
test -f billing-system/server/validation.js && echo "✓ Validation" || echo "✗ Missing validation"
test -f billing-system/server/schema.js && echo "✓ Schema" || echo "✗ Missing schema"

# Step 4: Mode-specific actions
if [ "$MODE" = "local" ]; then
  echo ""
  echo "🐳 Starting local development (docker-compose)..."
  echo "=================================================="
  docker-compose down 2>/dev/null || true
  docker-compose up --build -d
  
  echo ""
  echo "⏳ Waiting for services (20s)..."
  sleep 20
  
  echo ""
  echo "🧪 Testing endpoints..."
  echo "Testing GET /"
  curl -s http://localhost:8080/ | jq . 2>/dev/null || echo "Not ready yet"
  
  echo ""
  echo "Testing GET /health"
  curl -s http://localhost:8080/health | jq . 2>/dev/null || echo "Not ready yet"
  
  echo ""
  echo "Testing GET /api/v1/packages"
  curl -s http://localhost:8080/api/v1/packages | jq . 2>/dev/null || echo "Not ready yet"
  
  echo ""
  echo "✅ Local setup complete!"
  echo "API running at http://localhost:8080"
  echo "PostgreSQL at localhost:5432 (user/password)"
  echo ""
  echo "View logs: docker-compose logs -f"
  echo "Stop: docker-compose down"

elif [ "$MODE" = "railway" ]; then
  echo ""
  echo "🚀 Preparing for Railway deployment..."
  echo "=================================================="
  
  # Verify git is clean
  if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected. Committing..."
    git add -A
    git commit -m "chore: implement all billing endpoints and database integration"
  fi
  
  # Push to main
  echo "📤 Pushing to GitHub (main)..."
  git push origin main
  
  echo ""
  echo "✅ Code pushed to Railway!"
  echo "Railway will auto-deploy from: https://github.com/UUON-Foundation/UUON-Foundation"
  echo ""
  echo "⚠️  IMPORTANT: Add these environment variables in Railway dashboard:"
  echo "   DATABASE_URL=postgresql://..."
  echo "   PORT=8080"
  echo "   NODE_ENV=production"
  echo ""
  echo "Monitor deployment at: https://railway.app"
  
else
  echo "❌ Invalid mode. Use: bash deploy.sh [local|railway]"
  exit 1
fi

echo ""
echo "=================================================="
echo "✅ Complete! Next steps:"
if [ "$MODE" = "local" ]; then
  echo ""
  echo "Create a test user:"
  echo '  curl -X POST http://localhost:8080/api/v1/users -H "Content-Type: application/json" -d '"'"'{"email":"test@example.com"}'"'"
  echo ""
  echo "Buy credits:"
  echo '  curl -X POST http://localhost:8080/api/v1/credits/buy -H "Content-Type: application/json" -d '"'"'{"user_id":"<user-id>","package_id":"<package-id>"}'"'"
else
  echo ""
  echo "Set environment variables in Railway dashboard"
  echo "Check deployment status and logs"
  echo "Test at: https://uuon-foundation-billing-system.up.railway.app/"
fi

echo ""
echo "📚 Endpoint reference:"
echo "  POST   /api/v1/users                - Create user"
echo "  GET    /api/v1/users/:user_id       - Get user"
echo "  GET    /api/v1/packages             - List packages"
echo "  POST   /api/v1/credits/buy          - Buy credits"
echo "  GET    /api/v1/credits/balance/:id  - Check balance"
echo "  POST   /api/v1/credits/transfer     - Transfer credits"
echo "  POST   /api/v1/credits/use          - Use credits"
echo "  GET    /api/v1/transactions/:user_id - Transaction history"
echo "  GET    /api/v1/analytics            - Admin analytics"
