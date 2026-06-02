-- ============================================================================
-- Restore pg_trgm GIN indexes (safety net)
-- ============================================================================
-- WHY: A previous migration generation accidentally attempted to drop these.
--      They are required for fast SKU/warehouse search at scale.
-- HOW: IF NOT EXISTS keeps this idempotent across environments.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS skus_name_trgm_idx
  ON "SKU" USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS skus_code_trgm_idx
  ON "SKU" USING GIN (code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS warehouses_name_trgm_idx
  ON "Warehouse" USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS warehouses_code_trgm_idx
  ON "Warehouse" USING GIN (code gin_trgm_ops);

