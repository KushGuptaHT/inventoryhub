import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { SkuAutocomplete } from '../components/SkuAutocomplete'
import { SkuBarcodeLookup } from '../components/SkuBarcodeLookup'
import { WarehouseAutocomplete } from '../components/WarehouseAutocomplete'
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
import { resolveWarehouseSeed } from '../lib/warehouse-seed'
import type { MovementHistoryItem, MovementHistoryResponse } from '../types/api'

type MovementForm = {
  skuId: string
  warehouseId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: string
  quantityDelta: string
  notes: string
}

type MovementCursor = { createdAt: string; id: string } | null

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
  const [cursor, setCursor] = useState<MovementCursor>(null)
  const [cursorStack, setCursorStack] = useState<MovementCursor[]>([])
  const perPage = 25

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

  const cursorKey = cursor?.id ?? 'start'
  const movementsQueryKey = [...queryKeys.movements, cursorKey] as const
  const movements = useQuery({
    queryKey: movementsQueryKey,
    queryFn: () =>
      apiRequest<MovementHistoryResponse>(
        `/movements${toQueryString({
          perPage,
          cursorCreatedAt: cursor?.createdAt,
          cursorId: cursor?.id,
        })}`,
      ),
    placeholderData: keepPreviousData,
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
                ...(current.total !== undefined
                  ? { total: current.total + 1 }
                  : {}),
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
        cell: ({ row }) => row.original.destinationWarehouse?.code ?? '-',
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

  const receiptWarehouseSeed = useMemo(
    () => resolveWarehouseSeed(form.warehouseId, warehouses, activeWarehouse),
    [form.warehouseId, warehouses, activeWarehouse],
  )
  const fromWarehouseSeed = useMemo(
    () => resolveWarehouseSeed(form.fromWarehouseId, warehouses, activeWarehouse),
    [form.fromWarehouseId, warehouses, activeWarehouse],
  )
  const toWarehouseSeed = useMemo(
    () => resolveWarehouseSeed(form.toWarehouseId, warehouses, activeWarehouse),
    [form.toWarehouseId, warehouses, activeWarehouse],
  )

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

  const goNext = () => {
    const next = movements.data?.nextCursor ?? null
    if (!next) return
    setCursorStack((current) => [...current, cursor])
    setCursor(next)
  }

  const goPrevious = () => {
    setCursorStack((current) => {
      if (current.length === 0) return current
      const copy = current.slice()
      const prev = copy.pop() ?? null
      setCursor(prev)
      return copy
    })
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory operations</p>
          <h2>Movements</h2>
        </div>
      </div>

      <SkuBarcodeLookup onSelect={handleSkuChange} />

      <div className="movement-grid">
        <form className="form-card" onSubmit={submitReceipt}>
          <h3>Receipt</h3>
          <SkuAutocomplete value={form.skuId} onChange={handleSkuChange} />
          <WarehouseAutocomplete
            value={form.warehouseId}
            onChange={(warehouseId) => setForm({ ...form, warehouseId })}
            seedWarehouse={receiptWarehouseSeed}
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
          <button
            type="submit"
            disabled={receipt.isPending || !form.skuId || !form.warehouseId}
          >
            Receive stock
          </button>
          {receipt.error ? (
            <p className="form-error">{receipt.error.message}</p>
          ) : null}
        </form>

        <form className="form-card" onSubmit={submitAdjustment}>
          <h3>Adjustment</h3>
          <SkuAutocomplete value={form.skuId} onChange={handleSkuChange} />
          <WarehouseAutocomplete
            value={form.warehouseId}
            onChange={(warehouseId) => setForm({ ...form, warehouseId })}
            seedWarehouse={receiptWarehouseSeed}
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
          <button
            type="submit"
            disabled={
              adjustment.isPending || !form.skuId || !form.warehouseId
            }
          >
            Adjust stock
          </button>
          {adjustment.error ? (
            <p className="form-error">{adjustment.error.message}</p>
          ) : null}
        </form>

        <form className="form-card" onSubmit={submitTransfer}>
          <h3>Transfer</h3>
          <SkuAutocomplete value={form.skuId} onChange={handleSkuChange} />
          <WarehouseAutocomplete
            value={form.fromWarehouseId}
            onChange={(fromWarehouseId) =>
              setForm({ ...form, fromWarehouseId })
            }
            seedWarehouse={fromWarehouseSeed}
            label="From"
          />
          <WarehouseAutocomplete
            value={form.toWarehouseId}
            onChange={(toWarehouseId) => setForm({ ...form, toWarehouseId })}
            seedWarehouse={toWarehouseSeed}
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
          <button
            type="submit"
            disabled={
              transfer.isPending ||
              !form.skuId ||
              !form.fromWarehouseId ||
              !form.toWarehouseId
            }
          >
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
            disabled={cursorStack.length === 0}
            onClick={goPrevious}
          >
            Previous
          </button>
          <span>
            Showing {movements.data?.items.length ?? 0} movements
            {movements.isFetching && !movements.isLoading ? ' (updating...)' : ''}
          </span>
          <button
            type="button"
            disabled={!movements.data?.hasNext}
            onClick={goNext}
          >
            Next
          </button>
        </div>
      </Status>
    </section>
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
