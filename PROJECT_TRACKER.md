# InventoryHub Project Tracker

This file tracks the assignment deliverables and the engineering milestones. Keep it updated after each focused feature so the final submission does not become a last-minute documentation scramble.

## Current Phase: Platform scale-up — polish + Phase 6 (in progress)

See [`PHASES_OVERVIEW.md`](PHASES_OVERVIEW.md) and [`SCALE_UP_ROADMAP.md`](SCALE_UP_ROADMAP.md).

### Phase 4 (Platform): Shared DataTable — COMPLETE
- [x] `DataTable` + `ListPagination` components
- [x] Migrated Warehouses, Alerts, SKUs, Forecast, Purchase Orders list tables
- [x] Plan doc: `PHASE_4_DATA_TABLE_PLAN.md`

### Platform polish — COMPLETE
- [x] Category sidebar SKU counts (`includeCounts=true`)
- [x] Manager delete category / delete tag in UI
- [x] Barcode / exact SKU code lookup on Movements
- [ ] Typesense (deferred — Postgres + pg_trgm sufficient)

### Phase 3 warehouse autocomplete — COMPLETE
- [x] `warehouse-search.service` + `useWarehouseSearch` + `WarehouseAutocomplete`
- [x] `resolveWarehouseSeed` for session/default labels
- [x] Movements: receipt/adjustment/transfer use search-first warehouse pickers
- [x] Dashboard + Forecast: warehouse scope with optional clear (global / all)
- [x] Plan doc: `PHASE_3_WAREHOUSE_AUTOCOMPLETE_PLAN.md`

### Phase 2.5 taxonomy admin UI — COMPLETE
- [x] Manager: create category (name + optional parent) on `/skus`
- [x] Manager: create tag (name + color) on `/skus`
- [x] Manager: assign/remove categories and tags on SKU detail strip
- [x] Plan doc: `PHASE_2_5_TAXONOMY_ADMIN_PLAN.md`

### Phase 2 browse/filter UI — COMPLETE
- [x] Category sidebar on SKU list (`GET /categories?format=tree`)
- [x] Tag filter chips + URL params (`category`, `tag`, `q`, `page`)
- [x] SKU detail strip (categories + tags from `GET /skus/:id`)
- [x] Plan doc: `PHASE_2_BROWSE_UI_PLAN.md`

### Phase 1 platform follow-ups — COMPLETE
- [x] `pg_trgm` GIN indexes on SKU + Warehouse name/code
- [x] `GET /warehouses?search=` for future warehouse autocomplete
- [x] Warehouse session context (`inventoryhub.activeWarehouse`, topbar selector)
- [x] Movements / Dashboard / Forecast default from session warehouse
- [x] Category + Tag models, migrations, CRUD APIs
- [x] SKU ↔ category/tag assignment endpoints
- [x] `GET /skus?categoryIds[]` + `tagIds[]` filters; detail includes taxonomy
- [x] Redis `categories:tree` cache (invalidated on category mutations)
- [x] Plan doc: `PHASE_1_PLATFORM_FOLLOWUP_PLAN.md`

### Phase 1 (Search UX): Search-first autocomplete + list contract — COMPLETE
- [x] Standardize paginated list APIs on `{ items, page, perPage, total, totalPages }`
- [x] Frontend `PaginatedResponse<T>`; all list pages use `.items`
- [x] Purchase order list returns `total` / `totalPages` via `purchaseOrderService.count`
- [x] `apiRequest` forwards `AbortSignal` for cancelled stale searches
- [x] Generic `useDebouncedSearch` hook (debounce + React Query + latest-wins)
- [x] Generic `Combobox` UI (keyboard nav, no domain knowledge)
- [x] `sku-search.service` + `useSkuSearch` + `SkuAutocomplete`
- [x] Movements page: SKU dropdowns replaced with search-first autocomplete
- [x] Plan doc: `PHASE_1_SEARCH_AUTOCOMPLETE_PLAN.md`

### Phase 5 — Complete (optimistic UI + forecast) ✅

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
- [x] Dashboard summary cache with TTL
- [x] Seed dataset: 5 warehouses, 10,000 SKUs, 500,000 movements
- [x] Query optimization with EXPLAIN ANALYZE

### Phase 5: Frontend Integration (12 hours)
- [x] TanStack Query integration
- [x] TanStack Table for movement history
- [x] Optimistic updates for UX
- [x] Dashboard UI
- [x] Dashboard warehouse filter and list filters
- [x] Forecasting view

### Phase 6: Testing & Docs (8 hours) — parallel with scale-up
- [x] `ARCHITECTURE.md` exists (core + platform UX section)
- [x] `PHASES_OVERVIEW.md` + `SCALE_UP_ROADMAP.md` (phase map + merge guide)
- [x] `MANUAL_QA.md` — structured manual QA checklist
- [x] Unit tests: `slug.unit.test.ts`, `category-cache.unit.test.ts`
- [x] E2E: `tests/e2e/platform-flow.spec.ts` (login → SKUs → movement receipt)
- [ ] Run E2E in CI or locally with servers up
- [ ] Close manual QA checkboxes after walkthrough
- [ ] 5-7 minute Loom walkthrough

## Branch Work Log

| Branch | Purpose | Status | Key Checks |
| --- | --- | --- | --- |
| `feature/phase-1-search-autocomplete` | Search infrastructure + SKU autocomplete + `items` list contract | **Merged** (PR #11) | `pnpm test:unit`; `pnpm test:int`; `pnpm --dir apps/frontend build` |
| `feature/phase-1-platform-followups` | pg_trgm + warehouse session + category/tags APIs | Pushed | tsc; unit; int; frontend build |
| `feature/phase-2-sku-browse-filters` | Category sidebar + tag chips + URL filters on `/skus` | Ready for PR | frontend build |
| `feature/phase-2-5-taxonomy-admin` | Manager taxonomy create + SKU assign UI | Ready for PR | frontend build |
| `feature/phase-3-warehouse-autocomplete` | Warehouse search pickers on movements/filters | Ready for PR | frontend build |
| `feature/platform-scale-up` | DataTable, polish, Phase 6 tests, docs | Ready for PR | unit; frontend build; e2e manual |
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
- [x] Dashboard summary cache with TTL and movement invalidation

## Verification Log

- [x] Backend TypeScript check: `pnpm --dir apps/backend exec tsc --noEmit`
- [x] Docker: PostgreSQL 16 + Redis 7
- [x] Worker smoke test: `pnpm --dir apps/backend worker`
- [x] Phase 2 transfer integration test still passes after Phase 3 changes
- [x] Phase 3 manual API flow: alerts, PO receive, and import partial failure
- [x] Phase 4 dashboard cache check: `MISS → HIT`
- [x] Phase 4 movement invalidation check: `MISS → HIT → MISS`
- [x] Phase 4 performance seed: 5 warehouses, 10k SKUs, 500k movements
- [x] Phase 4 EXPLAIN: added `StockMovement_createdAt_idx` after seeded measurement
- [x] Phase 5 frontend build: `pnpm --dir apps/frontend build`
- [x] Phase 5 frontend lint: `pnpm --dir apps/frontend lint`
- [x] Phase 5 backend movement history endpoint typecheck
- [x] Phase 1 Search: frontend build after autocomplete (`feature/phase-1-search-autocomplete`)
- [x] Phase 1 Search: backend unit + integration tests pass on search branch
- [ ] Phase 1 Search manual: Movements SKU autocomplete (type, select, clear, submit)
- [ ] Phase 1 Search manual: fast typing does not show stale SKU results
- [x] Phase 1 follow-ups: backend tsc + unit + integration tests pass
- [x] Phase 1 follow-ups: frontend build passes
- [ ] Phase 1 follow-ups manual: topbar warehouse session + movement form defaults
- [ ] Phase 1 follow-ups manual: create category, assign to SKU, filter `GET /skus?categoryIds[]=`
- [x] Phase 2 browse UI: frontend build passes
- [ ] Phase 2 browse UI manual: sidebar + tag chips + URL + SKU detail strip on `/skus`
- [x] Phase 3 warehouse autocomplete: frontend build passes
- [ ] Phase 3 warehouse autocomplete manual: Movements type-to-search warehouse + submit
- [x] Phase 4 DataTable: frontend build passes
- [ ] Phase 4 DataTable manual: pagination on Warehouses, Alerts, SKUs unchanged
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
| GET | `/skus` | Yes | Any (paginated: `items`, optional `search`) |
| GET | `/skus/code/:code` | Yes | Any (cached) |
| GET | `/skus/:id` | Yes | Any |
| PATCH | `/skus/:id` | Yes | MANAGER |
| DELETE | `/skus/:id` | Yes | MANAGER |

**Cache:** key `sku:{CODE}`, TTL 3600s, invalidated on PATCH/DELETE (and when code changes).

## Category & tag API quick reference

| Method | Path | Auth | Role |
| --- | --- | --- | --- |
| GET | `/categories` | Yes | Any (`?format=tree` optional) |
| POST/PATCH/DELETE | `/categories` | Yes | MANAGER |
| GET/POST/PATCH/DELETE | `/tags` | Yes | MANAGER |
| POST | `/skus/:id/categories` | Yes | MANAGER |
| DELETE | `/skus/:id/categories/:categoryId` | Yes | MANAGER |
| POST | `/skus/:id/tags` | Yes | MANAGER |
| DELETE | `/skus/:id/tags/:tagId` | Yes | MANAGER |

**Category tree cache:** key `categories:tree`, TTL 3600s, invalidated on category mutations.
