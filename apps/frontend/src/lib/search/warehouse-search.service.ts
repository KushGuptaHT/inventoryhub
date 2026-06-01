// ============================================================================
// WAREHOUSE SEARCH SERVICE (domain API layer)
// ============================================================================
// WHAT:  Calls GET /warehouses?search=... for autocomplete results.
// WHY:   Movement forms should not load every warehouse into a <select>.
// HOW:   Thin wrapper around apiRequest; forwards AbortSignal for cancellation.
// ============================================================================

import { apiRequest, toQueryString } from '../api'
import type { PaginatedResponse, Warehouse } from '../../types/api'

/** Minimal warehouse shape for pickers (code + name for display). */
export type WarehouseSearchResult = Pick<Warehouse, 'id' | 'code' | 'name'>

/**
 * Search active warehouses by code or name (server-side, paginated).
 */
export const searchWarehouses = async (
  term: string,
  signal: AbortSignal,
): Promise<WarehouseSearchResult[]> => {
  const response = await apiRequest<PaginatedResponse<Warehouse>>(
    `/warehouses${toQueryString({ search: term, perPage: 10, page: 1 })}`,
    { signal },
  )
  return response.items.map((warehouse) => ({
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
  }))
}
