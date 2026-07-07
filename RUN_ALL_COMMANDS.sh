#!/bin/bash
# ========================================================================
# UUON FOUNDATION BILLING SYSTEM - COMPLETE BASH COMMAND SEQUENCE
# ========================================================================
# Run each section in order to set up, test, and deploy the system
# Copy/paste blocks as needed or run individual commands
# ========================================================================

# ========================================================================
# SECTION 1: INITIAL SETUP
# ========================================================================
cd ~/UUON-Foundation
git pull origin main
cd billing-system
npm install
cd ..

# ========================================================================
# SECTION 2: LOCAL DEVELOPMENT - DOCKER COMPOSE
# ========================================================================

# Start the entire stack (PostgreSQL + API)
docker-compose down 2>/dev/null || true
docker-compose up --build -d
sleep 20

# Verify services are running
docker ps

# Check API health
curl -s http://localhost:8080/health | jq .

# ========================================================================
# SECTION 3: CREATE TEST DATA
# ========================================================================

# Create user 1
USER1=$(curl -s -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@uuon.io"}' | jq -r '.user.id')
echo "User 1 ID: $USER1"

# Create user 2
USER2=$(curl -s -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@uuon.io"}' | jq -r '.user.id')
echo "User 2 ID: $USER2"

# Get package IDs
PACKAGES=$(curl -s http://localhost:8080/api/v1/packages)
PKG_STARTER=$(echo $PACKAGES | jq -r '.packages[] | select(.name=="starter") | .id')
PKG_PRO=$(echo $PACKAGES | jq -r '.packages[] | select(.name=="pro") | .id')
echo "Starter Package: $PKG_STARTER"
echo "Pro Package: $PKG_PRO"

# ========================================================================
# SECTION 4: TEST ALL ENDPOINTS
# ========================================================================

# Test 1: List all users
echo "=== LIST USERS ==="
curl -s http://localhost:8080/api/v1/users | jq .

# Test 2: Get specific user
echo "=== GET USER 1 ==="
curl -s http://localhost:8080/api/v1/users/$USER1 | jq .

# Test 3: List packages
echo "=== LIST PACKAGES ==="
curl -s http://localhost:8080/api/v1/packages | jq .

# Test 4: Buy starter package (user 1)
echo "=== BUY CREDITS (User 1) ==="
curl -s -X POST http://localhost:8080/api/v1/credits/buy \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER1\",\"package_id\":\"$PKG_STARTER\"}" | jq .

# Test 5: Buy pro package (user 2)
echo "=== BUY CREDITS (User 2) ==="
curl -s -X POST http://localhost:8080/api/v1/credits/buy \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER2\",\"package_id\":\"$PKG_PRO\"}" | jq .

# Test 6: Check balance
echo "=== CHECK BALANCE ==="
curl -s http://localhost:8080/api/v1/credits/balance/$USER1 | jq .

# Test 7: Use credits
echo "=== USE CREDITS ==="
curl -s -X POST http://localhost:8080/api/v1/credits/use \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER1\",\"amount\":25,\"description\":\"Model inference\"}" | jq .

# Test 8: Transfer credits
echo "=== TRANSFER CREDITS ==="
curl -s -X POST http://localhost:8080/api/v1/credits/transfer \
  -H "Content-Type: application/json" \
  -d "{\"from_user_id\":\"$USER1\",\"to_user_id\":\"$USER2\",\"amount\":30}" | jq .

# Test 9: Transaction history
echo "=== TRANSACTION HISTORY ==="
curl -s http://localhost:8080/api/v1/transactions/$USER1 | jq .

# Test 10: Analytics
echo "=== ANALYTICS ==="
curl -s http://localhost:8080/api/v1/analytics | jq .

# ========================================================================
# SECTION 5: DIRECT DATABASE QUERIES (Optional)
# ========================================================================

# Connect to PostgreSQL and run queries
# docker exec -it uuon-foundation-postgres-1 psql -U user -d uuon << EOF
# SELECT * FROM users;
# SELECT * FROM transactions ORDER BY created_at DESC;
# SELECT * FROM packages;
# SELECT * FROM transfers;
# EOF

# ========================================================================
# SECTION 6: BUILD & PUSH TO RAILWAY
# ========================================================================

# Stage all changes
cd ~/UUON-Foundation
git add -A

# Commit with descriptive message
git commit -m "feat: complete billing system with 14 endpoints and PostgreSQL"

# Push to GitHub (Railway auto-deploys from main)
git push origin main

# Verify push
git log --oneline -5

# ========================================================================
# SECTION 7: DEPLOY VERIFICATION
# ========================================================================

# Check deployment at Railway dashboard
# https://railway.app

# After Railway deploys, test production endpoint:
# curl https://uuon-foundation-billing-system.up.railway.app/health | jq .

# ========================================================================
# SECTION 8: CLEANUP (if needed)
# ========================================================================

# Stop all containers
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# ========================================================================
# ENDPOINT QUICK REFERENCE
# ========================================================================
# System:
#   GET  /                         - Status
#   GET  /health                   - Health check
#   GET  /api/v1/status            - API status
#
# Users:
#   POST /api/v1/users             - Create user
#   GET  /api/v1/users             - List users
#   GET  /api/v1/users/:user_id    - Get user
#
# Packages:
#   GET  /api/v1/packages          - List packages
#
# Credits:
#   POST /api/v1/credits/buy       - Purchase credits
#   GET  /api/v1/credits/balance/:user_id - Check balance
#   POST /api/v1/credits/transfer  - Transfer between users
#   POST /api/v1/credits/use       - Consume credits
#
# Analytics:
#   GET  /api/v1/transactions/:user_id - Transaction history
#   GET  /api/v1/analytics             - System analytics

# ========================================================================
# ENVIRONMENT VARIABLES NEEDED FOR RAILWAY
# ========================================================================
# DATABASE_URL=postgresql://user:password@host:5432/uuon
# PORT=8080
# NODE_ENV=production

echo "✅ All commands listed above"
