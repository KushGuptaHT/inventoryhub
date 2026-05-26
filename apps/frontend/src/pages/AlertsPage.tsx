import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import { queryKeys } from '../lib/query-keys'
import { UserRole, type Alert, type ListResponse } from '../types/api'

export function AlertsPage() {
  const queryClient = useQueryClient()
  const auth = getStoredAuth()
  const canManage = auth?.user.role === UserRole.MANAGER
  const [status, setStatus] = useState('')
  const alerts = useQuery({
    queryKey: [...queryKeys.alerts, status],
    queryFn: () =>
      apiRequest<ListResponse<Alert>>(
        `/alerts${toQueryString({ perPage: 100, status })}`,
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
    onSuccess: invalidateAlerts,
  })

  const resolve = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/resolve`, {
        method: 'PATCH',
        body: { reason: 'Resolved from frontend' },
      }),
    onSuccess: invalidateAlerts,
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
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All alert statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <Status
        isLoading={alerts.isLoading}
        error={alerts.error}
        empty={alerts.data?.data.length === 0}
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
              {alerts.data?.data.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.status}</td>
                  <td>{alert.skuId}</td>
                  <td>{alert.warehouseId}</td>
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
