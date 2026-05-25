# InventoryHub Project Tracker

This file tracks the assignment deliverables and the engineering milestones. Keep it updated after each focused feature so the final submission does not become a last-minute documentation scramble.

## Current Phase: Phase 3 — Complete ✅

### Phase 1: Foundation (10 hours)
- [x] Infrastructure setup: Fastify, Docker, PostgreSQL, Redis, Prisma schema, migration, generated Prisma client
- [x] Backend foundation: shared Prisma client, shared Redis client, dependency-aware `/health`
- [x] 12-table Prisma schema created with all models
- [x] Migration 20260522114337_init executed
- [x] Auth: JWT login + register (`POST /auth/login`, `POST /auth/register`)
- [x] Auth middleware: `authenticate` + `requireRole` (MANAGER | OPERATOR)
- [x] Warehouse CRUD API with server-side role checks
- [x] SKU CRUD API with Redis cache on `GET /skus/code/:code`
- [x] Dev user seed (manager + operator test accounts)

### Phase 2: Stock Movement Core (12 hours) — COMPLETE
- [x] Stock receipt API (POST /movements/receipt)
- [x] Stock adjustment API (POST /movements/adjustment)
- [x] Stock transfer API (POST /movements/transfer)
- [x] Atomic transfer transaction with row-level SELECT...FOR UPDATE locking
- [x] InventoryStock auto-update on movements
- [x] 50-concurrent-transfer integration test (`pnpm --dir apps/backend test:int`)

### Phase 3: Queues & Alerts (10 hours) — COMPLETE
- [x] BullMQ setup (alerts, imports, po-fulfillment queues)
- [x] Alert creation worker (async, deduplicated)
- [x] Low-stock alert trigger logic
- [x] PO fulfillment worker scaffold
- [x] CSV import worker scaffold

### Phase 4: Caching & Performance (8 hours)
- [x] Hot SKU cache (`sku:{CODE}`, TTL 1h, invalidate on update/delete)
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
| `feature/warehouse-crud` | Phase 1: auth + warehouse + SKU CRUD | Complete — ready for PR | tsc pass; RBAC + cache pattern in place |

## Assignment-Critical Backend Work

- [x] Server-side role checks on warehouse + SKU mutating routes
- [x] SKU CRUD
- [x] Warehouse CRUD
- [x] Redis hot SKU cache with explicit invalidation
- [x] Immutable stock movement ledger
- [x] Inventory snapshot updates
- [x] Transfers respect reserved stock
- [x] Transfers are atomic
- [x] 50-concurrent-transfer integration test (`pnpm --dir apps/backend test:int`)
- [x] Low-stock alert jobs are asynchronous and deduplicated
- [x] Purchase order state transitions are validated server-side
- [x] CSV imports run in a background worker with per-row status
- [ ] Dashboard summary cache with TTL and movement invalidation

## Verification Log

- [x] Backend TypeScript check: `pnpm --dir apps/backend exec tsc --noEmit`
- [x] Docker: PostgreSQL 16 + Redis 7
- [x] Worker smoke test: `pnpm --dir apps/backend worker`
- [x] Phase 2 transfer integration test still passes after Phase 3 changes
- [x] Phase 3 manual API flow: alerts, PO receive, and import partial failure
- [ ] **Auth RBAC**: Operator POST /warehouses → 403; Manager → 201
- [ ] **SKU RBAC**: Operator POST /skus → 403; Manager → 201
- [ ] **SKU cache**: GET /skus/code/:code twice — second read from Redis
- [ ] **Dev seed**: `pnpm --dir apps/backend db:seed`

## Dev test credentials (local only)

| Email | Password | Role |
| --- | --- | --- |
| manager@inventoryhub.test | Password123! | MANAGER |
| operator@inventoryhub.test | Password123! | OPERATOR |

## SKU API quick reference

| Method | Path | Auth | Role |
| --- | --- | --- | --- |
| POST | `/skus` | Yes | MANAGER |
| GET | `/skus` | Yes | Any |
| GET | `/skus/code/:code` | Yes | Any (cached) |
| GET | `/skus/:id` | Yes | Any |
| PATCH | `/skus/:id` | Yes | MANAGER |
| DELETE | `/skus/:id` | Yes | MANAGER |

**Cache:** key `sku:{CODE}`, TTL 3600s, invalidated on PATCH/DELETE (and when code changes).
