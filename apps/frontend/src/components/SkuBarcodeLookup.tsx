// ============================================================================
// SkuBarcodeLookup — scan or type exact SKU code and select
// ============================================================================
// WHAT:  Enter/barcode-scan a SKU code and load it via GET /skus/code/:code.
// WHY:   Operators often scan barcodes instead of typing partial names.
// HOW:   On Enter, fetch by code and call parent onChange with full sku metadata.
// ============================================================================

import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api'
import type { SkuSearchResult } from '../lib/search/sku-search.service'

type SkuBarcodeLookupProps = {
  onSelect: (skuId: string, sku: SkuSearchResult) => void
  disabled?: boolean
}

export function SkuBarcodeLookup({ onSelect, disabled = false }: SkuBarcodeLookupProps) {
  const [code, setCode] = useState('')

  const lookup = useMutation({
    mutationFn: (skuCode: string) =>
      apiRequest<{ id: string; code: string; name: string }>(
        `/skus/code/${encodeURIComponent(skuCode.trim().toUpperCase())}`,
      ),
    onSuccess: (sku) => {
      setCode('')
      onSelect(sku.id, { id: sku.id, code: sku.code, name: sku.name })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      return
    }
    lookup.mutate(trimmed)
  }

  return (
    <form className="barcode-lookup" onSubmit={submit}>
      <label>
        Barcode / SKU code
        <input
          value={code}
          disabled={disabled || lookup.isPending}
          placeholder="Scan or type code, press Enter"
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      {lookup.error ? (
        <p className="form-error">{lookup.error.message}</p>
      ) : null}
    </form>
  )
}
