-- ============================================================================
-- PHASE 3 CONSTRAINT FIXES
-- ============================================================================
-- WHAT:  Align alert + purchase-order constraints with Phase 3 lifecycle rules.
-- WHY:   Alerts repeat over time; PO audit needs one row per state transition.
-- SKIP:  Full uniqueness blocks future resolved alerts and second PO audit rows.
-- HOW:   Partial unique index for OPEN alerts; one-to-many PO audit logs.
-- ============================================================================

-- Alert dedupe: only one OPEN alert per (SKU, warehouse).
-- Resolved/acknowledged historical alerts must not block future low-stock events.
DROP INDEX IF EXISTS "Alert_skuId_warehouseId_key";
CREATE UNIQUE INDEX "Alert_open_sku_warehouse_unique"
ON "Alert"("skuId", "warehouseId")
WHERE "status" = 'OPEN';

-- PO audit trail: allow one audit row per state transition.
DROP INDEX IF EXISTS "PurchaseOrderAuditLog_poId_key";
CREATE INDEX "PurchaseOrderAuditLog_poId_createdAt_idx"
ON "PurchaseOrderAuditLog"("poId", "createdAt");
