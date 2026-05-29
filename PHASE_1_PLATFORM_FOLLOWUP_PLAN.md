# PHASE 1 Platform Follow-ups: Search performance, warehouse session, taxonomy

**Status:** Complete on branch `feature/phase-1-platform-followups`  
**Depends on:** `PHASE_1_SEARCH_AUTOCOMPLETE_PLAN.md` (merged PR #11)  
**Focus:** Finish remaining Phase 1 platform items before Phase 2 browse UI

---

## Goals

| # | Item | Outcome |
| --- | --- | --- |
| 1 | `pg_trgm` GIN indexes | Fast `ILIKE` search for SKU/warehouse autocomplete at scale |
| 2 | Warehouse session context | Header shows “working in” warehouse; forms default to it |
| 3 | Category + tags foundation | DB + APIs for future Amazon-style browse/filter (no heavy UI yet) |

---

## 1 — pg_trgm search indexes

**Why:** Autocomplete uses `GET /skus?search=` which becomes `ILIKE '%term%'`. B-tree indexes do not help; GIN trigram indexes do.

**Migration:** `20260529120000_add_pg_trgm_search_indexes`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- GIN on SKU.name, SKU.code, Warehouse.name, Warehouse.code
```

**App changes:**

- Comment in `schema.prisma` pointing to migration
- `GET /warehouses?search=` — same pattern as SKU list (`warehouse.schemas.ts`, `warehouse.service.ts`)

**No change required** in `sku.service.ts` for basic speedup — Postgres planner uses GIN automatically.

---

## 2 — Warehouse session context

**Why:** Operators work in one warehouse per shift; re-selecting on every movement is wasted friction.

**Files:**

| File | Role |
| --- | --- |
| `apps/frontend/src/lib/warehouse-context.tsx` | Provider, localStorage, validation |
| `apps/frontend/src/App.tsx` | Wrap app with `WarehouseProvider` |
| `apps/frontend/src/layouts/AppLayout.tsx` | Topbar “Working in” selector |
| `apps/frontend/src/pages/MovementsPage.tsx` | Default `warehouseId` / `fromWarehouseId` |
| `apps/frontend/src/pages/DashboardPage.tsx` | Initial dashboard scope from session |
| `apps/frontend/src/pages/ForecastPage.tsx` | Initial forecast filter from session |

**Storage key:** `inventoryhub.activeWarehouse`  
**Cleared on:** logout (`clearStoredActiveWarehouse`)

**Design note:** Dashboard/forecast scope remains **independently changeable** after init — session warehouse is a default, not a lock.

---

## 3 — Category + tags foundation

**Why:** SKUs need taxonomy before Phase 2 sidebar navigation and tag chips.

### Schema (adjacency list + M2M)

- `Category` — `parentId` self-reference, `slug` unique
- `SKUCategory` — many-to-many; `isPrimary` (partial unique: one primary per SKU)
- `Tag` — flat labels
- `SKUTag` — many-to-many

**Migration:** `20260529130000_add_category_tags`

### Caching

| Key | Purpose | Invalidate on |
| --- | --- | --- |
| `categories:tree` | Flat list for descendant filter resolution | Category CRUD |

Do **not** store SKU counts in tree cache (future: `categories:counts`).

### APIs

| Method | Path | Role |
| --- | --- | --- |
| GET | `/categories?format=flat\|tree` | Any |
| POST/PATCH/DELETE | `/categories` | Manager |
| GET/POST/PATCH/DELETE | `/tags` | Manager (delete returns `affectedSkus`) |
| POST | `/skus/:id/categories` | Manager |
| DELETE | `/skus/:id/categories/:categoryId` | Manager |
| POST | `/skus/:id/tags` | Manager |
| DELETE | `/skus/:id/tags/:tagId` | Manager |

### SKU list filters

```
GET /skus?categoryIds[]=...&includeDescendants=true&tagIds[]=...
```

- `categoryIds` — OR across categories (each id expands to subtree when `includeDescendants=true`)
- `tagIds` — AND (SKU must have all tags)

`GET /skus/:id` returns `categories` and `tags` arrays on detail view.

---

## Suggested commits (feature-wise)

1. `feat(db): add pg_trgm search indexes and warehouse search param`
2. `feat(frontend): add warehouse session context for operators`
3. `feat(backend): add category and tag taxonomy with SKU filters`

---

## Verification

```bash
pnpm --dir apps/backend exec prisma migrate deploy   # when DB available
pnpm --dir apps/backend exec tsc --noEmit
pnpm test:unit
pnpm test:int
pnpm --dir apps/frontend build
```

**Manual**

- [ ] Movements: header warehouse pre-fills receipt/adjustment/transfer from
- [ ] SKU autocomplete still returns results after migration
- [ ] `POST /categories` + assign to SKU + `GET /skus?categoryIds[]=`

---

## Phase 2 (next)

- Category sidebar on SKU list
- Tag filter chips + URL state
- `WarehouseAutocomplete` (reuse `Combobox` + `useDebouncedSearch`)
- `DataTable` shared component
