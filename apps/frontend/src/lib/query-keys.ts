export const queryKeys = {
  dashboard: ['dashboard', 'summary'] as const,
  warehouses: ['warehouses', 'list'] as const,
  skus: ['skus', 'list'] as const,
  movements: ['movements', 'history'] as const,
  alerts: ['alerts', 'list'] as const,
  purchaseOrders: ['purchase-orders', 'list'] as const,
  imports: ['imports'] as const,
  forecast: ['forecast', 'skus'] as const,

  /**
   * Autocomplete/search cache namespace (separate from list pages).
   * Factory so each search term gets its own cache entry.
   */
  skuSearch: (term: string) => ['skus', 'search', term] as const,
}
