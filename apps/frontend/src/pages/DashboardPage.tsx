import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { StatCard } from '../components/StatCard'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import { queryKeys } from '../lib/query-keys'
import type { DashboardSummary, PaginatedResponse, Warehouse } from '../types/api'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function DashboardPage() {
  const [warehouseId, setWarehouseId] = useState('')
  const warehouses = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn: () =>
      apiRequest<PaginatedResponse<Warehouse>>('/warehouses?perPage=100'),
  })
  const dashboard = useQuery({
    queryKey: [...queryKeys.dashboard, warehouseId],
    queryFn: () =>
      apiRequest<DashboardSummary>(
        `/dashboard/summary${toQueryString({ warehouseId })}`,
      ),
  })

  const summary = dashboard.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Phase 4 cache-backed summary</p>
          <h2>Dashboard</h2>
        </div>
        <div className="actions">
          <select
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="">Global summary</option>
            {warehouses.data?.items.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void dashboard.refetch()}>
            Refresh
          </button>
        </div>
      </div>

      <Status isLoading={dashboard.isLoading} error={dashboard.error} empty={!summary}>
        {summary ? (
          <>
            <div className="stat-grid">
              <StatCard label="Active SKUs" value={summary.activeSkuCount} />
              <StatCard
                label="Active warehouses"
                value={summary.activeWarehouseCount}
              />
              <StatCard label="Stock units" value={summary.totalStockUnits} />
              <StatCard
                label="Available units"
                value={summary.totalAvailableUnits}
                helper={`${summary.totalReservedUnits} reserved`}
              />
              <StatCard
                label="Inventory value"
                value={currency.format(Number(summary.inventoryValue))}
              />
              <StatCard label="Low-stock rows" value={summary.lowStockCount} />
              <StatCard label="Open alerts" value={summary.openAlertsCount} />
              <StatCard
                label="Active purchase orders"
                value={summary.activePurchaseOrdersCount}
              />
              <StatCard
                label="Recent movements"
                value={summary.recentMovementCount}
                helper="last 24 hours"
              />
            </div>
            <p className="muted">
              Generated at {new Date(summary.generatedAt).toLocaleString()}
            </p>
          </>
        ) : null}
      </Status>
    </section>
  )
}
