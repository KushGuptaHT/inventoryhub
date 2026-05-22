# InventoryHub Project Tracker

This file tracks the assignment deliverables and the engineering milestones. Keep it updated after each focused feature so the final submission does not become a last-minute documentation scramble.

## Current Phase

- [x] Infrastructure setup: Fastify, Docker, PostgreSQL, Redis, Prisma schema, migration, generated Prisma client
- [x] Backend foundation: shared Prisma client, shared Redis client, dependency-aware `/health`
- [ ] Warehouse CRUD API
- [ ] SKU CRUD API
- [ ] Auth and role enforcement
- [ ] Stock receipt, adjustment, and transfer APIs
- [ ] Atomic transfer transaction with row-level locking
- [ ] BullMQ workers for alerts, imports, and PO fulfillment
- [ ] Redis caching and invalidation
- [ ] Frontend integration
- [ ] Performance seed dataset and query tuning
- [ ] Final tests, docs, and Loom walkthrough

## Branch Work Log

| Branch | Purpose | Status | Key Checks |
| --- | --- | --- | --- |
| `phase-1-backend-foundation` | Establish reusable Prisma/Redis clients and real infrastructure health checks. | Ready for review | TypeScript check passed; `/health` smoke test returned DB + Redis connected. |

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
