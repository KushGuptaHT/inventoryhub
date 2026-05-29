// ============================================================================
// SKU SEARCH SERVICE (domain API layer)
// ============================================================================
// WHAT:  Calls GET /skus?search=... for autocomplete results.
// WHY:   Keeps API paths and response mapping out of React hooks/components.
// HOW:   Thin wrapper around apiRequest; accepts AbortSignal for cancellation.
// ============================================================================

import { apiRequest, toQueryString } from '../api'
import type { PaginatedResponse, Sku } from '../../types/api'

/** Minimal SKU shape needed by pickers (code + name for display). */
export type SkuSearchResult = Pick<Sku, 'id' | 'code' | 'name'>

/**
 * Search active SKUs by code or name (server-side, paginated).
 * Used by movement forms and any future SKU picker.
 */
export const searchSkus = async (
  term: string,
  signal: AbortSignal,
): Promise<SkuSearchResult[]> => {
  const response = await apiRequest<PaginatedResponse<Sku>>(
    `/skus${toQueryString({ search: term, perPage: 10, page: 1 })}`,
    { signal },
  )
  return response.items.map((sku) => ({
    id: sku.id,
    code: sku.code,
    name: sku.name,
  }))
}
