// ============================================================================
// useDebouncedSearch — generic search infrastructure hook
// ============================================================================
// WHAT:  Debounces typed input, runs TanStack Query, forwards AbortSignal.
// WHY:   Every entity search (SKU, warehouse, supplier) shares this pattern.
// HOW:   Wait N ms after typing stops → query with new key → cancel old fetch.
// ============================================================================

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

type UseDebouncedSearchOptions<TResult> = {
  /** Current text in the search input (not yet debounced). */
  inputValue: string
  /** Builds a unique React Query key per debounced term. */
  queryKey: (debouncedTerm: string) => readonly unknown[]
  /** Performs the API call; must pass `signal` into fetch for cancellation. */
  searchFn: (debouncedTerm: string, signal: AbortSignal) => Promise<TResult>
  /** Milliseconds to wait after last keystroke before searching. */
  delay?: number
  /** Do not hit the API until the user types at least this many characters. */
  minLength?: number
  /** How long cached search results stay fresh (ms). */
  staleTime?: number
}

/**
 * Generic debounced search hook used by all autocomplete pickers.
 *
 * Race handling: when the term changes, TanStack Query aborts the previous
 * request via `signal`, so slow responses cannot overwrite newer results.
 */
export const useDebouncedSearch = <TResult>({
  inputValue,
  queryKey,
  searchFn,
  delay = 300,
  minLength = 2,
  staleTime = 60_000,
}: UseDebouncedSearchOptions<TResult>) => {
  const [debouncedTerm, setDebouncedTerm] = useState('')

  // Debounce: only update debouncedTerm after the user pauses typing.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTerm(inputValue.trim())
    }, delay)
    return () => window.clearTimeout(timer)
  }, [inputValue, delay])

  const canSearch = debouncedTerm.length >= minLength

  const query = useQuery({
    queryKey: queryKey(debouncedTerm),
    queryFn: ({ signal }) => searchFn(debouncedTerm, signal),
    enabled: canSearch,
    staleTime,
    // Keep recent searches in memory briefly when the dropdown closes.
    gcTime: 120_000,
  })

  return {
    debouncedTerm,
    canSearch,
    results: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  }
}
