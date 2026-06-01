# Manual QA checklist

Run after merging platform branches and `prisma migrate deploy`.  
Credentials: `manager@inventoryhub.test` / `Password123!` and `operator@inventoryhub.test`.

## Setup

- [ ] `docker compose up -d`
- [ ] `pnpm --dir apps/backend exec prisma migrate deploy`
- [ ] `pnpm --dir apps/backend db:seed`
- [ ] Backend `pnpm --dir apps/backend dev` (port 4000)
- [ ] Frontend `pnpm --dir apps/frontend dev` (port 5173)

## Auth & RBAC

- [ ] Manager can sign in and see all nav items
- [ ] Operator can sign in; cannot add SKU/warehouse/category
- [ ] Operator `POST /warehouses` → 403 (optional: curl or DevTools)
- [ ] Operator `POST /skus` → 403

## Search & autocomplete

- [ ] Movements: type SKU (2+ chars) → pick → submit receipt
- [ ] Fast SKU typing does not flash stale results
- [ ] Movements: warehouse search pick works on receipt/transfer
- [ ] Dashboard scope search + Clear → global summary

## Warehouse session

- [ ] Topbar “Working in” persists after refresh
- [ ] Movements defaults warehouse from session
- [ ] Logout clears session warehouse

## Taxonomy & browse

- [ ] Manager: create category + tag on `/skus`
- [ ] Assign category/tag on SKU detail strip
- [ ] Filter by category in sidebar; URL has `?category=`
- [ ] Filter by tag chip; URL has `&tag=`
- [ ] Category counts show in sidebar when SKUs assigned (if enabled)

## Cache (optional curl)

- [ ] `GET /skus/code/:code` twice → second response faster / `X-Cache: HIT` if header exposed
- [ ] Dashboard summary MISS → HIT after second load

## DataTable pages

- [ ] Warehouses: pagination Previous/Next
- [ ] Alerts: pagination + row actions (manager)
- [ ] SKUs: pagination + row select for detail strip

## Automated tests

```bash
pnpm test:unit
pnpm test:int
pnpm test:e2e   # requires dev servers running
```
