-- ============================================================================
-- pg_trgm search indexes (SKU + Warehouse)
-- ============================================================================
-- WHY: Prisma `contains` + insensitive mode becomes ILIKE '%term%' which cannot
--      use B-tree indexes. GIN trigram indexes keep autocomplete fast at scale.
-- HOW: Extension + indexes only; no application code change required for ILIKE.
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
