# UUON Foundation

Core infrastructure, billing system, documentation, and shared utilities for UUON ecosystem.

## Structure

- `billing-system/` - Credit system API (14 endpoints)
- `shared/` - Reusable modules (auth, encryption, hashing)
- `services/` - Research tools and utilities
- `archive/` - Strategic documentation

## Quick Start

```bash
cd billing-system
npm install
npm run dev
```

API runs on http://localhost:8080

## Endpoints

- GET `/health` - Health check
- GET `/api/credits/packages` - View credit packages
- POST `/api/credits/buy` - Purchase credits
- GET `/api/credits/balance` - Check balance
- POST `/api/credits/transfer` - Transfer credits
- ... (14 total endpoints)
