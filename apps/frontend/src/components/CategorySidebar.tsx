import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CategoryCreateForm } from './CategoryCreateForm'
import { deleteCategory, fetchCategoryTree } from '../lib/taxonomy/category.service'
import { queryKeys } from '../lib/query-keys'
import type { Category } from '../types/api'

type CategorySidebarProps = {
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
  canManage?: boolean
}

const CategoryTreeNodes = ({
  nodes,
  depth,
  selectedCategoryId,
  onSelectCategory,
  canManage,
  onDelete,
  isDeleting,
}: {
  nodes: Category[]
  depth: number
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
  canManage: boolean
  onDelete: (id: string) => void
  isDeleting: boolean
}) => (
  <ul className="category-tree" role="tree">
    {nodes.map((node) => (
      <li key={node.id} role="treeitem" aria-expanded>
        <div
          className="category-tree-row"
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          <button
            type="button"
            className={
              selectedCategoryId === node.id
                ? 'category-tree-item active'
                : 'category-tree-item'
            }
            onClick={() => onSelectCategory(node.id)}
          >
            {node.name}
            {node.skuCount !== undefined ? (
              <span className="category-count"> ({node.skuCount})</span>
            ) : null}
          </button>
          {canManage ? (
            <button
              type="button"
              className="category-delete"
              title="Delete category"
              disabled={isDeleting}
              onClick={() => {
                if (window.confirm(`Delete category "${node.name}"?`)) {
                  onDelete(node.id)
                }
              }}
            >
              ×
            </button>
          ) : null}
        </div>
        {node.children && node.children.length > 0 ? (
          <CategoryTreeNodes
            nodes={node.children}
            depth={depth + 1}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
            canManage={canManage}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ) : null}
      </li>
    ))}
  </ul>
)

export function CategorySidebar({
  selectedCategoryId,
  onSelectCategory,
  canManage = false,
}: CategorySidebarProps) {
  const queryClient = useQueryClient()

  const categories = useQuery({
    queryKey: [...queryKeys.categories, 'counts'] as const,
    queryFn: async () => {
      const response = await fetchCategoryTree({ includeCounts: true })
      return response.items
    },
  })

  const removeCategory = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      if (selectedCategoryId) {
        onSelectCategory(null)
      }
    },
  })

  return (
    <aside className="category-sidebar" aria-label="Browse by category">
      <div className="category-sidebar-header">
        <h3>Categories</h3>
      </div>
      {canManage ? <CategoryCreateForm /> : null}
      <button
        type="button"
        className={
          selectedCategoryId === null
            ? 'category-tree-item active'
            : 'category-tree-item'
        }
        onClick={() => onSelectCategory(null)}
      >
        All SKUs
      </button>
      {categories.isLoading ? (
        <p className="muted">Loading categories…</p>
      ) : categories.error ? (
        <p className="form-error">{categories.error.message}</p>
      ) : categories.data && categories.data.length > 0 ? (
        <CategoryTreeNodes
          nodes={categories.data}
          depth={0}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onSelectCategory}
          canManage={canManage}
          onDelete={(id) => removeCategory.mutate(id)}
          isDeleting={removeCategory.isPending}
        />
      ) : (
        <p className="muted">
          {canManage
            ? 'No categories yet. Add one above.'
            : 'No categories configured.'}
        </p>
      )}
      {removeCategory.error ? (
        <p className="form-error">{removeCategory.error.message}</p>
      ) : null}
    </aside>
  )
}
