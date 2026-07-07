#!/bin/bash
# UUON Billing System - Common Commands Reference

# ========== LOCAL DEVELOPMENT ==========

# Start all services (postgres + api)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild image
docker-compose build --no-cache

# Reset database (careful!)
docker-compose down -v && docker-compose up -d


# ========== TESTING ENDPOINTS ==========

# 1. Create a user
USER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com"}')
echo "Created user: $USER_RESPONSE"
USER_ID=$(echo $USER_RESPONSE | jq -r '.user.id')
echo "User ID: $USER_ID"

# 2. List packages
curl -s http://localhost:8080/api/v1/packages | jq .
PACKAGE_ID=$(curl -s http://localhost:8080/api/v1/packages | jq -r '.packages[0].id')
echo "Package ID: $PACKAGE_ID"

# 3. Buy credits (starter package)
curl -s -X POST http://localhost:8080/api/v1/credits/buy \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"package_id\":\"$PACKAGE_ID\"}" | jq .

# 4. Check balance
curl -s http://localhost:8080/api/v1/credits/balance/$USER_ID | jq .

# 5. Use credits
curl -s -X POST http://localhost:8080/api/v1/credits/use \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"amount\":10,\"description\":\"Test usage\"}" | jq .

# 6. Create another user for transfer
USER2_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com"}')
USER2_ID=$(echo $USER2_RESPONSE | jq -r '.user.id')

# 7. Transfer credits between users
curl -s -X POST http://localhost:8080/api/v1/credits/transfer \
  -H "Content-Type: application/json" \
  -d "{\"from_user_id\":\"$USER_ID\",\"to_user_id\":\"$USER2_ID\",\"amount\":50}" | jq .

# 8. View transaction history
curl -s http://localhost:8080/api/v1/transactions/$USER_ID | jq .

# 9. Analytics
curl -s http://localhost:8080/api/v1/analytics | jq .

# 10. Health check
curl -s http://localhost:8080/health | jq .


# ========== DATABASE DIRECT ACCESS ==========

# Connect to PostgreSQL
docker exec -it uuon-foundation-postgres-1 psql -U user -d uuon

# List all users (from psql prompt)
SELECT * FROM users;

# View all transactions
SELECT * FROM transactions;

# View packages
SELECT * FROM packages;


# ========== DEPLOYMENT TO RAILWAY ==========

# Commit and push
cd ~/UUON-Foundation
git add -A
git commit -m "feat: implement complete billing API with PostgreSQL"
git push origin main

# Then monitor at: https://railway.app


# ========== DEBUGGING ==========

# View API logs
docker logs uuon-foundation-billing-api-1 -f

# View database logs
docker logs uuon-foundation-postgres-1 -f

# Check container status
docker ps

# Restart API
docker restart uuon-foundation-billing-api-1

# Shell into API container
docker exec -it uuon-foundation-billing-api-1 sh

# Shell into database container
docker exec -it uuon-foundation-postgres-1 sh
