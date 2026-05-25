-- Phase 4 performance: recent dashboard movement counts/order-by-date.
-- PostgreSQL can scan this btree index backward for ORDER BY createdAt DESC.
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx"
ON "StockMovement"("createdAt");
