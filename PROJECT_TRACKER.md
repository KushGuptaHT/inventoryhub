# InventoryHub Project Tracker

This file tracks the assignment deliverables and the engineering milestones. Keep it updated after each focused feature so the final submission does not become a last-minute documentation scramble.

## Current Phase: Phase 1 — In progress

### Phase 1: Foundation (10 hours)
- [x] Infrastructure setup: Fastify, Docker, PostgreSQL, Redis, Prisma schema, migration, generated Prisma client
- [x] Backend foundation: shared Prisma client, shared Redis client, dependency-aware `/health`
- [x] 12-table Prisma schema created with all models
- [x] Migration 20260522114337_init executed
- [x] Auth: JWT login + register (`POST /auth/login`, `POST /auth/register`)
- [x] Auth middleware: `authenticate` + `requireRole` (MANAGER | OPERATOR)
- [x] Warehouse CRUD API with server-side role checks (Manager: POST/PATCH/DELETE; both: GET)
- [x] Dev user seed (manager + operator test accounts)
- [ ] SKU CRUD API (create, read, update, delete, with Redis caching)

### Phase 2: Stock Movement Core (12 hours)
- [ ] Stock receipt API (POST /movements/receipt)
- [ ] Stock adjustment API (POST /movements/adjustment)
- [ ] Stock transfer API (POST /movements/transfer)
- [ ] Atomic transfer transaction with row-level SELECT...FOR UPDATE locking
- [ ] InventoryStock auto-update on movements
- [ ] 50-concurrent-transfer integration test

### Phase 3: Queues & Alerts (10 hours)
- [ ] BullMQ setup (alerts, imports, po-fulfillment queues)
- [ ] Alert creation worker (async, deduplicated)
- [ ] Low-stock alert trigger logic
- [ ] PO fulfillment worker
- [ ] CSV import worker

### Phase 4: Caching & Performance (8 hours)
- [ ] Redis caching and invalidation (SKU cache in Phase 1 SKU CRUD)
- [ ] Dashboard summary cache with TTL
- [ ] Seed dataset: 5 warehouses, 10,000 SKUs, 500,000 movements
- [ ] Query optimization with EXPLAIN ANALYZE

### Phase 5: Frontend Integration (12 hours)
- [ ] TanStack Query integration
- [ ] TanStack Table for movement history
- [ ] Optimistic updates for UX
- [ ] Dashboard UI
- [ ] Forecasting view

### Phase 6: Testing & Docs (8 hours)
- [ ] Unit tests with Vitest
- [ ] Integration tests (real DB + concurrency tests)
- [ ] E2E tests with Playwright
- [ ] README.md with setup and architecture
- [ ] ARCHITECTURE.md with decisions
- [ ] 5-7 minute Loom walkthrough

## Branch Work Log

| Branch | Purpose | Status | Key Checks |
| --- | --- | --- | --- |
| `phase-1-backend-foundation` | Prisma/Redis clients and `/health` | Merged into feature branch history | TypeScript + health smoke test passed |
| `feature/warehouse-crud` | Warehouse CRUD + JWT auth + role guards | Auth committed; push pending | tsc pass; manual RBAC test pending |

## Required Deliverables

- [x] Clean Git history with small focused commits (auth slice)
- [ ] `README.md` with setup, app/worker/test commands, architecture decisions
- [ ] `ARCHITECTURE.md` covering data model, transaction strategy, queue topology, cache strategy
- [ ] Seed script for 5 warehouses, 10,000 SKUs, and 500,000 movements (dev user seed only so far)
- [ ] Playwright HTML test report committed or uploaded as a CI artifact
- [ ] 5-7 minute Loom walkthrough

## Assignment-Critical Backend Work

- [x] Server-side role checks on warehouse mutating routes
- [ ] Server-side role checks on SKU routes (pending SKU CRUD)
- [ ] SKU CRUD
- [x] Warehouse CRUD
- [ ] Immutable stock movement ledger
- [ ] Inventory snapshot updates
- [ ] Transfers respect reserved stock
- [ ] Transfers are atomic
- [ ] 50-concurrent-transfer integration test
- [ ] Low-stock alert jobs are asynchronous and deduplicated
- [ ] Purchase order state transitions are validated server-side
- [ ] CSV imports run in a background worker with per-row status
- [ ] Redis hot SKU cache with explicit invalidation
- [ ] Dashboard summary cache with TTL and movement invalidation

## Verification Log

- [x] Backend TypeScript check: `pnpm --dir apps/backend exec tsc --noEmit`
- [x] `/health` smoke test returned DB + Redis connected
- [x] Git remote: `https://github.com/KushGuptaHT/inventoryhub.git`
- [x] Docker: PostgreSQL 16 + Redis 7 running locally
- [x] Prisma schema + migration `20260522114337_init`
- [ ] **Auth RBAC manual test**: Operator POST /warehouses → 403; Manager → 201
- [ ] **Dev seed**: `pnpm --dir apps/backend db:seed`

## Current Git Status

```
Branch: feature/warehouse-crud
Latest auth commits: (see git log)
Next: push branch, then implement SKU CRUD to close Phase 1
```

## Dev test credentials (local only)

| Email | Password | Role |
| --- | --- | --- |
| manager@inventoryhub.test | Password123! | MANAGER |
| operator@inventoryhub.test | Password123! | OPERATOR |
