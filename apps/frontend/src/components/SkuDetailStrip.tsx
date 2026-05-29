import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiRequest } from '../lib/api'
import { queryKeys } from '../lib/query-keys'
import {
  assignCategoryToSku,
  fetchCategoryFlat,
  removeCategoryFromSku,
} from '../lib/taxonomy/category.service'
import {
  assignTagToSku,
  fetchTags,
  removeTagFromSku,
} from '../lib/taxonomy/tag.service'
import type { SkuDetail } from '../types/api'

type SkuDetailStripProps = {
  skuId: string | null
  onClose: () => void
  canManage?: boolean
}

export function SkuDetailStrip({
  skuId,
  onClose,
  canManage = false,
}: SkuDetailStripProps) {
  const queryClient = useQueryClient()
  const [categoryToAssign, setCategoryToAssign] = useState('')
  const [assignAsPrimary, setAssignAsPrimary] = useState(false)
  const [tagToAssign, setTagToAssign] = useState('')

  const detail = useQuery({
    queryKey: skuId ? queryKeys.skuDetail(skuId) : ['skus', 'detail', 'none'],
    queryFn: () => apiRequest<SkuDetail>(`/skus/${skuId}`),
    enabled: Boolean(skuId),
  })

  const flatCategories = useQuery({
    queryKey: [...queryKeys.categories, 'flat'] as const,
    queryFn: async () => {
      const response = await fetchCategoryFlat()
      return response.items
    },
    enabled: canManage && Boolean(skuId),
  })

  const allTags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const response = await fetchTags()
      return response.items
    },
    enabled: canManage && Boolean(skuId),
  })

  const invalidateSkuTaxonomy = async () => {
    if (!skuId) {
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.skuDetail(skuId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.skus }),
    ])
  }

  const assignCategory = useMutation({
    mutationFn: () =>
      assignCategoryToSku(skuId!, {
        categoryId: categoryToAssign,
        isPrimary: assignAsPrimary,
      }),
    onSuccess: async () => {
      setCategoryToAssign('')
      setAssignAsPrimary(false)
      await invalidateSkuTaxonomy()
    },
  })

  const unassignCategory = useMutation({
    mutationFn: (categoryId: string) => removeCategoryFromSku(skuId!, categoryId),
    onSuccess: invalidateSkuTaxonomy,
  })

  const assignTag = useMutation({
    mutationFn: () => assignTagToSku(skuId!, { tagId: tagToAssign }),
    onSuccess: async () => {
      setTagToAssign('')
      await invalidateSkuTaxonomy()
    },
  })

  const unassignTag = useMutation({
    mutationFn: (tagId: string) => removeTagFromSku(skuId!, tagId),
    onSuccess: invalidateSkuTaxonomy,
  })

  if (!skuId) {
    return null
  }

  const assignedCategoryIds = new Set(
    detail.data?.categories.map((category) => category.id) ?? [],
  )
  const assignedTagIds = new Set(detail.data?.tags.map((tag) => tag.id) ?? [])
  const availableCategories =
    flatCategories.data?.filter(
      (category) => !assignedCategoryIds.has(category.id),
    ) ?? []
  const availableTags =
    allTags.data?.filter((tag) => !assignedTagIds.has(tag.id)) ?? []

  return (
    <div className="sku-detail-strip">
      <div className="sku-detail-strip-header">
        <strong>SKU details</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {detail.isLoading ? (
        <p className="muted">Loading…</p>
      ) : detail.error ? (
        <p className="form-error">{detail.error.message}</p>
      ) : detail.data ? (
        <div className="sku-detail-strip-body">
          <p>
            <span className="eyebrow">Code</span> {detail.data.code} —{' '}
            {detail.data.name}
          </p>
          <div className="sku-detail-taxonomy">
            <div>
              <span className="eyebrow">Categories</span>
              {detail.data.categories.length > 0 ? (
                <ul className="sku-assigned-list">
                  {detail.data.categories.map((category) => (
                    <li key={category.id}>
                      <span>
                        {category.name}
                        {category.isPrimary ? ' (primary)' : ''}
                      </span>
                      {canManage ? (
                        <button
                          type="button"
                          className="link-button danger"
                          disabled={unassignCategory.isPending}
                          onClick={() => unassignCategory.mutate(category.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None assigned</p>
              )}
              {canManage && availableCategories.length > 0 ? (
                <div className="taxonomy-assign-row">
                  <select
                    value={categoryToAssign}
                    onChange={(event) =>
                      setCategoryToAssign(event.target.value)
                    }
                    aria-label="Category to assign"
                  >
                    <option value="">Assign category…</option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={assignAsPrimary}
                      onChange={(event) =>
                        setAssignAsPrimary(event.target.checked)
                      }
                    />
                    Primary
                  </label>
                  <button
                    type="button"
                    disabled={
                      !categoryToAssign || assignCategory.isPending
                    }
                    onClick={() => assignCategory.mutate()}
                  >
                    Assign
                  </button>
                </div>
              ) : null}
              {assignCategory.error ? (
                <p className="form-error">{assignCategory.error.message}</p>
              ) : null}
            </div>
            <div>
              <span className="eyebrow">Tags</span>
              {detail.data.tags.length > 0 ? (
                <ul className="sku-detail-tags sku-assigned-list">
                  {detail.data.tags.map((tag) => (
                    <li key={tag.id}>
                      <span
                        className="tag-chip small"
                        style={
                          tag.color
                            ? {
                                borderColor: tag.color,
                                backgroundColor: `${tag.color}22`,
                              }
                            : undefined
                        }
                      >
                        {tag.name}
                      </span>
                      {canManage ? (
                        <button
                          type="button"
                          className="link-button danger"
                          disabled={unassignTag.isPending}
                          onClick={() => unassignTag.mutate(tag.id)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None assigned</p>
              )}
              {canManage && availableTags.length > 0 ? (
                <div className="taxonomy-assign-row">
                  <select
                    value={tagToAssign}
                    onChange={(event) => setTagToAssign(event.target.value)}
                    aria-label="Tag to assign"
                  >
                    <option value="">Assign tag…</option>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!tagToAssign || assignTag.isPending}
                    onClick={() => assignTag.mutate()}
                  >
                    Assign
                  </button>
                </div>
              ) : null}
              {assignTag.error ? (
                <p className="form-error">{assignTag.error.message}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
