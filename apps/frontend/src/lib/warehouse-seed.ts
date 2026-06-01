// ============================================================================
// WAREHOUSE SEED HELPER
// ============================================================================
// WHAT:  Resolves id → { id, code, name } for autocomplete display labels.
// WHY:   Session warehouse sets form ids before the user types in the combobox.
// HOW:   Prefer loaded warehouse list; fall back to activeWarehouse from context.
// ============================================================================

import type { Warehouse } from '../types/api'
import type { WarehouseSearchResult } from './search/warehouse-search.service'
import type { ActiveWarehouse } from './warehouse-context'

export const resolveWarehouseSeed = (
  warehouseId: string,
  warehouses: Warehouse[],
  activeWarehouse: ActiveWarehouse | null,
): WarehouseSearchResult | null => {
  if (!warehouseId) {
    return null
  }
  const fromList = warehouses.find((warehouse) => warehouse.id === warehouseId)
  if (fromList) {
    return {
      id: fromList.id,
      code: fromList.code,
      name: fromList.name,
    }
  }
  if (activeWarehouse?.id === warehouseId) {
    return activeWarehouse
  }
  return null
}
