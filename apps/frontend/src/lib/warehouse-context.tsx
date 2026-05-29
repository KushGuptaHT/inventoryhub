// ============================================================================
// WAREHOUSE SESSION CONTEXT
// ============================================================================
// WHAT:  Remembers which warehouse the operator is "working in" for the session.
// WHY:   Operators repeat movements in one location; re-selecting warehouse is friction.
// HOW:   localStorage persistence + validate against active warehouse list from API.
// ============================================================================

import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from './api'
import { queryKeys } from './query-keys'
import type { PaginatedResponse, Warehouse } from '../types/api'

const STORAGE_KEY = 'inventoryhub.activeWarehouse'

export type ActiveWarehouse = Pick<Warehouse, 'id' | 'code' | 'name'>

type WarehouseContextValue = {
  activeWarehouse: ActiveWarehouse | null
  setActiveWarehouse: (warehouse: ActiveWarehouse) => void
  clearActiveWarehouse: () => void
  warehouses: Warehouse[]
  isLoading: boolean
}

const WarehouseContext = createContext<WarehouseContextValue | null>(null)

const readStoredWarehouse = (): ActiveWarehouse | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as ActiveWarehouse
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * Provides session-level warehouse context to the whole app shell.
 */
export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [activeWarehouse, setActiveWarehouseState] =
    useState<ActiveWarehouse | null>(() => readStoredWarehouse())

  const warehousesQuery = useQuery({
    queryKey: queryKeys.warehouses,
    queryFn: () =>
      apiRequest<PaginatedResponse<Warehouse>>('/warehouses?perPage=100'),
    staleTime: 5 * 60_000,
  })

  const warehouses = warehousesQuery.data?.items ?? []

  // Drop stale selection if warehouse was deactivated or removed.
  useEffect(() => {
    if (!activeWarehouse || warehouses.length === 0) {
      return
    }
    const stillValid = warehouses.some(
      (warehouse) => warehouse.id === activeWarehouse.id && warehouse.isActive,
    )
    if (!stillValid) {
      setActiveWarehouseState(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [activeWarehouse, warehouses])

  // Auto-select when only one active warehouse exists.
  useEffect(() => {
    const activeOnly = warehouses.filter((warehouse) => warehouse.isActive)
    if (!activeWarehouse && activeOnly.length === 1) {
      const only = activeOnly[0]
      const next = { id: only.id, code: only.code, name: only.name }
      setActiveWarehouseState(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }, [activeWarehouse, warehouses])

  const setActiveWarehouse = useCallback((warehouse: ActiveWarehouse) => {
    setActiveWarehouseState(warehouse)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouse))
  }, [])

  const clearActiveWarehouse = useCallback(() => {
    setActiveWarehouseState(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(
    () => ({
      activeWarehouse,
      setActiveWarehouse,
      clearActiveWarehouse,
      warehouses: warehouses.filter((warehouse) => warehouse.isActive),
      isLoading: warehousesQuery.isLoading,
    }),
    [
      activeWarehouse,
      setActiveWarehouse,
      clearActiveWarehouse,
      warehouses,
      warehousesQuery.isLoading,
    ],
  )

  return (
    <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>
  )
}

/** Read active warehouse session from any page under AppLayout. */
export const useWarehouseContext = (): WarehouseContextValue => {
  const context = useContext(WarehouseContext)
  if (!context) {
    throw new Error('useWarehouseContext must be used within WarehouseProvider')
  }
  return context
}

/** Clear session warehouse on logout (called from AppLayout). */
export const clearStoredActiveWarehouse = () => {
  localStorage.removeItem(STORAGE_KEY)
}
