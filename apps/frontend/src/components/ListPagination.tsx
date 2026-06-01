// ============================================================================
// ListPagination — shared footer for paginated API lists
// ============================================================================
// WHAT:  Previous/Next controls and page summary for DataTable pages.
// WHY:   Every list page repeated the same pagination markup.
// HOW:   Parent owns page state; passes totals from PaginatedResponse.
// ============================================================================

export type ListPaginationProps = {
  page: number
  perPage: number
  total?: number
  totalPages?: number
  onPageChange: (page: number) => void
  /** Noun for total count, e.g. "warehouses", "alerts", "active" (SKUs). */
  itemLabel?: string
  /** When totalPages unknown, disable Next if current page has fewer rows than perPage. */
  itemsOnPage?: number
}

export function ListPagination({
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  itemLabel = 'records',
  itemsOnPage,
}: ListPaginationProps) {
  const atLastPage =
    totalPages !== undefined
      ? page >= totalPages
      : itemsOnPage !== undefined
        ? itemsOnPage < perPage
        : false

  return (
    <div className="pagination">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <span>
        Page {page}
        {totalPages ? ` of ${totalPages}` : ''}
        {total !== undefined ? ` (${total} ${itemLabel})` : ''}
      </span>
      <button
        type="button"
        disabled={atLastPage}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
