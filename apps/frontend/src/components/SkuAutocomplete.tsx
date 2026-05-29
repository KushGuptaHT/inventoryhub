// ============================================================================
// SkuAutocomplete — thin SKU picker built on shared search infrastructure
// ============================================================================
// WHAT:  Search-first SKU selection for movement forms.
// WHY:   Dropdowns do not scale past a few hundred SKUs.
// HOW:   useSkuSearch (data) + Combobox (UI); parent only stores skuId + metadata.
// ============================================================================

import { useEffect, useState } from 'react'
import { useSkuSearch } from '../hooks/useSkuSearch'
import type { SkuSearchResult } from '../lib/search/sku-search.service'
import { Combobox } from './Combobox'

export type SkuAutocompleteProps = {
  /** Selected SKU id (empty string = none). Controlled by parent form state. */
  value: string
  /**
   * Called when user picks or clears a SKU.
   * Second arg gives code/name for optimistic UI without another API call.
   */
  onChange: (skuId: string, sku: SkuSearchResult | null) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

const formatSkuLabel = (sku: SkuSearchResult) => `${sku.code} — ${sku.name}`

/**
 * SKU autocomplete field: type to search, pick from top matches.
 */
export function SkuAutocomplete({
  value,
  onChange,
  placeholder = 'Search SKU code or name…',
  disabled = false,
  label = 'SKU',
}: SkuAutocompleteProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedSku, setSelectedSku] = useState<SkuSearchResult | null>(null)

  const { results, isLoading, canSearch } = useSkuSearch(inputValue)

  // When parent clears value (e.g. after successful submit), reset local display.
  useEffect(() => {
    if (!value) {
      setSelectedSku(null)
      setInputValue('')
    }
  }, [value])

  const displayValue = selectedSku ? formatSkuLabel(selectedSku) : inputValue

  const handleInputChange = (next: string) => {
    // User is typing again — drop previous selection until they pick a row.
    if (selectedSku) {
      setSelectedSku(null)
      onChange('', null)
    }
    setInputValue(next)
  }

  const handleSelect = (sku: SkuSearchResult) => {
    setSelectedSku(sku)
    setInputValue('')
    onChange(sku.id, sku)
  }

  const handleClear = () => {
    setSelectedSku(null)
    setInputValue('')
    onChange('', null)
  }

  return (
    <div className="sku-autocomplete">
      <Combobox
        label={label}
        inputValue={displayValue}
        onInputChange={handleInputChange}
        items={results ?? []}
        onSelect={handleSelect}
        getItemKey={(sku) => sku.id}
        renderItem={(sku) => formatSkuLabel(sku)}
        isLoading={isLoading}
        placeholder={placeholder}
        emptyMessage="No SKUs found"
        hintMessage={canSearch ? undefined : 'Type at least 2 characters'}
        disabled={disabled}
      />
      {selectedSku ? (
        <button
          type="button"
          className="sku-autocomplete-clear"
          onClick={handleClear}
          aria-label="Clear SKU selection"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}
