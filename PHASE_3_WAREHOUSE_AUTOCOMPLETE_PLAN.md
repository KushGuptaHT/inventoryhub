# PHASE 3: Warehouse search autocomplete

**Status:** Complete on `feature/phase-3-warehouse-autocomplete`  
**Depends on:** `GET /warehouses?search=` (Phase 1 platform follow-ups)  
**Focus:** Reuse SKU search stack for warehouse pickers — no new backend work

---

## Goals

| # | Item | Outcome |
| --- | --- | --- |
| 1 | `warehouse-search.service` | `GET /warehouses?search=&perPage=10` |
| 2 | `useWarehouseSearch` | Debounced search + cancel stale requests |
| 3 | `WarehouseAutocomplete` | Thin wrapper on `Combobox` |
| 4 | Movements page | Replace `<select>` warehouse dropdowns |
| 5 | Forecast page | Search picker with optional clear (all warehouses) |

**Out of scope:** Topbar session selector stays a compact `<select>` (always-visible context).

---

## Layered architecture (same as SKU)

```
warehouse-search.service → useWarehouseSearch → WarehouseAutocomplete → Combobox
```

---

## Verification

```bash
pnpm --dir apps/frontend build
```

**Manual:** Movements → type warehouse code → pick → submit receipt; Forecast → clear for all warehouses.
