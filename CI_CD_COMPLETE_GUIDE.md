# CI/CD IMPLEMENTATION - COMPLETE OPERATIONAL GUIDE

## Overview

Complete automated CI/CD pipeline with 10 stages ensuring full operational functionality:

```
Code Push
    ↓
[1. Quality Gates] → Lint, security baseline, dependency audit
    ↓
[2. Unit Tests] → Phase A/B tests, schema validation
    ↓
[3. Security Scan] → CodeQL, vulnerability detection
    ↓
[4. Build Docker Image] → Multi-stage optimized image
    ↓
[5. Deploy to Staging] → Automated deployment
    ↓
[6. Smoke Tests] → Basic connectivity and health
    ↓
[7. Integration Tests] → Full API suite on staging
    ↓
[8. Deploy to Production] → Automated production deployment
    ↓
[9. Post-Deployment Monitoring] → Performance and stability
    ↓
[10. Rollback (if needed)] → Automatic rollback on failure
```

---

## Architecture

### Git Branches

```
main          → Production (protected, auto-deploy on PR merge)
staging       → Staging environment (auto-deploy)
develop       → Development (manual tests before PR)
feature/*     → Feature branches (PR required)
```

### Deployment Environments

| Environment | Branch | Trigger | Approval | URL |
|-------------|--------|---------|----------|-----|
| Development | develop | Manual | None | localhost:5001 |
| Staging | staging | Push | Optional | staging-billing.uuon.io |
| Production | main | Push | Required | billing.uuon.io |

---

## Stage Details

### Stage 1: Quality Gates

**Time:** ~2 minutes  
**Purpose:** Fast feedback on code quality  
**Steps:**
- Dependency audit (npm audit)
- Lint checks (ESLint if configured)
- Secret detection (hardcoded passwords/tokens)
- Code style validation
- No console.log in production code

**Failure:** Stops pipeline, PR blocked

### Stage 2: Unit Tests

**Time:** ~1 minute  
**Purpose:** Validate core functionality  
**Tests:**
- Phase A: Proof caching (8 tests)
- Phase B: Data assets (included in integration)
- Schema validation
- Import checks

**Coverage:** ProofCache, ProofGenerator, database initialization  
**Failure:** Stops pipeline

### Stage 3: Security Scanning

**Time:** ~3-5 minutes  
**Purpose:** Detect vulnerabilities  
**Scans:**
- CodeQL analysis (SAST)
- Dependency vulnerabilities
- Secret detection
- Dangerous patterns (eval, exec, etc)

**Action:** Creates security alerts, may block critical issues

### Stage 4: Build Docker Image

**Time:** ~5 minutes  
**Purpose:** Create optimized production image  
**Features:**
- Multi-stage build (base → dependencies → builder → production)
- Non-root user
- Health check built-in
- Minimal size optimization
- Cache layers for speed

**Output:** Published to GitHub Container Registry (ghcr.io)

### Stage 5: Deploy to Staging

**Time:** ~2 minutes  
**Purpose:** Deploy to staging environment  
**Steps:**
1. Deploy via Railway
2. Wait 30s for startup
3. Run health checks

**Only runs on:** staging/develop branches  
**Rollback:** Manual via Railway dashboard

### Stage 6: Smoke Tests (Staging)

**Time:** ~1 minute  
**Purpose:** Verify basic functionality  
**Tests:**
- API is accessible (GET /)
- Health check responds (GET /health)
- Database connection OK (GET /api/v1/status)

**Failure:** Blocks production deployment

### Stage 7: Integration Tests (Staging)

**Time:** ~2 minutes  
**Purpose:** Full API surface testing  
**Tests:**
- User creation
- Credit balance queries
- Proof generation
- Transaction history

**Uses:** Real staging API + database

### Stage 8: Deploy to Production

**Time:** ~1 minute  
**Purpose:** Production deployment  
**Requirements:**
- All previous stages passed
- On main branch
- Manual approval (optional, configurable)

**Process:**
1. Create GitHub deployment
2. Deploy to Railway production
3. Wait 60s
4. Run health checks (60 attempts, 5s interval)

**Rollback Trigger:** Health check fails after 60s

### Stage 9: Post-Deployment Monitoring

**Time:** ~1 minute  
**Purpose:** Validate production stability  
**Metrics:**
- Response time (should be < 5s)
- Error rate
- Uptime

**Action:** Alerts if metrics degrade

### Stage 10: Notification & Rollback

**Time:** ~varies  
**Purpose:** Notifications and automatic rollback  
**Actions:**
- Success: Slack notification
- Failure: Create GitHub issue, email alert
- Critical: Trigger automatic rollback

---

## Local Development CI/CD

### Setup

```bash
# 1. Start all services locally
docker-compose -f docker-compose.ci-cd.yml up -d

# 2. Run health check
bash scripts/health-check.sh development

# 3. Run unit tests
cd billing-system && node tests/phase-a-proof-caching.test.js

# 4. Run API integration tests
bash billing-system/tests/api-test-phase-a-b.sh
```

### Services (Docker Compose)

```
Service                Port    Status
───────────────────────────────────────
PostgreSQL            5432    postgres_ci
Billing API (Dev)     5001    billing-api-dev
Billing API (Staging) 5002    billing-api-staging
Redis                 6379    redis_ci
Prometheus            9090    prometheus
Grafana               3000    grafana
```

### Access

```bash
# API
curl http://localhost:5001/health

# Database
psql -h localhost -U uuon_user -d uuon_db

# Grafana
open http://localhost:3000 (admin/admin)

# Prometheus
open http://localhost:9090
```

---

## GitHub Actions Workflow

### Trigger CI/CD

```bash
# Automatic (push)
git push origin main        # Triggers full pipeline
git push origin staging      # Triggers staging deployment
git push origin develop      # Triggers tests only

# Pull request
git push origin feature/my-feature
# → Runs quality gates, unit tests, security scan
# → Requires approval to merge
```

### Monitor Builds

```bash
# View in GitHub
https://github.com/REPO/actions

# Via CLI (if you have GitHub CLI)
gh run list --branch main
gh run view <run-id>
```

---

## Configuration Files

### Complete-CI-CD.yml

**Location:** `.github/workflows/complete-ci-cd.yml`

**Key Secrets Required:**
```yaml
RAILWAY_TOKEN_STAGING         # Railway API token (staging)
RAILWAY_TOKEN_PRODUCTION      # Railway API token (production)
GITHUB_TOKEN                  # Auto-provided (pull requests, etc)
```

**Set secrets in GitHub:**
1. Settings → Secrets and variables → Actions
2. New repository secret
3. Add RAILWAY_TOKEN_STAGING, RAILWAY_TOKEN_PRODUCTION

### Dockerfile.billing

**Multi-stage build:**
- **base:** Node 20 Alpine
- **dependencies:** Production deps only
- **builder:** Full deps for tests
- **production:** Optimized final image (non-root, health check)
- **debug:** For troubleshooting

**Build locally:**
```bash
docker build -f Dockerfile.billing -t uuon-billing:latest billing-system/
```

### Docker-compose.ci-cd.yml

**Profiles:**
```bash
# Default (dev + staging + monitoring)
docker-compose -f docker-compose.ci-cd.yml up

# With security scanning
docker-compose -f docker-compose.ci-cd.yml --profile security up zap

# With load testing
docker-compose -f docker-compose.ci-cd.yml --profile load-test up load-test

# Run tests only
docker-compose -f docker-compose.ci-cd.yml --profile test up test-runner
```

---

## Health Check Script

### Usage

```bash
# Development environment
bash scripts/health-check.sh development

# Staging environment
bash scripts/health-check.sh staging

# Production environment
bash scripts/health-check.sh production

# Docker services
bash scripts/health-check.sh docker
```

### Output

```
================================
CI/CD HEALTH CHECK - development
Timestamp: 2025-01-16 14:30:45
================================

INFRASTRUCTURE CHECKS:
───────────────────────────────────────────────────────────────────
Checking Docker... ✓ PASS
Checking Docker Compose... ✓ PASS
Checking Node.js... ✓ PASS
Checking Git... ✓ PASS

SERVICE HEALTH:
───────────────────────────────────────────────────────────────────
Checking PostgreSQL... ✓ PASS
Checking Billing API (Dev)... ✓ PASS
Checking Billing API (Staging)... ⚠️ WARNING: Not running

CODE QUALITY:
───────────────────────────────────────────────────────────────────
Checking npm dependencies... ✓ PASS
Checking No hardcoded secrets... ✓ PASS

API ENDPOINTS:
───────────────────────────────────────────────────────────────────
Checking GET /... ✓ PASS
Checking GET /health... ✓ PASS
Checking GET /api/v1/packages... ✓ PASS

========================================================================
SUMMARY
========================================================================
Passed: 12
Failed: 0
Warnings: 1
✓ ALL CHECKS PASSED
```

---

## Monitoring & Observability

### Prometheus Metrics

**Endpoint:** http://localhost:9090

**Key Metrics:**
- `http_requests_total` - Total API requests
- `http_request_duration_seconds` - Response time
- `http_request_failures_total` - Failed requests
- `active_users` - Concurrent users
- `database_connection_pool_size` - DB connections

### Grafana Dashboards

**Access:** http://localhost:3000 (admin/admin)

**Pre-configured:**
- API Health Dashboard
- Database Performance
- Request Latency
- Error Rate Trends

### K6 Load Testing

```bash
# Local load test
docker-compose -f docker-compose.ci-cd.yml --profile load-test up load-test

# Custom parameters
K6_VUS=50 K6_DURATION=5m docker-compose ... up load-test

# Output example
==================================================
K6 LOAD TEST SUMMARY
==================================================
Total Duration: 305s
Total Requests: 15,240
Failed Requests: 23
Average Response Time: 87ms
P95 Response Time: 234ms
P99 Response Time: 512ms
==================================================
```

---

## Deployment Processes

### Manual Staging Deployment

```bash
# Deploy via CI/CD (automatic on push)
git commit -am "Update billing system"
git push origin staging

# Or manual via Railway
railway up --service uuon-foundation-billing-staging
```

### Manual Production Deployment

```bash
# 1. Merge PR to main (triggers full CI/CD)
git checkout main
git merge staging

# 2. Monitor deployment
gh run watch

# 3. Verify production
curl https://billing.uuon.io/health | jq '.'
```

### Rollback Procedure

```bash
# Automatic (if health checks fail)
# → CI/CD will automatically deploy previous stable version

# Manual rollback
git revert <commit-hash>
git push origin main
# → New deployment will use previous commit
```

---

## Troubleshooting

### Pipeline Failure

**Step 1: Check logs**
```bash
gh run view <run-id> --log
```

**Step 2: Identify stage**
- Quality gates → Fix linting/secrets
- Unit tests → Debug test failures
- Security scan → Address vulnerabilities
- Docker build → Check Dockerfile
- Deployment → Check Railway logs
- Health checks → Verify service is responding

**Step 3: Fix locally**
```bash
bash scripts/health-check.sh development
docker-compose -f docker-compose.ci-cd.yml logs billing-api-dev
```

### Database Issues

```bash
# Check database connection
docker exec uuon-postgres-ci psql -U uuon_user -d uuon_db -c '\dt'

# View logs
docker logs uuon-postgres-ci

# Reset database
docker-compose -f docker-compose.ci-cd.yml down -v
docker-compose -f docker-compose.ci-cd.yml up -d postgres
```

### Performance Issues

```bash
# Check metrics
curl http://localhost:9090/api/v1/query?query=http_request_duration_seconds

# Run load test
docker-compose --profile load-test up load-test

# Check container resources
docker stats uuon-billing-api-dev
```

---

## Metrics & SLOs

### Service Level Objectives

| Metric | Target | Alert |
|--------|--------|-------|
| Uptime | 99.5% | < 99% |
| Response Time (p95) | < 500ms | > 1s |
| Error Rate | < 0.1% | > 0.5% |
| Deployment Time | < 5min | > 10min |
| Build Time | < 10min | > 15min |

### Dashboard View

**Grafana:** http://localhost:3000
- Real-time metrics
- Historical trends
- Alerting status

---

## Security Best Practices

### Before Deployment

✅ All tests pass  
✅ Security scan clean  
✅ No hardcoded secrets  
✅ Dependencies audited  
✅ Code reviewed (PR approval)

### In Production

✅ Non-root container user  
✅ Health checks every 30s  
✅ Automatic rollback on failure  
✅ Rate limiting enabled  
✅ Audit logging active

---

## Quick Commands

```bash
# Start everything
docker-compose -f docker-compose.ci-cd.yml up -d

# Health check
bash scripts/health-check.sh development

# Run tests locally
cd billing-system && npm test

# View logs
docker-compose -f docker-compose.ci-cd.yml logs -f billing-api-dev

# Stop everything
docker-compose -f docker-compose.ci-cd.yml down

# Clean everything
docker-compose -f docker-compose.ci-cd.yml down -v
```

---

## Summary

**10-Stage CI/CD Pipeline:**
1. ✅ Quality Gates (code quality)
2. ✅ Unit Tests (functionality)
3. ✅ Security Scan (vulnerabilities)
4. ✅ Build Docker (optimization)
5. ✅ Deploy Staging (automated)
6. ✅ Smoke Tests (basic checks)
7. ✅ Integration Tests (full coverage)
8. ✅ Deploy Production (final stage)
9. ✅ Post-Deploy Monitoring (stability)
10. ✅ Rollback (auto recovery)

**Result:** Full operational functionality with automated testing, deployment, monitoring, and rollback.

Ready for production! 🚀

