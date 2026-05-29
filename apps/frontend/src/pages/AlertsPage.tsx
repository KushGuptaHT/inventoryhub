import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import {
  applyOptimisticListUpdate,
  rollbackOptimisticListUpdate,
} from '../lib/optimistic-list'
import { queryKeys } from '../lib/query-keys'
import { UserRole, type Alert, type PaginatedResponse } from '../types/api'

export function AlertsPage() {
  const queryClient = useQueryClient()
  const auth = getStoredAuth()
  const canManage = auth?.user.role === UserRole.MANAGER
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 50
  const alertsQueryKey = [...queryKeys.alerts, status, page, perPage] as const
  const alerts = useQuery({
    queryKey: alertsQueryKey,
    queryFn: () =>
      apiRequest<PaginatedResponse<Alert>>(
        `/alerts${toQueryString({ perPage, page, status })}`,
      ),
  })

  const invalidateAlerts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
    ])
  }

  const acknowledge = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/acknowledge`, {
        method: 'PATCH',
        body: { reason: 'Acknowledged from frontend' },
      }),
    onMutate: async (id) =>
      applyOptimisticListUpdate<PaginatedResponse<Alert>, string>(
        queryClient,
        alertsQueryKey,
        id,
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((alert) =>
                  alert.id === id
                    ? { ...alert, status: 'ACKNOWLEDGED' as const }
                    : alert,
                ),
              }
            : current,
      ),
    onError: (_error, _id, context) => {
      rollbackOptimisticListUpdate(queryClient, alertsQueryKey, context)
    },
    onSettled: invalidateAlerts,
  })

  const resolve = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/resolve`, {
        method: 'PATCH',
        body: { reason: 'Resolved from frontend' },
      }),
    onMutate: async (id) =>
      applyOptimisticListUpdate<PaginatedResponse<Alert>, string>(
        queryClient,
        alertsQueryKey,
        id,
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((alert) =>
                  alert.id === id
                    ? { ...alert, status: 'RESOLVED' as const }
                    : alert,
                ),
              }
            : current,
      ),
    onError: (_error, _id, context) => {
      rollbackOptimisticListUpdate(queryClient, alertsQueryKey, context)
    },
    onSettled: invalidateAlerts,
  })

  const createPo = useMutation({
    mutationFn: (alertId: string) =>
      apiRequest('/purchase-orders/from-alert', {
        method: 'POST',
        body: {
          alertId,
          quantityOrdered: 100,
          notes: 'Created from frontend alert action',
        },
      }),
    onSuccess: invalidateAlerts,
  })

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Replenishment signals</p>
          <h2>Alerts</h2>
        </div>
      </div>

      <div className="inline-form">
        <select
          value={status}
          onChange={(event) => {
            setPage(1)
            setStatus(event.target.value)
          }}
        >
          <option value="">All alert statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <Status
        isLoading={alerts.isLoading}
        error={alerts.error}
        empty={alerts.data?.items.length === 0}
      >
        {!canManage ? (
          <p className="muted">
            Operators can view alerts. Manager access is required for alert
            transitions and purchase-order creation.
          </p>
        ) : null}
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>SKU</th>
                <th>Warehouse</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.data?.items.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.status}</td>
                  <td>
                    <strong>{alert.sku?.code ?? alert.skuId}</strong>
                    {alert.sku?.name ? (
                      <div className="muted">{alert.sku.name}</div>
                    ) : null}
                  </td>
                  <td>
                    <strong>{alert.warehouse?.code ?? alert.warehouseId}</strong>
                    {alert.warehouse?.name ? (
                      <div className="muted">{alert.warehouse.name}</div>
                    ) : null}
                  </td>
                  <td>{alert.availableStock}</td>
                  <td>{alert.reorderThreshold}</td>
                  <td className="actions">
                    {canManage && alert.status === 'OPEN' ? (
                      <button
                        type="button"
                        onClick={() => acknowledge.mutate(alert.id)}
                        disabled={acknowledge.isPending}
                      >
                        Acknowledge
                      </button>
                    ) : null}
                    {canManage && alert.status !== 'RESOLVED' ? (
                      <button
                        type="button"
                        onClick={() => resolve.mutate(alert.id)}
                        disabled={resolve.isPending}
                      >
                        Resolve
                      </button>
                    ) : null}
                    {canManage && alert.status !== 'RESOLVED' ? (
                      <button
                        type="button"
                        onClick={() => createPo.mutate(alert.id)}
                        disabled={createPo.isPending}
                      >
                        Create PO
                      </button>
                    ) : null}
                    {!canManage ? <span className="muted">Read only</span> : null}
                  </td>
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
            Page {alerts.data?.page ?? page}
            {alerts.data?.totalPages ? ` of ${alerts.data.totalPages}` : ''}
            {` (${alerts.data?.total ?? 0} alerts)`}
          </span>
          <button
            type="button"
            disabled={
              alerts.data?.totalPages !== undefined
                ? page >= alerts.data.totalPages
                : (alerts.data?.items.length ?? 0) < perPage
            }
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
        {acknowledge.error ? (
          <p className="form-error">Acknowledge failed: {acknowledge.error.message}</p>
        ) : null}
        {resolve.error ? (
          <p className="form-error">Resolve failed: {resolve.error.message}</p>
        ) : null}
        {createPo.error ? (
          <p className="form-error">Create PO failed: {createPo.error.message}</p>
        ) : null}
      </Status>
    </section>
  )
}
