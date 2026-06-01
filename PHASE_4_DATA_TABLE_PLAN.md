# PHASE 4 (Platform): Shared DataTable

**Status:** Complete on `feature/platform-scale-up`  
**Depends on:** Paginated `{ items, page, perPage, total, totalPages }` contract  
**Focus:** DRY list UI — not replacing TanStack Table on Movements history

---

## Goals

| # | Item |
| --- | --- |
| 1 | `DataTable<T>` — columns, rows, optional row class |
| 2 | Built-in pagination footer (Previous / Next + totals) |
| 3 | Migrate Warehouses, Alerts, SKUs list tables |

---

## API sketch

```tsx
<DataTable
  columns={[{ id: 'code', header: 'Code', cell: (row) => row.code }]}
  data={items}
  getRowKey={(row) => row.id}
  pagination={{ page, perPage, total, totalPages, onPageChange, itemLabel: 'warehouses' }}
/>
```

Pages keep `Status` for loading/error/empty wrapping.

---

## Verification

```bash
pnpm --dir apps/frontend build
```

Manual: pagination and row actions unchanged on migrated pages.
