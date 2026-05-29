# PHASE 2.5: Taxonomy admin UI (manager)

**Status:** In progress on `feature/phase-2-5-taxonomy-admin`  
**Depends on:** Phase 2 browse UI + category/tag APIs  
**Focus:** Managers create categories/tags and assign them to SKUs from `/skus` — no new backend tables

---

## Goals

| # | Item | API |
| --- | --- | --- |
| 1 | Create category (optional parent) | `POST /categories` |
| 2 | Create tag (optional color) | `POST /tags` |
| 3 | Assign / remove category on SKU | `POST/DELETE /skus/:id/categories` |
| 4 | Assign / remove tag on SKU | `POST/DELETE /skus/:id/tags` |

**Role:** MANAGER only for mutations; operators keep read-only browse.

---

## UI placement

| Surface | Change |
| --- | --- |
| `CategorySidebar` | “Add category” form when `canManage` |
| `TagFilterChips` | “Add tag” form when `canManage` |
| `SkuDetailStrip` | Assign/remove categories and tags on selected SKU |

---

## Verification

```bash
pnpm --dir apps/frontend build
```

**Manual:** Log in as manager → add category → add tag → select SKU → assign both → filter list by category/tag.
