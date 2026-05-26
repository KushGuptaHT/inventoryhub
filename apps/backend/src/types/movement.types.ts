// ============================================================================
// MOVEMENT TYPES
// ============================================================================
// WHAT:  Constants for stock_movements.type column.
// WHY:   Same strings in service, DB, and tests — no typos.
// SKIP:  Magic strings scattered → wrong type in ledger, hard to grep.
// HOW:   const object + TypeScript union type.
// ============================================================================

export const MovementType = {
  RECEIPT: "RECEIPT",
  ADJUSTMENT: "ADJUSTMENT",
  TRANSFER: "TRANSFER",
} as const;

export type MovementType =
  (typeof MovementType)[keyof typeof MovementType];

export type MovementResult = {
  movement: {
    id: string;
    type: MovementType;
    skuId: string;
    quantity: number;
    fromWarehouse: string | null;
    toWarehouse: string;
    notes: string | null;
    createdByUserId: string;
    createdAt: Date;
  };
  inventory: {
    skuId: string;
    warehouseId: string;
    stockLevel: number;
    reserved: number;
    available: number;
  };
};

export type TransferResult = {
  movement: MovementResult["movement"];
  sourceInventory: MovementResult["inventory"];
  destinationInventory: MovementResult["inventory"];
};

export type MovementHistoryItem = MovementResult["movement"] & {
  sku: {
    id: string;
    code: string;
    name: string;
  };
  sourceWarehouse: {
    id: string;
    code: string;
    name: string;
  } | null;
  destinationWarehouse: {
    id: string;
    code: string;
    name: string;
  };
};

export type MovementHistoryResponse = {
  items: MovementHistoryItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type StockMovementRow = {
  id: string;
  type: string;
  skuId: string;
  quantity: number;
  fromWarehouse: string | null;
  toWarehouse: string;
  notes: string | null;
  createdByUserId: string;
  createdAt: Date;
};

export const toMovementView = (
  movement: StockMovementRow,
): MovementResult["movement"] => ({
  id: movement.id,
  type: movement.type as MovementType,
  skuId: movement.skuId,
  quantity: movement.quantity,
  fromWarehouse: movement.fromWarehouse,
  toWarehouse: movement.toWarehouse,
  notes: movement.notes,
  createdByUserId: movement.createdByUserId,
  createdAt: movement.createdAt,
});
