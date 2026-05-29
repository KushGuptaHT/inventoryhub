import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { SkuAutocomplete } from '../components/SkuAutocomplete'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import type { SkuSearchResult } from '../lib/search/sku-search.service'
import { getStoredAuth } from '../lib/auth'
import {
  applyOptimisticListUpdate,
  rollbackOptimisticListUpdate,
} from '../lib/optimistic-list'
import { queryKeys } from '../lib/query-keys'
import { useWarehouseContext } from '../lib/warehouse-context'
import type {
  MovementHistoryItem,
  MovementHistoryResponse,
  Warehouse,
} from '../types/api'

type MovementForm = {
  skuId: string
  warehouseId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: string
  quantityDelta: string
  notes: string
}

const emptyForm: MovementForm = {
  skuId: '',
  warehouseId: '',
  fromWarehouseId: '',
  toWarehouseId: '',
  quantity: '1',
  quantityDelta: '1',
  notes: '',
}

export function MovementsPage() {
  const queryClient = useQueryClient()
  const { activeWarehouse, warehouses } = useWarehouseContext()
  const [form, setForm] = useState(emptyForm)
  const [selectedSku, setSelectedSku] = useState<SkuSearchResult | null>(null)
  const [page, setPage] = useState(1)

  // Default movement forms to the session warehouse when operator sets one in the header.
  useEffect(() => {
    if (!activeWarehouse) {
      return
    }
    setForm((current) => ({
      ...current,
      warehouseId: activeWarehouse.id,
      fromWarehouseId: activeWarehouse.id,
    }))
  }, [activeWarehouse?.id])
  const movementsQueryKey = [...queryKeys.movements, page] as const
  const movements = useQuery({
    queryKey: movementsQueryKey,
    queryFn: () =>
      apiRequest<MovementHistoryResponse>(
        `/movements${toQueryString({ page, perPage: 25 })}`,
      ),
  })

  const invalidateMovementViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.movements }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
    ])
  }

  const receipt = useMutation({
    mutationFn: () =>
      apiRequest('/movements/receipt', {
        method: 'POST',
        body: {
          skuId: form.skuId,
          warehouseId: form.warehouseId,
          quantity: Number(form.quantity),
          notes: form.notes || undefined,
        },
      }),
    onSuccess: invalidateMovementViews,
  })

  const adjustment = useMutation({
    mutationFn: () =>
      apiRequest('/movements/adjustment', {
        method: 'POST',
        body: {
          skuId: form.skuId,
          warehouseId: form.warehouseId,
          quantityDelta: Number(form.quantityDelta),
          notes: form.notes || 'Frontend stock adjustment',
        },
      }),
    onMutate: async () => {
      const warehouse = warehouses.find((item) => item.id === form.warehouseId)
      const auth = getStoredAuth()
      if (!selectedSku || !warehouse) {
        return undefined
      }

      const pending: MovementHistoryItem = {
        id: `optimistic-${Date.now()}`,
        type: 'ADJUSTMENT',
        skuId: selectedSku.id,
        quantity: Math.abs(Number(form.quantityDelta)),
        quantityDelta: Number(form.quantityDelta),
        fromWarehouse: null,
        toWarehouse: warehouse.id,
        notes: `${form.notes || 'Frontend stock adjustment'} (pending)`,
        createdByUserId: auth?.user.id ?? 'pending',
        createdAt: new Date().toISOString(),
        sku: {
          id: selectedSku.id,
          code: selectedSku.code,
          name: selectedSku.name,
        },
        sourceWarehouse: null,
        destinationWarehouse: {
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
        },
      }

      return applyOptimisticListUpdate<MovementHistoryResponse, MovementHistoryItem>(
        queryClient,
        movementsQueryKey,
        pending,
        (current) =>
          current
            ? {
                ...current,
                items: [pending, ...current.items],
                total: current.total + 1,
              }
            : current,
      )
    },
    onError: (_error, _variables, context) => {
      rollbackOptimisticListUpdate(queryClient, movementsQueryKey, context)
    },
    onSettled: invalidateMovementViews,
  })

  const transfer = useMutation({
    mutationFn: () =>
      apiRequest('/movements/transfer', {
        method: 'POST',
        body: {
          skuId: form.skuId,
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          quantity: Number(form.quantity),
          notes: form.notes || undefined,
        },
      }),
    onSuccess: invalidateMovementViews,
  })

  const columns = useMemo<ColumnDef<MovementHistoryItem>[]>(
    () => [
      { accessorKey: 'type', header: 'Type' },
      { header: 'SKU', cell: ({ row }) => row.original.sku.code },
      {
        header: 'From',
        cell: ({ row }) => row.original.sourceWarehouse?.code ?? '-',
      },
      {
        header: 'To',
        cell: ({ row }) => row.original.destinationWarehouse.code,
      },
      {
        header: 'Qty',
        cell: ({ row }) => {
          const item = row.original
          if (item.type === 'ADJUSTMENT' && item.quantityDelta !== null) {
            const sign = item.quantityDelta > 0 ? '+' : ''
            return `${sign}${item.quantityDelta}`
          }
          return item.quantity
        },
      },
      {
        header: 'Created',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
    ],
    [],
  )

  // TanStack Table intentionally returns table helper functions from this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: movements.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const resetMovementForm = () => {
    setForm(emptyForm)
    setSelectedSku(null)
  }

  const handleSkuChange = (skuId: string, sku: SkuSearchResult | null) => {
    setForm((current) => ({ ...current, skuId }))
    setSelectedSku(sku)
  }

  const submitReceipt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    receipt.mutate(undefined, { onSuccess: resetMovementForm })
  }
  const submitAdjustment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    adjustment.mutate(undefined, { onSuccess: resetMovementForm })
  }
  const submitTransfer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    transfer.mutate(undefined, { onSuccess: resetMovementForm })
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory operations</p>
          <h2>Movements</h2>
        </div>
      </div>

      <div className="movement-grid">
        <form className="form-card" onSubmit={submitReceipt}>
          <h3>Receipt</h3>
          <SkuAutocomplete value={form.skuId} onChange={handleSkuChange} />
          <SelectWarehouse
            value={form.warehouseId}
            onChange={(warehouseId) => setForm({ ...form, warehouseId })}
            warehouses={warehouses}
            label="Warehouse"
          />
          <Quantity
            value={form.quantity}
            onChange={(quantity) => setForm({ ...form, quantity })}
          />
          <Notes
            value={form.notes}
            onChange={(notes) => setForm({ ...form, notes })}
          />
          <button type="submit" disabled={receipt.isPending || !form.skuId}>
            Receive stock
          </button>
          {receipt.error ? (
            <p className="form-error">{receipt.error.message}</p>
          ) : null}
        </form>

        <form className="form-card" onSubmit={submitAdjustment}>
          <h3>Adjustment</h3>
          <SkuAutocomplete value={form.skuId} onChange={handleSkuChange} />
          <SelectWarehouse
            value={form.warehouseId}
            onChange={(warehouseId) => setForm({ ...form, warehouseId })}
            warehouses={warehouses}
            label="Warehouse"
          />
          <label>
            Delta
            <input
              value={form.quantityDelta}
              onChange={(event) =>
                setForm({ ...form, quantityDelta: event.target.value })
              }
            />
          </label>
          <Notes
            value={form.notes}
            onChange={(notes) => setForm({ ...form, notes })}
          />
          <button type="submit" disabled={adjustment.isPending || !form.skuId}>
            Adjust stock
          </button>
          {adjustment.error ? (
            <p className="form-error">{adjustment.error.message}</p>
          ) : null}
        </form>

        <form className="form-card" onSubmit={submitTransfer}>
          <h3>Transfer</h3>
          <SkuAutocomplete value={form.skuId} onChange={handleSkuChange} />
          <SelectWarehouse
            value={form.fromWarehouseId}
            onChange={(fromWarehouseId) => setForm({ ...form, fromWarehouseId })}
            warehouses={warehouses}
            label="From"
          />
          <SelectWarehouse
            value={form.toWarehouseId}
            onChange={(toWarehouseId) => setForm({ ...form, toWarehouseId })}
            warehouses={warehouses}
            label="To"
          />
          <Quantity
            value={form.quantity}
            onChange={(quantity) => setForm({ ...form, quantity })}
          />
          <Notes
            value={form.notes}
            onChange={(notes) => setForm({ ...form, notes })}
          />
          <button type="submit" disabled={transfer.isPending || !form.skuId}>
            Transfer stock
          </button>
          {transfer.error ? (
            <p className="form-error">{transfer.error.message}</p>
          ) : null}
        </form>
      </div>

      <Status
        isLoading={movements.isLoading}
        error={movements.error}
        empty={movements.data?.items.length === 0}
      >
        <div className="table-card">
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {movements.data?.page ?? page}
            {movements.data?.totalPages
              ? ` of ${movements.data.totalPages}`
              : ''}
            {movements.data?.total !== undefined
              ? ` (${movements.data.total} movements)`
              : ''}
          </span>
          <button
            type="button"
            disabled={
              movements.data?.totalPages !== undefined
                ? page >= movements.data.totalPages
                : (movements.data?.items.length ?? 0) < 25
            }
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </Status>
    </section>
  )
}

function SelectWarehouse({
  value,
  onChange,
  warehouses,
  label,
}: {
  value: string
  onChange: (value: string) => void
  warehouses: Warehouse[]
  label: string
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select warehouse</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code}
          </option>
        ))}
      </select>
    </label>
  )
}

function Quantity({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Quantity
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Notes({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Notes
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
