# PHASE 1: Backend Foundation APILayer
**Status**: Starting  
**Duration**: 8-10 hours  
**Branch**: `phase-1-backend-foundation`  
**Focus**: Data Integrity + Architecture + Clean Code  

---

## ✅ VERIFICATION AGAINST REQUIREMENTS

### Requirements PDF Section 7: Suggested Phasing
> Phase 1 (Foundations): Repo setup, Docker, schema, auth, **basic CRUD for SKUs and warehouses** (10 hours)

**What we've done**:
- ✅ Repo setup
- ✅ Docker (postgres + redis)
- ✅ Schema with 12 tables
- ✅ Migration executed
- ✅ Prisma client generated

**What we're doing NOW** (remaining Phase 1):
- 🔲 Auth middleware + JWT
- 🔲 Warehouse CRUD
- 🔲 SKU CRUD

### Architecture PDF Section 17: API Design Direction
> REST API for: `/auth /skus /warehouses /movements /alerts /purchase-orders /dashboard /imports`

**Phase 1 scope**: `/auth`, `/skus`, `/warehouses`

### Requirements PDF Section 3.1: Users & Auth
> Email + password login. Two roles: **Manager** (full) and **Operator** (limited)  
> Role enforcement happens **server-side on EVERY route**

**Phase 1**: Implement role-based middleware

### Requirements PDF Section 3.2: SKUs and Warehouses
> CRUD for SKUs: code, name, unit cost, reorder threshold, preferred supplier  
> CRUD for warehouses: name, code, address

**Phase 1**: Full CRUD implementation

---

## 🎯 EXECUTION STEPS (Clean Commits)

### STEP 1: Prisma & Redis Singletons
**Files to create**:
- `apps/backend/src/lib/prisma.ts` (singleton Prisma client)
- `apps/backend/src/lib/redis.ts` (singleton Redis client)

**Why**:
- Architecture Doc Section 2: "One PrismaClient instance shared by all modules"
- Avoids connection pool leaks
- Required for scalability

**Commit message**:
```
feat: setup prisma and redis singleton clients

- Add shared Prisma client for DI across all backend modules (Architecture Doc Section 2)
- Add shared Redis client for cache + BullMQ
- Both follow singleton pattern to avoid connection pool issues
```

---

### STEP 2: Upgrade /health Endpoint
**Update**: `apps/backend/src/app.ts`

**Before**:
```json
{ "status": "ok" }
```

**After** (Requirements 4.7):
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

**Why**:
- Requirements 4.7: "/health endpoint that checks DB + Redis"
- Used by container orchestration (k8s liveness/readiness probes)
- Production readiness requirement

**Commit message**:
```
feat: upgrade /health endpoint with infrastructure checks

- Check PostgreSQL connection via Prisma (Requirements 4.7)
- Check Redis connection status (Requirements 4.7)
- Return typed response with database and redis status
- Implements production-readiness requirement for health checks
```

---

### STEP 3: Backend Folder Structure & Validation
**Create folders**:
```
src/
 ├── routes/      # All API endpoints
 ├── services/    # Business logic
 ├── schemas/     # Zod validation
 ├── middleware/  # Auth, error handling
 ├── lib/         # Prisma, Redis, utils
 └── types/       # Shared TypeScript types
```

**Create validation schemas** (`src/schemas/`):
- `warehouse.schemas.ts` (Zod schemas for warehouse CRUD)
- `sku.schemas.ts` (Zod schemas for SKU CRUD)
- `auth.schemas.ts` (Zod schemas for login/register)

**Why**:
- Requirements 4.5: "Forms use React Hook Form + Zod. Server validates again"
- Requirements 3.1: "Role enforcement server-side"
- Separation of concerns

**Commit message**:
```
feat: establish backend folder structure and validation layer

- Create modular structure: routes, services, schemas, middleware, lib (Architecture best practice)
- Add Zod validation schemas for warehouse, SKU, and auth (Requirements 3.1, 4.5)
- Supports clean server-side validation and role enforcement
- Enables scalable organization for future phases
```

---

### STEP 4: JWT Auth Middleware
**Create**: `src/middleware/auth.ts`

**What it does**:
- Extract JWT from `Authorization: Bearer <token>` header
- Verify JWT signature
- Attach user (id, email, role) to request context
- Enforce roles: MANAGER vs OPERATOR (Requirements 3.1)

**Why**:
- Requirements 3.1: "Role enforcement happens server-side on every route — not just UI hidden"
- Must happen in middleware, not in individual routes
- Reusable across all endpoints

**Commit message**:
```
feat: implement jwt auth middleware with role enforcement

- Add JWT verification middleware (Requirements 3.1)
- Attach authenticated user to request context
- Support two roles: MANAGER and OPERATOR (Requirements 3.1)
- Prepare foundation for role-based access control on all routes
- Adheres to server-side validation principle (Requirements 4.5)
```

---

### STEP 5: Warehouse CRUD API
**Routes**:
```
POST   /warehouses       (Manager only)
GET    /warehouses       (All authenticated)
GET    /warehouses/:id   (All authenticated)
PATCH  /warehouses/:id   (Manager only)
DELETE /warehouses/:id   (Manager only)
```

**Why**:
- Requirements 3.2: "CRUD for warehouses: name, code, address"
- Foundational entity (all inventory tied to warehouses)
- Tests role enforcement (MANAGER-only operations)

**Commit message**:
```
feat: implement warehouse crud api with role enforcement

- POST /warehouses: Create warehouse (Manager role, Requirement 3.2)
- GET /warehouses: List all warehouses with pagination
- GET /warehouses/:id: Fetch single warehouse
- PATCH /warehouses/:id: Update warehouse (Manager only, Requirement 3.2)
- DELETE /warehouses/:id: Soft delete warehouse (Manager only)
- Add Zod validation for inputs (Requirements 4.5)
- Enforce role checks server-side (Requirements 3.1)
- Trace: Requirements 3.2, Architecture Section 17
```

---

### STEP 6: SKU CRUD API (with Redis Caching)
**Routes**:
```
POST   /skus            (Manager only)
GET    /skus            (All, with caching)
GET    /skus/:id        (All, with caching)
PATCH  /skus/:id        (Manager only, invalidate cache)
DELETE /skus/:id        (Manager only, invalidate cache)
```

**Why**:
- Requirements 3.2: "CRUD for SKUs: code, name, unit cost, reorder threshold, preferred supplier"
- Requirements 4.3: "Hot SKU lookups cached in Redis"
- Architecture Doc Section 14: Cache key example: `sku:CODE`

**Caching Strategy**:
- Cache key: `sku:${skuCode}` (hot lookup by code)
- TTL: 3600 seconds (1 hour)
- Invalidate: On every update/delete

**Commit message**:
```
feat: implement sku crud api with redis caching

- POST /skus: Create SKU (Manager role, Requirement 3.2)
- GET /skus: List SKUs with pagination (cached)
- GET /skus/:id and /skus?code=CODE: Fetch with cache (Requirement 4.3)
- PATCH /skus/:id: Update and invalidate cache (Requirements 3.2, 4.3)
- DELETE /skus/:id: Delete and invalidate cache (Requirements 3.2, 4.3)
- Redis cache key: sku:{code} (Architecture Section 14)
- TTL: 3600 seconds with explicit invalidation (Requirement 4.3)
- Enforce role checks server-side (Requirements 3.1)
- Trace: Requirements 3.2, 4.3, Architecture Sections 14, 17
```

---

## 📋 COMMIT SEQUENCE (Clean History)

```bash
# Commit 1
feat: setup prisma and redis singleton clients

# Commit 2
feat: upgrade /health endpoint with infrastructure checks

# Commit 3
feat: establish backend folder structure and validation layer

# Commit 4
feat: implement jwt auth middleware with role enforcement

# Commit 5
feat: implement warehouse crud api with role enforcement

# Commit 6
feat: implement sku crud api with redis caching
```

**Result**: Clean commit history showing progression from infra → validation → auth → CRUD

---

## 📊 PROJECT_TRACKER.md UPDATES

After each commit, update `PROJECT_TRACKER.md`:

```markdown
### Phase 1: Foundation (12 hours total)
- [x] Infrastructure setup
- [x] Prisma schema + migration
- [x] Prisma client generation
- [ ] **NOW** → Prisma singleton + Redis singleton
- [ ] JWT auth middleware + role enforcement
- [ ] Warehouse CRUD API
- [ ] SKU CRUD API (with Redis caching)

### Next Phase
- Phase 2: Stock movements + transactions (12 hours)
```

---

## 🧠 WHY THIS ORDER?

1. **Singletons first** → Everything depends on clients
2. **Health endpoint** → Immediate feedback on infrastructure
3. **Validation + Auth** → Prevents bad requests before business logic
4. **Warehouse CRUD** → Foundational entity
5. **SKU CRUD** → Product data (with caching to show Redis integration)

---

## ✅ VERIFICATION CHECKLIST

Before moving to Phase 2:

- [ ] All 6 commits clean and focused
- [ ] PROJECT_TRACKER.md updated
- [ ] All endpoints tested (even manually)
- [ ] Role enforcement working (try Operator on Manager routes)
- [ ] Cache working (get SKU by code twice, check response time)
- [ ] No `any` types in TypeScript
- [ ] All Zod schemas validated
- [ ] /health returns all three fields

---

## 🚀 AFTER PHASE 1 COMPLETES

- Push to `phase-1-backend-foundation` branch
- Create PR with clean commit history
- Ready for Phase 2: Stock movements with concurrency + row locking

