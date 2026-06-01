// ============================================================================
// WarehouseAutocomplete — thin warehouse picker on shared search infrastructure
// ============================================================================
// WHAT:  Search-first warehouse selection for movement and filter forms.
// WHY:   Dropdowns do not scale when warehouse count grows.
// HOW:   useWarehouseSearch (data) + Combobox (UI); optional seed for session defaults.
// ============================================================================

import { useEffect, useState } from 'react'
import { useWarehouseSearch } from '../hooks/useWarehouseSearch'
import type { WarehouseSearchResult } from '../lib/search/warehouse-search.service'
import { Combobox } from './Combobox'

export type WarehouseAutocompleteProps = {
  value: string
  onChange: (warehouseId: string, warehouse: WarehouseSearchResult | null) => void
  /** When parent already set id (session warehouse), show label without typing. */
  seedWarehouse?: WarehouseSearchResult | null
  placeholder?: string
  disabled?: boolean
  label?: string
  /** Allow clearing selection (e.g. forecast “all warehouses”). */
  allowEmpty?: boolean
}

const formatWarehouseLabel = (warehouse: WarehouseSearchResult) =>
  `${warehouse.code} — ${warehouse.name}`

export function WarehouseAutocomplete({
  value,
  onChange,
  seedWarehouse = null,
  placeholder = 'Search warehouse code or name…',
  disabled = false,
  label = 'Warehouse',
  allowEmpty = false,
}: WarehouseAutocompleteProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseSearchResult | null>(null)

  const { results, isLoading, canSearch } = useWarehouseSearch(inputValue)

  // Parent cleared value (e.g. after form reset).
  useEffect(() => {
    if (!value) {
      setSelectedWarehouse(null)
      setInputValue('')
    }
  }, [value])

  // Session warehouse or list preload: show label when id is known before user searches.
  useEffect(() => {
    if (!value) {
      return
    }
    if (seedWarehouse && seedWarehouse.id === value) {
      setSelectedWarehouse(seedWarehouse)
      setInputValue('')
    }
  }, [value, seedWarehouse])

  const displayValue = selectedWarehouse
    ? formatWarehouseLabel(selectedWarehouse)
    : inputValue

  const handleInputChange = (next: string) => {
    if (selectedWarehouse) {
      setSelectedWarehouse(null)
      onChange('', null)
    }
    setInputValue(next)
  }

  const handleSelect = (warehouse: WarehouseSearchResult) => {
    setSelectedWarehouse(warehouse)
    setInputValue('')
    onChange(warehouse.id, warehouse)
  }

  const handleClear = () => {
    setSelectedWarehouse(null)
    setInputValue('')
    onChange('', null)
  }

  const showClear = allowEmpty && (selectedWarehouse || value)

  return (
    <div className="warehouse-autocomplete">
      <Combobox
        label={label}
        inputValue={displayValue}
        onInputChange={handleInputChange}
        items={results ?? []}
        onSelect={handleSelect}
        getItemKey={(warehouse) => warehouse.id}
        renderItem={(warehouse) => formatWarehouseLabel(warehouse)}
        isLoading={isLoading}
        placeholder={placeholder}
        emptyMessage="No warehouses found"
        hintMessage={canSearch ? undefined : 'Type at least 2 characters'}
        disabled={disabled}
      />
      {showClear ? (
        <button
          type="button"
          className="warehouse-autocomplete-clear"
          onClick={handleClear}
          aria-label="Clear warehouse selection"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}
