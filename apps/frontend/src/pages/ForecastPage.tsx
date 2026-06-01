import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Status } from '../components/Status'
import { WarehouseAutocomplete } from '../components/WarehouseAutocomplete'
import { apiRequest, toQueryString } from '../lib/api'
import { queryKeys } from '../lib/query-keys'
import { useWarehouseContext } from '../lib/warehouse-context'
import { resolveWarehouseSeed } from '../lib/warehouse-seed'
import type { ForecastResponse, ForecastRow } from '../types/api'

export function ForecastPage() {
  const { activeWarehouse, warehouses } = useWarehouseContext()
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 25

  useEffect(() => {
    if (activeWarehouse) {
      setWarehouseId(activeWarehouse.id)
    }
  }, [activeWarehouse?.id])

  const warehouseSeed = useMemo(
    () => resolveWarehouseSeed(warehouseId, warehouses, activeWarehouse),
    [warehouseId, warehouses, activeWarehouse],
  )

  const forecastColumns = useMemo(
    (): DataTableColumn<ForecastRow>[] => [
      {
        id: 'sku',
        header: 'SKU',
        cell: (row) => (
          <>
            <strong>{row.skuCode}</strong>
            <div className="muted">{row.skuName}</div>
          </>
        ),
      },
      {
        id: 'warehouse',
        header: 'Warehouse',
        cell: (row) => (
          <>
            <strong>{row.warehouseCode}</strong>
            <div className="muted">{row.warehouseName}</div>
          </>
        ),
      },
      { id: 'available', header: 'Available', cell: (row) => row.available },
      { id: 'outflow', header: '90d outflow', cell: (row) => row.outflow90d },
      {
        id: 'avg',
        header: 'Avg daily (30d)',
        cell: (row) => row.avgDailyOutflow30d.toFixed(2),
      },
      {
        id: 'days',
        header: 'Days remaining',
        cell: (row) =>
          row.projectedDaysRemaining === null ? '—' : row.projectedDaysRemaining,
      },
      {
        id: 'low',
        header: 'Low stock',
        cell: (row) => (row.isLowStock ? 'Yes' : 'No'),
      },
    ],
    [],
  )

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

      <div className="forecast-warehouse-filter">
        <WarehouseAutocomplete
          value={warehouseId}
          onChange={(id) => {
            setWarehouseId(id)
            setPage(1)
          }}
          seedWarehouse={warehouseSeed}
          allowEmpty
          label="Warehouse filter"
          placeholder="All warehouses — search to filter…"
        />
      </div>

      <Status
        isLoading={forecast.isLoading}
        error={forecast.error}
        empty={forecast.data?.items.length === 0}
      >
        <DataTable
          columns={forecastColumns}
          data={forecast.data?.items ?? []}
          getRowKey={(row) => `${row.skuId}-${row.warehouseId}`}
          pagination={{
            page: forecast.data?.page ?? page,
            perPage,
            total: forecast.data?.total,
            totalPages: forecast.data?.totalPages,
            itemsOnPage: forecast.data?.items.length,
            onPageChange: setPage,
            itemLabel: 'rows',
          }}
        />
      </Status>
    </section>
  )
}
