#!/bin/bash
# ========================================================================
# CI/CD OPERATIONAL HEALTH CHECK
# ========================================================================
# Comprehensive health check script for all components
# Run: bash scripts/health-check.sh [environment]
# ========================================================================

set -e

ENVIRONMENT="${1:-development}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
HEALTH_REPORT="health-report-$ENVIRONMENT-$(date +%s).txt"

echo "========================================================================" | tee "$HEALTH_REPORT"
echo "CI/CD HEALTH CHECK - $ENVIRONMENT" | tee -a "$HEALTH_REPORT"
echo "Timestamp: $TIMESTAMP" | tee -a "$HEALTH_REPORT"
echo "========================================================================" | tee -a "$HEALTH_REPORT"
echo "" | tee -a "$HEALTH_REPORT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

check_component() {
  local name=$1
  local check_fn=$2
  
  echo -n "Checking $name... " | tee -a "$HEALTH_REPORT"
  
  if $check_fn; then
    echo -e "${GREEN}✓ PASS${NC}" | tee -a "$HEALTH_REPORT"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}" | tee -a "$HEALTH_REPORT"
    ((FAILED++))
  fi
}

warn_component() {
  local name=$1
  local message=$2
  
  echo -e "${YELLOW}⚠️  WARNING: $name${NC}" | tee -a "$HEALTH_REPORT"
  echo "   $message" | tee -a "$HEALTH_REPORT"
  ((WARNINGS++))
}

# ========================================================================
# CHECKS
# ========================================================================

echo "INFRASTRUCTURE CHECKS:" | tee -a "$HEALTH_REPORT"
echo "───────────────────────────────────────────────────────────────────" | tee -a "$HEALTH_REPORT"

# Docker
check_component "Docker" "command -v docker > /dev/null 2>&1"

# Docker Compose
check_component "Docker Compose" "command -v docker-compose > /dev/null 2>&1"

# Node.js
check_component "Node.js" "command -v node > /dev/null 2>&1"

# Git
check_component "Git" "command -v git > /dev/null 2>&1"

echo "" | tee -a "$HEALTH_REPORT"
echo "SERVICE HEALTH:" | tee -a "$HEALTH_REPORT"
echo "───────────────────────────────────────────────────────────────────" | tee -a "$HEALTH_REPORT"

if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "docker" ]; then
  # Check if containers are running
  check_component "PostgreSQL" "docker ps | grep -q 'uuon-postgres' || docker-compose -f docker-compose.ci-cd.yml ps postgres | grep -q running"
  
  check_component "Billing API (Dev)" "curl -s http://localhost:5001/health | jq '.status' | grep -q healthy"
  
  check_component "Billing API (Staging)" "curl -s http://localhost:5002/health | jq '.status' | grep -q healthy" || warn_component "Billing API (Staging)" "Not running - run with docker-compose"
  
  check_component "Redis" "docker ps | grep -q 'uuon-redis' || docker-compose -f docker-compose.ci-cd.yml ps redis | grep -q running"
fi

if [ "$ENVIRONMENT" = "staging" ]; then
  check_component "Staging API" "curl -s https://staging-billing.uuon.io/health | jq '.status' | grep -q healthy"
  
  check_component "Staging Database" "curl -s https://staging-billing.uuon.io/api/v1/status | jq '.status' | grep -q online"
fi

if [ "$ENVIRONMENT" = "production" ]; then
  check_component "Production API" "curl -s https://billing.uuon.io/health | jq '.status' | grep -q healthy"
  
  check_component "Production Database" "curl -s https://billing.uuon.io/api/v1/status | jq '.status' | grep -q online"
  
  check_component "Production Response Time" "[ $(curl -w '%{time_total}' -s -o /dev/null https://billing.uuon.io/health) -lt 5 ]"
fi

echo "" | tee -a "$HEALTH_REPORT"
echo "CODE QUALITY:" | tee -a "$HEALTH_REPORT"
echo "───────────────────────────────────────────────────────────────────" | tee -a "$HEALTH_REPORT"

# Check dependencies
check_component "npm dependencies" "cd billing-system && npm ls --depth=0 > /dev/null 2>&1"

# Check for hardcoded secrets
check_component "No hardcoded secrets" "! grep -r 'password\|secret\|token' billing-system/server/*.js | grep -v 'process.env' | grep -v '// ' > /dev/null 2>&1"

# Check for console.log in production code
check_component "No console.log" "! grep -r 'console.log' billing-system/server/*.js > /dev/null 2>&1 || warn_component 'Console logs in production' 'Found console.log statements'"

echo "" | tee -a "$HEALTH_REPORT"
echo "DATABASE:" | tee -a "$HEALTH_REPORT"
echo "───────────────────────────────────────────────────────────────────" | tee -a "$HEALTH_REPORT"

# Test database connection
if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "docker" ]; then
  check_component "Database connectivity" "docker exec uuon-postgres-ci psql -U uuon_user -d uuon_db -c 'SELECT 1' > /dev/null 2>&1"
  
  check_component "Database tables exist" "docker exec uuon-postgres-ci psql -U uuon_user -d uuon_db -c '\dt' | grep -q users"
fi

echo "" | tee -a "$HEALTH_REPORT"
echo "API ENDPOINTS:" | tee -a "$HEALTH_REPORT"
echo "───────────────────────────────────────────────────────────────────" | tee -a "$HEALTH_REPORT"

if [ "$ENVIRONMENT" = "development" ]; then
  BASE_URL="http://localhost:5001"
  
  check_component "GET /" "curl -s $BASE_URL/ | jq '.status' | grep -q online"
  check_component "GET /health" "curl -s $BASE_URL/health | jq '.status' | grep -q healthy"
  check_component "GET /api/v1/status" "curl -s $BASE_URL/api/v1/status | jq '.status' | grep -q online"
  check_component "GET /api/v1/packages" "curl -s $BASE_URL/api/v1/packages | jq '.packages' > /dev/null"
fi

echo "" | tee -a "$HEALTH_REPORT"
echo "MONITORING:" | tee -a "$HEALTH_REPORT"
echo "───────────────────────────────────────────────────────────────────" | tee -a "$HEALTH_REPORT"

if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "docker" ]; then
  check_component "Prometheus" "curl -s http://localhost:9090/-/healthy > /dev/null 2>&1" || warn_component "Prometheus" "Not running on port 9090"
  
  check_component "Grafana" "curl -s http://localhost:3000/api/health > /dev/null 2>&1" || warn_component "Grafana" "Not running on port 3000"
fi

echo "" | tee -a "$HEALTH_REPORT"
echo "========================================================================" | tee -a "$HEALTH_REPORT"
echo "SUMMARY" | tee -a "$HEALTH_REPORT"
echo "========================================================================" | tee -a "$HEALTH_REPORT"

echo "Passed: $PASSED" | tee -a "$HEALTH_REPORT"
echo "Failed: $FAILED" | tee -a "$HEALTH_REPORT"
echo "Warnings: $WARNINGS" | tee -a "$HEALTH_REPORT"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}" | tee -a "$HEALTH_REPORT"
  exit 0
else
  echo -e "${RED}✗ SOME CHECKS FAILED${NC}" | tee -a "$HEALTH_REPORT"
  exit 1
fi
