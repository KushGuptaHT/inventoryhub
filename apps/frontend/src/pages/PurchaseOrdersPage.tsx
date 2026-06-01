import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import {
  applyOptimisticListUpdate,
  rollbackOptimisticListUpdate,
} from '../lib/optimistic-list'
import { queryKeys } from '../lib/query-keys'
import {
  UserRole,
  type PaginatedResponse,
  type PurchaseOrder,
} from '../types/api'

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient()
  const auth = getStoredAuth()
  const canManage = auth?.user.role === UserRole.MANAGER
  const [status, setStatus] = useState('')
  const ordersQueryKey = [...queryKeys.purchaseOrders, status] as const
  const orders = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () =>
      apiRequest<PaginatedResponse<PurchaseOrder>>(
        `/purchase-orders${toQueryString({ perPage: 100, status })}`,
      ),
  })

  const invalidateOrders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.movements }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
    ])
  }

  const patchOrderStatus = (
    current: PaginatedResponse<PurchaseOrder> | undefined,
    id: string,
    nextStatus: PurchaseOrder['status'],
  ) =>
    current
      ? {
          ...current,
          items: current.items.map((order) =>
            order.id === id ? { ...order, status: nextStatus } : order,
          ),
        }
      : current

  const send = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/purchase-orders/${id}/send`, {
        method: 'POST',
        body: { reason: 'Sent from frontend' },
      }),
    onMutate: async (id) =>
      applyOptimisticListUpdate<PaginatedResponse<PurchaseOrder>, string>(
        queryClient,
        ordersQueryKey,
        id,
        (current) => patchOrderStatus(current, id, 'SENT'),
      ),
    onError: (_error, _id, context) => {
      rollbackOptimisticListUpdate(queryClient, ordersQueryKey, context)
    },
    onSettled: invalidateOrders,
  })

  const receive = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: { reason: 'Received from frontend' },
      }),
    onMutate: async (id) =>
      applyOptimisticListUpdate<PaginatedResponse<PurchaseOrder>, string>(
        queryClient,
        ordersQueryKey,
        id,
        (current) => patchOrderStatus(current, id, 'RECEIVED'),
      ),
    onError: (_error, _id, context) => {
      rollbackOptimisticListUpdate(queryClient, ordersQueryKey, context)
    },
    onSettled: invalidateOrders,
  })

  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/purchase-orders/${id}/cancel`, {
        method: 'POST',
        body: { reason: 'Cancelled from frontend' },
      }),
    onMutate: async (id) =>
      applyOptimisticListUpdate<PaginatedResponse<PurchaseOrder>, string>(
        queryClient,
        ordersQueryKey,
        id,
        (current) => patchOrderStatus(current, id, 'CANCELLED'),
      ),
    onError: (_error, _id, context) => {
      rollbackOptimisticListUpdate(queryClient, ordersQueryKey, context)
    },
    onSettled: invalidateOrders,
  })

  const columns = useMemo((): DataTableColumn<PurchaseOrder>[] => {
    return [
      { id: 'po', header: 'PO Number', cell: (row) => row.poNumber },
      { id: 'status', header: 'Status', cell: (row) => row.status },
      {
        id: 'warehouse',
        header: 'Warehouse',
        cell: (row) =>
          row.warehouse
            ? `${row.warehouse.code} — ${row.warehouse.name}`
            : row.warehouseId,
      },
      { id: 'lines', header: 'Lines', cell: (row) => row.lineItems.length },
      {
        id: 'actions',
        header: 'Actions',
        cellClassName: 'actions',
        cell: (row) => (
          <>
            {canManage && row.status === 'DRAFT' ? (
              <button type="button" onClick={() => send.mutate(row.id)}>
                Send
              </button>
            ) : null}
            {row.status === 'SENT' ? (
              <button type="button" onClick={() => receive.mutate(row.id)}>
                Receive
              </button>
            ) : null}
            {canManage && (row.status === 'DRAFT' || row.status === 'SENT') ? (
              <button type="button" onClick={() => cancel.mutate(row.id)}>
                Cancel
              </button>
            ) : null}
          </>
        ),
      },
    ]
  }, [canManage, send, receive, cancel])

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Replenishment workflow</p>
          <h2>Purchase Orders</h2>
        </div>
      </div>

      <div className="inline-form">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All PO statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <Status
        isLoading={orders.isLoading}
        error={orders.error}
        empty={orders.data?.items.length === 0}
      >
        <DataTable
          columns={columns}
          data={orders.data?.items ?? []}
          getRowKey={(row) => row.id}
        />
      </Status>
    </section>
  )
}
