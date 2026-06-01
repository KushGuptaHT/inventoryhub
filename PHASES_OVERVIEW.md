# InventoryHub — Phases overview

Single map of **assignment phases** vs **platform scale-up** work.  
**Living checklist:** [`PROJECT_TRACKER.md`](PROJECT_TRACKER.md)  
**Scale-up execution plan:** [`SCALE_UP_ROADMAP.md`](SCALE_UP_ROADMAP.md)

---

## Assignment phases (original deliverable)

| Phase | Name | Status | Plan doc |
| --- | --- | --- | --- |
| 1 | Foundation (auth, CRUD, Docker, Prisma) | Done | `PHASE_1_API_PLAN.md` |
| 2 | Stock movements + concurrency | Done | `PHASE_2_API_PLAN.md` |
| 3 | Queues & alerts (BullMQ) | Done | `PHASE_3_API_PLAN.md` |
| 4 | Caching & performance | Done | `PHASE_4_API_PLAN.md` |
| 5 | Frontend integration | Done | `PHASE_5_FRONTEND_PLAN.md` |
| 6 | Testing & docs | In progress | — (see `SCALE_UP_ROADMAP.md`) |

**Assignment core is complete.** Phase 6 is submission hardening (tests, E2E, Loom), not new product features.

---

## Platform UX phases (scale the product)

Built after assignment to support large catalogs and operator workflows.

| Phase | Name | Status | Plan doc |
| --- | --- | --- | --- |
| 1 | Search autocomplete + `items` list contract | Done (PR #11) | `PHASE_1_SEARCH_AUTOCOMPLETE_PLAN.md` |
| 1 follow-ups | pg_trgm, warehouse session, category/tag APIs | Done | `PHASE_1_PLATFORM_FOLLOWUP_PLAN.md` |
| 2 | SKU browse (sidebar, tags, URL filters) | Done | `PHASE_2_BROWSE_UI_PLAN.md` |
| 2.5 | Manager taxonomy admin UI | Done | `PHASE_2_5_TAXONOMY_ADMIN_PLAN.md` |
| 3 | Warehouse autocomplete | Done | `PHASE_3_WAREHOUSE_AUTOCOMPLETE_PLAN.md` |
| 4 | Shared `DataTable` | In progress | `PHASE_4_DATA_TABLE_PLAN.md` |

---

## Architecture & setup

| Doc | Purpose |
| --- | --- |
| `ARCHITECTURE.md` | System design (ledger, RBAC, cache, queues, platform UX) |
| `README.md` | Local run, migrations, test users |

---

## Branch → feature map

| Branch | Contains |
| --- | --- |
| `feature/phase-1-search-autocomplete` | Merged to main |
| `feature/phase-1-platform-followups` | pg_trgm, categories/tags API, warehouse session |
| `feature/phase-2-sku-browse-filters` | Browse UI (needs follow-ups base) |
| `feature/phase-2-5-taxonomy-admin` | Taxonomy create/assign UI |
| `feature/phase-3-warehouse-autocomplete` | Warehouse search pickers (stacked on 2.5) |
| `feature/platform-scale-up` | DataTable + consolidation docs |

**Tip:** `feature/phase-3-warehouse-autocomplete` already stacks most platform UX; merge it (or `platform-scale-up`) to `main` for one integration PR.
