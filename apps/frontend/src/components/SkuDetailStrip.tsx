import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../lib/api'
import { queryKeys } from '../lib/query-keys'
import type { SkuDetail } from '../types/api'

type SkuDetailStripProps = {
  skuId: string | null
  onClose: () => void
}

export function SkuDetailStrip({ skuId, onClose }: SkuDetailStripProps) {
  const detail = useQuery({
    queryKey: skuId ? queryKeys.skuDetail(skuId) : ['skus', 'detail', 'none'],
    queryFn: () => apiRequest<SkuDetail>(`/skus/${skuId}`),
    enabled: Boolean(skuId),
  })

  if (!skuId) {
    return null
  }

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
                <ul>
                  {detail.data.categories.map((category) => (
                    <li key={category.id}>
                      {category.name}
                      {category.isPrimary ? ' (primary)' : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None assigned</p>
              )}
            </div>
            <div>
              <span className="eyebrow">Tags</span>
              {detail.data.tags.length > 0 ? (
                <ul className="sku-detail-tags">
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
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None assigned</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
