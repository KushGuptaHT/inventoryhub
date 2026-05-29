// ============================================================================
// useSkuSearch — SKU-specific search hook
// ============================================================================
// WHAT:  Wires useDebouncedSearch to the SKU search API.
// WHY:   Movement forms only need "search SKUs"; they should not know URLs.
// HOW:   Delegates debounce + cancellation to useDebouncedSearch.
// ============================================================================

import { queryKeys } from '../lib/query-keys'
import {
  searchSkus,
  type SkuSearchResult,
} from '../lib/search/sku-search.service'
import { useDebouncedSearch } from './useDebouncedSearch'

/**
 * Search SKUs as the user types in an autocomplete field.
 */
export const useSkuSearch = (inputValue: string) => {
  return useDebouncedSearch<SkuSearchResult[]>({
    inputValue,
    queryKey: queryKeys.skuSearch,
    searchFn: searchSkus,
    delay: 300,
    minLength: 2,
  })
}
