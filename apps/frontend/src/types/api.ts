export const UserRole = {
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export type PublicUser = {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export type AuthResponse = {
  accessToken: string
  user: PublicUser
}

export type DashboardSummary = {
  scope: 'global' | 'warehouse'
  warehouseId: string | null
  activeSkuCount: number
  activeWarehouseCount: number
  totalStockUnits: number
  totalReservedUnits: number
  totalAvailableUnits: number
  inventoryValue: string
  lowStockCount: number
  openAlertsCount: number
  activePurchaseOrdersCount: number
  recentMovementCount: number
  generatedAt: string
}

export type Warehouse = {
  id: string
  code: string
  name: string
  address: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Sku = {
  id: string
  code: string
  name: string
  description: string | null
  unitCost: string
  reorderThreshold: number
  preferredSupplier: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Standard paginated list response used across the entire platform.
 *
 * Why this exists:
 * - We intentionally standardize list response shape across entities to keep
 *   table + search UI reusable (no per-endpoint branching like `data` vs `items`).
 * - `total` and `totalPages` are always present so pagination is deterministic.
 */
export type PaginatedResponse<T> = {
  items: T[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

export type MovementType = 'RECEIPT' | 'ADJUSTMENT' | 'TRANSFER'

export type MovementHistoryItem = {
  id: string
  type: MovementType
  skuId: string
  quantity: number
  quantityDelta: number | null
  fromWarehouse: string | null
  toWarehouse: string
  notes: string | null
  createdByUserId: string
  createdAt: string
  sku: Pick<Sku, 'id' | 'code' | 'name'>
  sourceWarehouse: Pick<Warehouse, 'id' | 'code' | 'name'> | null
  destinationWarehouse: Pick<Warehouse, 'id' | 'code' | 'name'>
}

export type MovementHistoryResponse = {
  items: MovementHistoryItem[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

export type Alert = {
  id: string
  skuId: string
  warehouseId: string
  sku?: { id: string; code: string; name: string }
  warehouse?: { id: string; code: string; name: string }
  status: AlertStatus
  availableStock: number
  reorderThreshold: number
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
  updatedAt: string
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'

export type PurchaseOrderLine = {
  id: string
  poId: string
  skuId: string
  quantityOrdered: number
  quantityReceived: number
  unitPrice: string
  receivedAt: string | null
  createdAt: string
}

export type PurchaseOrder = {
  id: string
  alertId: string
  status: PurchaseOrderStatus
  poNumber: string
  warehouseId: string
  warehouse?: { id: string; code: string; name: string }
  sentAt: string | null
  sentBy: string | null
  receivedAt: string | null
  receivedBy: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  lineItems: PurchaseOrderLine[]
}

export type ImportJob = {
  id: string
  type: 'SKU_IMPORT' | 'RECEIPT_IMPORT'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  fileName: string
  totalRows: number
  processedRows: number
  succeededRows: number
  failedRows: number
  errorMessage: string | null
  uploadedBy: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export type ForecastRow = {
  skuId: string
  skuCode: string
  skuName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  available: number
  reorderThreshold: number
  isLowStock: boolean
  outflow90d: number
  avgDailyOutflow30d: number
  projectedDaysRemaining: number | null
}

export type ForecastResponse = {
  items: ForecastRow[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

export type ImportRow = {
  id: string
  importId: string
  rowNumber: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  data: string
  errorMessage: string | null
  skuId: string | null
  createdAt: string
}
