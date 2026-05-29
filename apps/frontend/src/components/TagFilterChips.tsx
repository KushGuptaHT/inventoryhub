import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/query-keys'
import { fetchTags } from '../lib/taxonomy/tag.service'

type TagFilterChipsProps = {
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onClearTags: () => void
}

export function TagFilterChips({
  selectedTagIds,
  onToggleTag,
  onClearTags,
}: TagFilterChipsProps) {
  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const response = await fetchTags()
      return response.items
    },
  })

  if (tags.isLoading) {
    return <p className="muted">Loading tags…</p>
  }

  if (tags.error) {
    return <p className="form-error">{tags.error.message}</p>
  }

  if (!tags.data || tags.data.length === 0) {
    return (
      <p className="muted tag-filter-empty">
        No tags yet. Filter by tag once managers create labels.
      </p>
    )
  }

  return (
    <div className="tag-filter" role="group" aria-label="Filter by tag">
      <span className="tag-filter-label">Tags</span>
      <div className="tag-filter-chips">
        {tags.data.map((tag) => {
          const isActive = selectedTagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              className={isActive ? 'tag-chip active' : 'tag-chip'}
              style={
                tag.color && isActive
                  ? { borderColor: tag.color, backgroundColor: `${tag.color}22` }
                  : undefined
              }
              aria-pressed={isActive}
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </button>
          )
        })}
        {selectedTagIds.length > 0 ? (
          <button type="button" className="tag-chip clear" onClick={onClearTags}>
            Clear tags
          </button>
        ) : null}
      </div>
    </div>
  )
}
