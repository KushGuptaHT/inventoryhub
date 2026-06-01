// ============================================================================
// useWarehouseSearch — warehouse-specific search hook
// ============================================================================
// WHAT:  Wires useDebouncedSearch to the warehouse search API.
// WHY:   Forms should not embed URLs or debounce logic.
// HOW:   Delegates debounce + cancellation to useDebouncedSearch.
// ============================================================================

import { queryKeys } from '../lib/query-keys'
import {
  searchWarehouses,
  type WarehouseSearchResult,
} from '../lib/search/warehouse-search.service'
import { useDebouncedSearch } from './useDebouncedSearch'

/**
 * Search warehouses as the user types in an autocomplete field.
 */
export const useWarehouseSearch = (inputValue: string) => {
  return useDebouncedSearch<WarehouseSearchResult[]>({
    inputValue,
    queryKey: queryKeys.warehouseSearch,
    searchFn: searchWarehouses,
    delay: 300,
    minLength: 2,
  })
}
