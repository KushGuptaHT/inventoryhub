# InventoryHub

Multi-warehouse inventory operations app built for the InventoryHub assignment.

## Stack

- **Backend**: Fastify + TypeScript + Prisma (Postgres)
- **Cache/Queue**: Redis + BullMQ (alerts, imports, PO fulfillment)
- **Frontend**: React + Vite + TypeScript + TanStack Query/Table

## Prerequisites

- Node.js (>= 20)
- pnpm
- Docker + Docker Compose

## Local setup

### 1) Start dependencies

```bash
docker compose up -d
```

### 2) Configure backend env

```bash
cp apps/backend/.env.example apps/backend/.env
```

### 3) Run DB migrations + seed users

```bash
pnpm --dir apps/backend exec prisma migrate deploy
pnpm --dir apps/backend db:seed
```

Seeded demo users:

| Email | Password | Role |
| --- | --- | --- |
| `manager@inventoryhub.test` | `Password123!` | MANAGER |
| `operator@inventoryhub.test` | `Password123!` | OPERATOR |

### 4) Start backend, worker, and frontend

In separate terminals:

```bash
pnpm --dir apps/backend dev        # API at http://localhost:4000
pnpm --dir apps/backend worker     # BullMQ workers (alerts/imports/PO)
pnpm --dir apps/frontend dev       # UI at http://localhost:5173
```

## Tests

### Backend unit tests (Vitest)

```bash
pnpm test:unit
```

### Backend integration tests (real Postgres)

```bash
pnpm test:int
```

This includes the **50-concurrent-transfer** gate proving row-locking prevents negative stock.

### E2E (Playwright)

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Performance seed (optional)

Creates a large deterministic dataset for cache/performance checks:

```bash
pnpm --dir apps/backend db:seed:perf
```

## Demo flow (no perf seed required)

1. Login as manager
2. Create 2 warehouses + 1 SKU
3. Receipt → Transfer → Negative adjustment
4. Trigger low-stock → Alert → Create PO → Send → Receive
5. Check Forecast page (outflow from transfers + negative adjustments)

## Docs

- See [`ARCHITECTURE.md`](ARCHITECTURE.md) for design decisions and core data flows.

