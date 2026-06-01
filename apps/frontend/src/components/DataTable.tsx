// ============================================================================
// DataTable — generic paginated table for platform list pages
// ============================================================================
// WHAT:  Renders columns + rows inside table-card; optional pagination footer.
// WHY:   SKUs, warehouses, alerts shared the same table shell — extract once.
// HOW:   Column defs with cell renderers; parent wraps with Status for load/error.
// NOTE:  Movements history keeps TanStack Table (sorting/custom cells).
// ============================================================================

import type { ReactNode } from 'react'
import { ListPagination, type ListPaginationProps } from './ListPagination'

export type DataTableColumn<T> = {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  pagination?: ListPaginationProps
  getRowClassName?: (row: T) => string | undefined
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  pagination,
  getRowClassName,
}: DataTableProps<T>) {
  return (
    <>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={column.headerClassName}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={getRowKey(row)} className={getRowClassName?.(row)}>
                {columns.map((column) => (
                  <td key={column.id} className={column.cellClassName}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination ? <ListPagination {...pagination} /> : null}
    </>
  )
}
