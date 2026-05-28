// ============================================================================
// PURCHASE ORDER TYPES
// ============================================================================
// WHAT:  Purchase-order status constants and API response shapes.
// WHY:   Phase 3 state machine must reject invalid transitions consistently.
// SKIP:  Repeated strings make DRAFT/SENT/RECEIVED/CANCELLED easy to mistype.
// HOW:   Central constants mirror the DB values stored in PurchaseOrder.status.
// ============================================================================

export const PurchaseOrderStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;

export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export type PurchaseOrderLineResponse = {
  id: string;
  poId: string;
  skuId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: string;
  receivedAt: Date | null;
  createdAt: Date;
};

export type PurchaseOrderWarehouseResponse = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseOrderResponse = {
  id: string;
  alertId: string;
  status: PurchaseOrderStatus;
  poNumber: string;
  warehouseId: string;
  warehouse?: PurchaseOrderWarehouseResponse;
  sentAt: Date | null;
  sentBy: string | null;
  receivedAt: Date | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: PurchaseOrderLineResponse[];
};
