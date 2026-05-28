# InventoryHub Architecture

This document captures the key design decisions and how the main workflows work end-to-end.

## Core data model (dual-ledger inventory)

Inventory is represented using a dual-ledger approach:

- **`StockMovement`**: immutable ledger of every receipt/adjustment/transfer
- **`InventoryStock`**: denormalized snapshot per (SKU, warehouse) for fast reads

**Available stock** is always computed as:

\[
available = stockLevel - reserved
\]

## Concurrency + correctness (transfers)

Transfers run inside a single Postgres transaction and use row-level locks:

- Lock `InventoryStock` rows with `SELECT ... FOR UPDATE`
- Validate `quantity <= available`
- Atomically decrement source and increment destination
- Insert a `StockMovement` row

This is validated by the integration test:

- [`apps/backend/tests/transfer-concurrency.integration.test.ts`](apps/backend/tests/transfer-concurrency.integration.test.ts)

## Auth + RBAC

- JWT auth (`Authorization: Bearer <token>`)
- Roles: `MANAGER` and `OPERATOR`
- Server-side enforcement via middleware:
  - `authenticate` ensures a valid JWT
  - `requireRole` enforces route-specific role requirements

Integration proof:

- [`apps/backend/tests/rbac.integration.test.ts`](apps/backend/tests/rbac.integration.test.ts)

## Background jobs (BullMQ)

Slow or non-critical work runs in queues:

- **Alerts**: low-stock checks after movements
- **Imports**: CSV-like bulk processing with per-row status
- **PO fulfillment**: receive PO creates stock receipts

Workers run as a separate process:

```bash
pnpm --dir apps/backend worker
```

## Caching (Redis)

### SKU cache (hot path)

- Key: `sku:{CODE}` (uppercase normalized)
- TTL: 3600 seconds
- Used by `GET /skus/code/:code`
- Invalidated on SKU update/delete

Integration proof:

- [`apps/backend/tests/sku-cache.integration.test.ts`](apps/backend/tests/sku-cache.integration.test.ts)

### Dashboard summary cache

Dashboard summary is cached with a short TTL and explicit invalidation after inventory mutations.

## Alerts and purchase orders

- Alerts are created when `available < reorderThreshold`
- Only one **OPEN** alert per (SKU, warehouse) is allowed (deduped)
- Alert transitions are audited (acknowledge/resolve)
- Purchase orders can be created from alerts and follow a server-validated state machine

## Forecasting

Forecast is a read-only analytics endpoint and UI:

- Outflow = **transfer-out** + **negative adjustments** (signed `quantityDelta`)
- 90-day outflow total, 30-day average daily outflow
- Projected days remaining = `available / avgDailyOutflow30d` (null when outflow is zero)

## Frontend architecture

- React Router for routes
- TanStack Query for server state + invalidation + optimistic updates
- Role-aware UI (backend still enforces permissions)

