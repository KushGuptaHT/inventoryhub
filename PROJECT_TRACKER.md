# InventoryHub Project Tracker

This file tracks the assignment deliverables and the engineering milestones. Keep it updated after each focused feature so the final submission does not become a last-minute documentation scramble.

## Current Phase: STEP 1 COMPLETE ✅

### Phase 1: Foundation (10 hours)
- [x] Infrastructure setup: Fastify, Docker, PostgreSQL, Redis, Prisma schema, migration, generated Prisma client
- [x] Backend foundation: shared Prisma client, shared Redis client, dependency-aware `/health`
- [x] 12-table Prisma schema created with all models (users, warehouses, skus, inventory_stock, stock_movements, alerts, alert_audit_logs, purchase_orders, purchase_order_lines, purchase_order_audit_log, imports, import_rows)
- [x] Migration 20260522114337_init executed
- [x] Database fully seeded with schema
- [x] Prisma Client (v7.8.0) generated to src/generated/prisma

### Phase 2: Stock Movement Core (12 hours) - STARTING NOW
- [ ] Auth middleware + role enforcement (MANAGER | OPERATOR)
- [ ] User CRUD API (register, login, list users)
- [x] Warehouse CRUD API (create, read, update, delete)
- [ ] SKU CRUD API (create, read, update, delete, with caching)
- [ ] Stock receipt API (POST /movements/receipt)
- [ ] Stock adjustment API (POST /movements/adjustment)
- [ ] Stock transfer API (POST /movements/transfer)
- [ ] Atomic transfer transaction with row-level SELECT...FOR UPDATE locking
- [ ] InventoryStock auto-update on movements

### Phase 3: Queues & Alerts (10 hours)
- [ ] BullMQ setup (alerts, imports, po-fulfillment queues)
- [ ] Alert creation worker (async, deduplicated)
- [ ] Low-stock alert trigger logic
- [ ] PO fulfillment worker
- [ ] CSV import worker

### Phase 4: Caching & Performance (8 hours)
- [ ] Redis caching and invalidation
- [ ] Hot SKU lookups cached by code
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
- [ ] E2E tests with Playwright (50 concurrent transfers test)
- [ ] README.md with setup and architecture
- [ ] ARCHITECTURE.md with decisions
- [ ] 5-7 minute Loom walkthrough

## Branch Work Log

| Branch | Purpose | Status | Key Checks |
| --- | --- | --- | --- |
| `phase-1-backend-foundation` | Establish reusable Prisma/Redis clients and real infrastructure health checks. | Ready for review | TypeScript check passed; `/health` smoke test returned DB + Redis connected. |
| `feature/warehouse-crud` | Implement warehouse CRUD endpoints and server-side role checks. | Started | Based on phase-1-backend-foundation; branch created after pull. |

## Required Deliverables

- [ ] Clean Git history with small focused commits and meaningful messages
- [ ] `README.md` with setup, app/worker/test commands, architecture decisions, and "what I would do differently"
- [ ] `ARCHITECTURE.md` covering data model, transaction strategy, queue topology, cache strategy, and optional diagram
- [ ] Seed script for 5 warehouses, 10,000 SKUs, and 500,000 movements
- [ ] Playwright HTML test report committed or uploaded as a CI artifact
- [ ] 5-7 minute Loom showing the app, concurrent-transfer test, and one key design decision

## Assignment-Critical Backend Work

- [ ] Server-side role checks on every mutating route
- [ ] SKU CRUD
- [ ] Warehouse CRUD
- [ ] Immutable stock movement ledger
- [ ] Inventory snapshot updates
- [ ] Transfers respect reserved stock
- [ ] Transfers are atomic
- [ ] 50-concurrent-transfer integration test proves stock never goes negative
- [ ] Low-stock alert jobs are asynchronous and deduplicated
- [ ] Purchase order state transitions are validated server-side
- [ ] CSV imports run in a background worker with per-row status
- [ ] Redis hot SKU cache with explicit invalidation
- [ ] Dashboard summary cache with TTL and movement invalidation
- [ ] Movement history and dashboard meet the 250 ms p95 target on seeded data

## Suggested Focused Commits

- `chore: add shared prisma and redis clients`
- `feat: add infrastructure health checks`
- `docs: track assignment deliverables`
- `feat: add warehouse crud api`
- `test: cover warehouse crud`

## Verification Log

- [x] Backend TypeScript check: `pnpm --dir apps/backend exec tsc --noEmit`
- [x] `/health` smoke test with Fastify `app.inject()` returned `200` and `{"status":"ok","database":"connected","redis":"connected"}`
- [x] Git remote configured: `https://github.com/KushGuptaHT/inventoryhub.git`
- [x] **NEW (May 22, 2026 09:15 UTC)**: Docker containers running (PostgreSQL 16, Redis 7)
- [x] **NEW (May 22, 2026 19:41 UTC)**: Prisma schema with 12 models created
- [x] **NEW (May 22, 2026 19:41 UTC)**: Migration executed: `20260522114337_init`
- [x] **NEW (May 22, 2026 19:41 UTC)**: All 12 tables created in PostgreSQL
- [x] **NEW (May 22, 2026 19:41 UTC)**: Prisma Client v7.8.0 generated
- [x] **NEW (May 22, 2026 19:41 UTC)**: PrismaPg adapter configured for PostgreSQL
- [x] **NEXT**: Commit changes and move to Phase 2 APIs

## Current Git Status

```
Branch: feature/warehouse-crud (based on phase-1-backend-foundation)
Commits: 9 total
Latest: 021a139 - docs: add phase 1 api plan for backend feature work
Status: feature branch created after pulling latest foundation work
```

## What is GitLens?

**GitLens** is a VS Code extension that shows:
- Git blame (who changed each line, when)
- Commit history (hover over code to see commit details)
- Repository insights
- Branch tracking

**You're NOT getting it because:**
- It's an optional VS Code extension
- You may not have it installed, OR
- If installed, you need to open a file with code in it
- It integrates with your git repository

**To enable it in VS Code:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "GitLens"
4. Click Install (published by eamodio)
5. Reload VS Code
6. Open any file in the project → You'll see git blame on the right side
