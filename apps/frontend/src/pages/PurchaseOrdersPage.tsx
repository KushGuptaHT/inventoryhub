import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import { queryKeys } from '../lib/query-keys'
import {
  UserRole,
  type ListResponse,
  type PurchaseOrder,
} from '../types/api'

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient()
  const auth = getStoredAuth()
  const canManage = auth?.user.role === UserRole.MANAGER
  const [status, setStatus] = useState('')
  const orders = useQuery({
    queryKey: [...queryKeys.purchaseOrders, status],
    queryFn: () =>
      apiRequest<ListResponse<PurchaseOrder>>(
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

  const send = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/purchase-orders/${id}/send`, {
        method: 'POST',
        body: { reason: 'Sent from frontend' },
      }),
    onSuccess: invalidateOrders,
  })

  const receive = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: { reason: 'Received from frontend' },
      }),
    onSuccess: invalidateOrders,
  })

  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/purchase-orders/${id}/cancel`, {
        method: 'POST',
        body: { reason: 'Cancelled from frontend' },
      }),
    onSuccess: invalidateOrders,
  })

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
        empty={orders.data?.data.length === 0}
      >
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Status</th>
                <th>Warehouse</th>
                <th>Lines</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.data?.data.map((order) => (
                <tr key={order.id}>
                  <td>{order.poNumber}</td>
                  <td>{order.status}</td>
                  <td>{order.warehouseId}</td>
                  <td>{order.lineItems.length}</td>
                  <td className="actions">
                    {canManage && order.status === 'DRAFT' ? (
                      <button type="button" onClick={() => send.mutate(order.id)}>
                        Send
                      </button>
                    ) : null}
                    {order.status === 'SENT' ? (
                      <button
                        type="button"
                        onClick={() => receive.mutate(order.id)}
                      >
                        Receive
                      </button>
                    ) : null}
                    {canManage &&
                    (order.status === 'DRAFT' || order.status === 'SENT') ? (
                      <button type="button" onClick={() => cancel.mutate(order.id)}>
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Status>
    </section>
  )
}
