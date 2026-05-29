import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type SkuListFilters = {
  categoryId: string | null
  tagIds: string[]
  search: string
  page: number
}

const parsePage = (value: string | null) => {
  const parsed = Number(value ?? '1')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

/**
 * Sync SKU browse filters with URL search params for shareable list views.
 */
export const useSkuListFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: SkuListFilters = useMemo(
    () => ({
      categoryId: searchParams.get('category'),
      tagIds: searchParams.getAll('tag'),
      search: searchParams.get('q') ?? '',
      page: parsePage(searchParams.get('page')),
    }),
    [searchParams],
  )

  const updateParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams)
      updater(next)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setCategoryId = useCallback(
    (categoryId: string | null) => {
      updateParams((next) => {
        if (categoryId) {
          next.set('category', categoryId)
        } else {
          next.delete('category')
        }
        next.delete('page')
      })
    },
    [updateParams],
  )

  const toggleTagId = useCallback(
    (tagId: string) => {
      updateParams((next) => {
        const current = next.getAll('tag')
        next.delete('tag')
        const nextTags = current.includes(tagId)
          ? current.filter((id) => id !== tagId)
          : [...current, tagId]
        for (const id of nextTags) {
          next.append('tag', id)
        }
        next.delete('page')
      })
    },
    [updateParams],
  )

  const clearTags = useCallback(() => {
    updateParams((next) => {
      next.delete('tag')
      next.delete('page')
    })
  }, [updateParams])

  const setSearch = useCallback(
    (search: string) => {
      updateParams((next) => {
        const trimmed = search.trim()
        if (trimmed) {
          next.set('q', trimmed)
        } else {
          next.delete('q')
        }
        next.delete('page')
      })
    },
    [updateParams],
  )

  const setPage = useCallback(
    (page: number) => {
      updateParams((next) => {
        if (page <= 1) {
          next.delete('page')
        } else {
          next.set('page', String(page))
        }
      })
    },
    [updateParams],
  )

  const clearAllFilters = useCallback(() => {
    updateParams((next) => {
      next.delete('category')
      next.delete('tag')
      next.delete('q')
      next.delete('page')
    })
  }, [updateParams])

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.tagIds.length > 0 ||
    filters.search.length > 0

  return {
    filters,
    setCategoryId,
    toggleTagId,
    clearTags,
    setSearch,
    setPage,
    clearAllFilters,
    hasActiveFilters,
  }
}
