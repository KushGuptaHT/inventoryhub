import { useQuery } from '@tanstack/react-query'
import { fetchCategoryTree } from '../lib/taxonomy/category.service'
import { queryKeys } from '../lib/query-keys'
import type { Category } from '../types/api'

type CategorySidebarProps = {
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
}

const CategoryTreeNodes = ({
  nodes,
  depth,
  selectedCategoryId,
  onSelectCategory,
}: {
  nodes: Category[]
  depth: number
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
}) => (
  <ul className="category-tree" role="tree">
    {nodes.map((node) => (
      <li key={node.id} role="treeitem" aria-expanded>
        <button
          type="button"
          className={
            selectedCategoryId === node.id
              ? 'category-tree-item active'
              : 'category-tree-item'
          }
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          onClick={() => onSelectCategory(node.id)}
        >
          {node.name}
        </button>
        {node.children && node.children.length > 0 ? (
          <CategoryTreeNodes
            nodes={node.children}
            depth={depth + 1}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        ) : null}
      </li>
    ))}
  </ul>
)

export function CategorySidebar({
  selectedCategoryId,
  onSelectCategory,
}: CategorySidebarProps) {
  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const response = await fetchCategoryTree()
      return response.items
    },
  })

  return (
    <aside className="category-sidebar" aria-label="Browse by category">
      <div className="category-sidebar-header">
        <h3>Categories</h3>
      </div>
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
        />
      ) : (
        <p className="muted">No categories yet. Managers can add them via API.</p>
      )}
    </aside>
  )
}
