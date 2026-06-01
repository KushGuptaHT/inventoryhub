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

  const columns = useMemo((): DataTableColumn<Alert>[] => {
    return [
      { id: 'status', header: 'Status', cell: (row) => row.status },
      {
        id: 'sku',
        header: 'SKU',
        cell: (row) => (
          <>
            <strong>{row.sku?.code ?? row.skuId}</strong>
            {row.sku?.name ? <div className="muted">{row.sku.name}</div> : null}
          </>
        ),
      },
      {
        id: 'warehouse',
        header: 'Warehouse',
        cell: (row) => (
          <>
            <strong>{row.warehouse?.code ?? row.warehouseId}</strong>
            {row.warehouse?.name ? (
              <div className="muted">{row.warehouse.name}</div>
            ) : null}
          </>
        ),
      },
      { id: 'stock', header: 'Stock', cell: (row) => row.availableStock },
      { id: 'threshold', header: 'Threshold', cell: (row) => row.reorderThreshold },
      {
        id: 'actions',
        header: 'Actions',
        cellClassName: 'actions',
        cell: (row) => (
          <>
            {canManage && row.status === 'OPEN' ? (
              <button
                type="button"
                onClick={() => acknowledge.mutate(row.id)}
                disabled={acknowledge.isPending}
              >
                Acknowledge
              </button>
            ) : null}
            {canManage && row.status !== 'RESOLVED' ? (
              <button
                type="button"
                onClick={() => resolve.mutate(row.id)}
                disabled={resolve.isPending}
              >
                Resolve
              </button>
            ) : null}
            {canManage && row.status !== 'RESOLVED' ? (
              <button
                type="button"
                onClick={() => createPo.mutate(row.id)}
                disabled={createPo.isPending}
              >
                Create PO
              </button>
            ) : null}
            {!canManage ? <span className="muted">Read only</span> : null}
          </>
        ),
      },
    ]
  }, [
    canManage,
    acknowledge.isPending,
    resolve.isPending,
    createPo.isPending,
  ])

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
        <DataTable
          columns={columns}
          data={alerts.data?.items ?? []}
          getRowKey={(row) => row.id}
          pagination={{
            page: alerts.data?.page ?? page,
            perPage,
            total: alerts.data?.total,
            totalPages: alerts.data?.totalPages,
            itemsOnPage: alerts.data?.items.length,
            onPageChange: setPage,
            itemLabel: 'alerts',
          }}
        />
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
