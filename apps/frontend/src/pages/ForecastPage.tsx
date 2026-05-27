import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
import { queryKeys } from '../lib/query-keys'
import type { ForecastResponse, ListResponse, Warehouse } from '../types/api'

export function ForecastPage() {
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 25

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn: () =>
      apiRequest<ListResponse<Warehouse>>('/warehouses?perPage=50'),
  })

  const forecast = useQuery({
    queryKey: [...queryKeys.forecast, warehouseId, page, perPage],
    queryFn: () =>
      apiRequest<ForecastResponse>(
        `/forecast/skus${toQueryString({
          warehouseId: warehouseId || undefined,
          page,
          perPage,
        })}`,
      ),
  })

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Demand projection</p>
          <h2>Forecast</h2>
          <p className="muted">
            Outflow = transfers out of the warehouse plus negative stock
            adjustments (last 90 days). The 30-day average daily outflow
            estimates how many days until available stock runs out at the
            current pace. Receipts and positive adjustments are not counted.
          </p>
        </div>
      </div>

      <div className="inline-form">
        <label>
          Warehouse filter
          <select
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All warehouses</option>
            {warehouses.data?.data.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Status
        isLoading={forecast.isLoading}
        error={forecast.error}
        empty={forecast.data?.items.length === 0}
      >
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Warehouse</th>
                <th>Available</th>
                <th>90d outflow</th>
                <th>Avg daily (30d)</th>
                <th>Days remaining</th>
                <th>Low stock</th>
              </tr>
            </thead>
            <tbody>
              {forecast.data?.items.map((row) => (
                <tr key={`${row.skuId}-${row.warehouseId}`}>
                  <td>
                    <strong>{row.skuCode}</strong>
                    <div className="muted">{row.skuName}</div>
                  </td>
                  <td>
                    <strong>{row.warehouseCode}</strong>
                    <div className="muted">{row.warehouseName}</div>
                  </td>
                  <td>{row.available}</td>
                  <td>{row.outflow90d}</td>
                  <td>{row.avgDailyOutflow30d.toFixed(2)}</td>
                  <td>
                    {row.projectedDaysRemaining === null
                      ? '—'
                      : row.projectedDaysRemaining}
                  </td>
                  <td>{row.isLowStock ? 'Yes' : 'No'}</td>
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
            Page {forecast.data?.page ?? page}
            {forecast.data?.totalPages
              ? ` of ${forecast.data.totalPages}`
              : ''}
            {forecast.data?.total !== undefined
              ? ` (${forecast.data.total} rows)`
              : ''}
          </span>
          <button
            type="button"
            disabled={
              forecast.data?.totalPages !== undefined
                ? page >= forecast.data.totalPages
                : (forecast.data?.items.length ?? 0) < perPage
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
