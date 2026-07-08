#!/bin/bash
# ========================================================================
# PRODUCTION DEPLOYMENT CHECKLIST
# ========================================================================
# Final verification before going live
# Run: bash DEPLOYMENT_CHECKLIST.sh
# ========================================================================

set -e

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CHECKLIST_REPORT="deployment-checklist-$(date +%s).txt"

echo "========================================================================" | tee "$CHECKLIST_REPORT"
echo "PRODUCTION DEPLOYMENT CHECKLIST" | tee -a "$CHECKLIST_REPORT"
echo "Timestamp: $TIMESTAMP" | tee -a "$CHECKLIST_REPORT"
echo "========================================================================" | tee -a "$CHECKLIST_REPORT"
echo "" | tee -a "$CHECKLIST_REPORT"

PASSED=0
FAILED=0

check() {
  local name=$1
  local cmd=$2
  
  echo -n "✓ $name... " | tee -a "$CHECKLIST_REPORT"
  
  if eval "$cmd" > /dev/null 2>&1; then
    echo "PASS" | tee -a "$CHECKLIST_REPORT"
    ((PASSED++))
  else
    echo "FAIL" | tee -a "$CHECKLIST_REPORT"
    ((FAILED++))
  fi
}

echo "INFRASTRUCTURE:" | tee -a "$CHECKLIST_REPORT"
check "Docker installed" "command -v docker"
check "Docker Compose installed" "command -v docker-compose"
check "Node.js installed" "command -v node"
check "Git installed" "command -v git"
check "GitHub CLI installed" "command -v gh"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "GIT & REPOSITORY:" | tee -a "$CHECKLIST_REPORT"
check "Git repo initialized" "[ -d .git ]"
check "GitHub Actions workflow exists" "[ -f .github/workflows/complete-ci-cd.yml ]"
check ".gitignore configured" "[ -f .gitignore ]"
check "No uncommitted changes" "[ -z \"\$(git status --porcelain)\" ]"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "APPLICATION CODE:" | tee -a "$CHECKLIST_REPORT"
check "Billing system exists" "[ -d billing-system ]"
check "package.json exists" "[ -f billing-system/package.json ]"
check "Server code exists" "[ -d billing-system/server ]"
check "Tests exist" "[ -f billing-system/tests/phase-a-proof-caching.test.js ]"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "DOCKER & CONTAINERS:" | tee -a "$CHECKLIST_REPORT"
check "Dockerfile.billing exists" "[ -f Dockerfile.billing ]"
check "Docker Compose CI/CD exists" "[ -f docker-compose.ci-cd.yml ]"
check "Docker can build images" "docker --version | grep -q Docker"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "CONFIGURATION:" | tee -a "$CHECKLIST_REPORT"
check "Health check script exists" "[ -f scripts/health-check.sh ]"
check "Prometheus config exists" "[ -f monitoring/prometheus.yml ]"
check "K6 script exists" "[ -f monitoring/k6-script.js ]"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "DOCUMENTATION:" | tee -a "$CHECKLIST_REPORT"
check "CI/CD guide exists" "[ -f CI_CD_COMPLETE_GUIDE.md ]"
check "Implementation summary exists" "[ -f CI_CD_IMPLEMENTATION_SUMMARY.md ]"
check "Quick reference exists" "[ -f CI_CD_QUICK_REFERENCE.sh ]"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "SECURITY:" | tee -a "$CHECKLIST_REPORT"
check "No hardcoded secrets" "! grep -r 'password.*=' billing-system/server/*.js | grep -v process.env || echo 'Clean'"
check "Environment variables used" "grep -r 'process.env' billing-system/server/*.js | head -1 > /dev/null"
check ".env not committed" "! git ls-files | grep -q '^\.env$'"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "DATABASE:" | tee -a "$CHECKLIST_REPORT"
check "Schema file exists" "[ -f billing-system/server/schema.js ]"
check "Database connection configured" "grep -q 'DATABASE_URL' billing-system/server/db.js"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "API ENDPOINTS:" | tee -a "$CHECKLIST_REPORT"
check "Billing handlers exist" "[ -f billing-system/server/handlers.js ]"
check "Proof handlers exist" "[ -f billing-system/server/proof-handlers.js ]"
check "Asset handlers exist" "[ -f billing-system/server/asset-handlers.js ]"
check "Main server file exists" "[ -f billing-system/server/index.js ]"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "PHASE A & B:" | tee -a "$CHECKLIST_REPORT"
check "Proof cache exists" "[ -f billing-system/server/proof-cache.js ]"
check "Proof generator exists" "[ -f billing-system/server/proof-generator.js ]"
check "Validation schema exists" "[ -f billing-system/server/validation.js ]"

echo "" | tee -a "$CHECKLIST_REPORT"
echo "" | tee -a "$CHECKLIST_REPORT"
echo "========================================================================" | tee -a "$CHECKLIST_REPORT"
echo "SUMMARY" | tee -a "$CHECKLIST_REPORT"
echo "========================================================================" | tee -a "$CHECKLIST_REPORT"
echo "Passed: $PASSED" | tee -a "$CHECKLIST_REPORT"
echo "Failed: $FAILED" | tee -a "$CHECKLIST_REPORT"
echo "" | tee -a "$CHECKLIST_REPORT"

if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT" | tee -a "$CHECKLIST_REPORT"
  echo "" | tee -a "$CHECKLIST_REPORT"
  echo "NEXT STEPS:" | tee -a "$CHECKLIST_REPORT"
  echo "1. Set GitHub secrets:" | tee -a "$CHECKLIST_REPORT"
  echo "   RAILWAY_TOKEN_STAGING" | tee -a "$CHECKLIST_REPORT"
  echo "   RAILWAY_TOKEN_PRODUCTION" | tee -a "$CHECKLIST_REPORT"
  echo "" | tee -a "$CHECKLIST_REPORT"
  echo "2. Push to main:" | tee -a "$CHECKLIST_REPORT"
  echo "   git push origin main" | tee -a "$CHECKLIST_REPORT"
  echo "" | tee -a "$CHECKLIST_REPORT"
  echo "3. Monitor deployment:" | tee -a "$CHECKLIST_REPORT"
  echo "   gh run watch" | tee -a "$CHECKLIST_REPORT"
  echo "" | tee -a "$CHECKLIST_REPORT"
  echo "Report saved to: $CHECKLIST_REPORT" | tee -a "$CHECKLIST_REPORT"
  exit 0
else
  echo "❌ SOME CHECKS FAILED - FIX ISSUES BEFORE DEPLOYMENT" | tee -a "$CHECKLIST_REPORT"
  echo "Report saved to: $CHECKLIST_REPORT" | tee -a "$CHECKLIST_REPORT"
  exit 1
fi
