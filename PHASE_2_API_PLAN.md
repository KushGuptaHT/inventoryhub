# PHASE 2: Stock Movements & Transactions

**Status:** Complete (pending commit)  
**Branch:** `feature/stock-movements` (from `main`)  
**Duration:** ~12 hours  
**Focus:** Data integrity under concurrency — the heart of the assignment

---

## Goal

Implement safe stock movements that:

1. Never allow negative `stockLevel`
2. Respect `reserved` quantity (`available = stockLevel - reserved`)
3. Update **both** `inventory_stock` (snapshot) and `stock_movements` (immutable ledger)
4. Use `SELECT … FOR UPDATE` on transfers
5. Pass a **50 concurrent transfer** integration test (Phase 2 exit gate)

---

## Assignment mapping

| Requirement | Implementation |
|-------------|----------------|
| Receipt | `POST /movements/receipt` |
| Adjustment | `POST /movements/adjustment` |
| Transfer (atomic) | `POST /movements/transfer` in one DB transaction |
| Reserved stock | Reject if `quantity > available` on source |
| Concurrency | Row lock on `InventoryStock` before read/update |
| Audit trail | Append-only `StockMovement` row every time |

**Out of scope for Phase 2:** BullMQ alerts (Phase 3), movement history list API (Phase 5), Vitest CI wiring (can land in same phase, separate commit).

---

## Architecture

```
POST /movements/*
       │
       ▼
  authenticate (JWT)
       │
       ▼
  movement.routes.ts  →  Zod validate body
       │
       ▼
  movement.service.ts →  prisma.$transaction
       │                    ├── lock row(s) FOR UPDATE
       │                    ├── validate available stock
       │                    ├── update inventory_stock
       │                    └── insert stock_movements
       ▼
  PostgreSQL
```

### Transfer transaction (critical path)

1. `BEGIN`
2. Upsert destination `inventory_stock` row if missing (0 stock)
3. `SELECT … FOR UPDATE` on **source** row
4. `SELECT … FOR UPDATE` on **destination** row
5. Assert `(stockLevel - reserved) >= quantity`
6. Decrement source `stockLevel`
7. Increment destination `stockLevel`
8. Insert one `StockMovement` (`type: TRANSFER`, `fromWarehouse`, `toWarehouse`)
9. `COMMIT`

Alerts enqueue **after** commit in Phase 3 — not inside this transaction.

---

## File plan

| File | Purpose |
|------|---------|
| `src/types/movement.types.ts` | `MovementType` constants |
| `src/schemas/movement.schemas.ts` | Zod for receipt / adjustment / transfer |
| `src/lib/inventory-stock.ts` | Lock rows, compute available, upsert empty row |
| `src/services/movement.service.ts` | Business logic + transactions |
| `src/routes/movements.ts` | HTTP layer |
| `src/app.ts` | Register `/movements` prefix |

---

## API endpoints

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/movements/receipt` | Yes | Manager, Operator |
| POST | `/movements/adjustment` | Yes | Manager, Operator |
| POST | `/movements/transfer` | Yes | Manager, Operator |

### Request bodies

**Receipt**
```json
{ "skuId": "...", "warehouseId": "...", "quantity": 10, "notes": "optional" }
```

**Adjustment** (signed delta — negative removes stock)
```json
{ "skuId": "...", "warehouseId": "...", "quantityDelta": -3, "notes": "cycle count" }
```

**Transfer**
```json
{
  "skuId": "...",
  "fromWarehouseId": "...",
  "toWarehouseId": "...",
  "quantity": 5,
  "notes": "optional"
}
```

---

## Suggested commits (ask before each)

1. `docs: add phase 2 api plan for stock movements`
2. `feat: add movement schemas and inventory lock helpers`
3. `feat: implement receipt and adjustment movement apis`
4. `feat: implement atomic transfer with row-level locking`
5. `test: add concurrent transfer integration test` *(next session)*
6. `docs: update project tracker for phase 2 progress`

---

## Manual verification

```bash
# Login → TOKEN
pnpm --dir apps/backend db:seed
pnpm --dir apps/backend dev

# Receipt 10 units
curl -X POST http://localhost:4000/movements/receipt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skuId":"...","warehouseId":"...","quantity":10}'

# Transfer 3 (should fail if insufficient)
curl -X POST http://localhost:4000/movements/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skuId":"...","fromWarehouseId":"...","toWarehouseId":"...","quantity":3}'
```

---

## Phase 2 exit checklist

- [x] Receipt increases `stockLevel` + creates movement row
- [x] Adjustment respects reserved / no negative stock
- [x] Transfer atomic (both sides or neither)
- [x] `FOR UPDATE` on transfer source (and destination)
- [x] 50 concurrent transfers — no negative stock (`pnpm --dir apps/backend test:int`)
- [x] TypeScript clean (`pnpm exec tsc --noEmit`)
