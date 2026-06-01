# Scale-up roadmap (post-assignment)

**Goal:** Production-grade operator UX on top of the completed assignment.  
**Tracker:** [`PROJECT_TRACKER.md`](PROJECT_TRACKER.md)

---

## Priority order

| # | Workstream | Status | Notes |
| --- | --- | --- | --- |
| 1 | **DataTable** | In progress | Shared list + pagination for SKUs, warehouses, alerts |
| 2 | **Merge platform branches** | Planned | See merge order below |
| 3 | **Phase 6 (parallel)** | Ongoing | E2E, ARCHITECTURE updates, manual QA checklist |
| 4 | **Polish (optional)** | Backlog | Counts, barcode, taxonomy edit/delete UI |

---

## 1 — DataTable

**Why:** Six pages duplicate `<table>` + pagination; one component keeps list UX consistent.

**Scope (MVP):**
- `DataTable` + column defs
- `ListPagination` (or built-in footer)
- Migrate: Warehouses, Alerts, SKUs (table block)

**Later:** Purchase orders, Forecast, Movements history (TanStack Table stays for movements).

**Plan:** `PHASE_4_DATA_TABLE_PLAN.md`

---

## 2 — Merge platform branches

Recommended order into `main`:

```
main
  ← feature/phase-1-platform-followups   (APIs + session + pg_trgm)
  ← feature/phase-2-sku-browse-filters   (if not already in follow-ups branch)
  ← feature/phase-2-5-taxonomy-admin
  ← feature/phase-3-warehouse-autocomplete  (often includes 2.5 via fast-forward)
  ← feature/platform-scale-up             (DataTable + docs)
```

**Or one PR:** merge `feature/platform-scale-up` after rebasing onto latest platform work.

**After merge:**
```bash
pnpm --dir apps/backend exec prisma migrate deploy
pnpm test:unit && pnpm test:int
pnpm --dir apps/frontend build
```

---

## 3 — Phase 6 (production readiness, parallel)

| Task | Action |
| --- | --- |
| Unit tests | Expand Vitest coverage for category/tag services |
| Integration | Keep 50-transfer + RBAC; add taxonomy smoke tests |
| E2E | Playwright: login → SKU browse → movement receipt |
| `ARCHITECTURE.md` | Platform UX + search layers (updated in scale-up) |
| Manual QA | Close items in PROJECT_TRACKER Verification Log |
| Loom | 5–7 min walkthrough: search, browse, movements, cache |

---

## 4 — Polish backlog (optional)

| Item | Effort | Value |
| --- | --- | --- |
| Category counts in sidebar | Medium | Amazon-style `(n)` next to nodes |
| Barcode quick-entry on Movements | Medium | Scanner-friendly ops |
| Edit/delete category & tag in UI | Small | Today: create + assign only |
| `WarehouseAutocomplete` on Warehouses CRUD page | Low | Only if list grows |
| Typesense | Large | Only if Postgres search insufficient |

---

## Verification (scale-up exit)

- [ ] All platform branches merged to `main`
- [ ] Migrations applied on clean DB
- [ ] DataTable on ≥3 list pages
- [ ] Manual QA checklist complete
- [ ] `pnpm test` + `pnpm test:e2e` green (Phase 6 target)
