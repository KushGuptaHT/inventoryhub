import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TagCreateForm } from './TagCreateForm'
import { queryKeys } from '../lib/query-keys'
import { deleteTag, fetchTags } from '../lib/taxonomy/tag.service'

type TagFilterChipsProps = {
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onClearTags: () => void
  canManage?: boolean
}

export function TagFilterChips({
  selectedTagIds,
  onToggleTag,
  onClearTags,
  canManage = false,
}: TagFilterChipsProps) {
  const queryClient = useQueryClient()

  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const response = await fetchTags()
      return response.items
    },
  })

  const removeTag = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })

  if (tags.isLoading) {
    return <p className="muted">Loading tags…</p>
  }

  if (tags.error) {
    return <p className="form-error">{tags.error.message}</p>
  }

  const hasTags = tags.data && tags.data.length > 0

  return (
    <div className="tag-filter-block">
      {canManage ? <TagCreateForm /> : null}
      {!hasTags && !canManage ? (
        <p className="muted tag-filter-empty">No tags configured.</p>
      ) : null}
      {!hasTags && canManage ? (
        <p className="muted tag-filter-empty">
          No tags yet. Add one above, then click chips to filter.
        </p>
      ) : null}
      {hasTags ? (
        <div className="tag-filter" role="group" aria-label="Filter by tag">
          <span className="tag-filter-label">Tags</span>
          <div className="tag-filter-chips">
            {tags.data!.map((tag) => {
              const isActive = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={isActive ? 'tag-chip active' : 'tag-chip'}
                  style={
                    tag.color && isActive
                      ? {
                          borderColor: tag.color,
                          backgroundColor: `${tag.color}22`,
                        }
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
              <button
                type="button"
                className="tag-chip clear"
                onClick={onClearTags}
              >
                Clear tags
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {canManage && hasTags ? (
        <ul className="tag-manage-list">
          {tags.data!.map((tag) => (
            <li key={tag.id}>
              <span>{tag.name}</span>
              <button
                type="button"
                className="link-button danger"
                disabled={removeTag.isPending}
                onClick={() => {
                  if (window.confirm(`Delete tag "${tag.name}"?`)) {
                    removeTag.mutate(tag.id)
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {removeTag.error ? (
        <p className="form-error">{removeTag.error.message}</p>
      ) : null}
    </div>
  )
}
