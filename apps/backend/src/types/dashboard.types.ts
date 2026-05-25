// ============================================================================
// DASHBOARD TYPES
// ============================================================================
// WHAT:  Response shape for dashboard summary cards.
// WHY:   Dashboard, cache, and route should agree on metric names/types.
// SKIP:  Ad hoc objects make cache payloads drift from API responses.
// HOW:   One shared type for DB result serialization and Redis JSON storage.
// ============================================================================

export type DashboardSummaryScope = "global" | "warehouse";

export type DashboardSummary = {
  scope: DashboardSummaryScope;
  warehouseId: string | null;
  activeSkuCount: number;
  activeWarehouseCount: number;
  totalStockUnits: number;
  totalReservedUnits: number;
  totalAvailableUnits: number;
  inventoryValue: string;
  lowStockCount: number;
  openAlertsCount: number;
  activePurchaseOrdersCount: number;
  recentMovementCount: number;
  generatedAt: string;
};

export type DashboardSummaryResult = {
  summary: DashboardSummary;
  cacheStatus: "HIT" | "MISS";
};
