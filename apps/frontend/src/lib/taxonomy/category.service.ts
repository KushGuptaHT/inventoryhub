import { apiRequest } from '../api'
import type { Category } from '../../types/api'

type CategoryListResponse = {
  items: Category[]
}

export const fetchCategoryTree = () =>
  apiRequest<CategoryListResponse>('/categories?format=tree')

export const fetchCategoryFlat = () =>
  apiRequest<CategoryListResponse>('/categories?format=flat')

export const createCategory = (body: {
  name: string
  parentId?: string | null
  description?: string | null
}) => apiRequest<Category>('/categories', { method: 'POST', body })

export const assignCategoryToSku = (
  skuId: string,
  body: { categoryId: string; isPrimary?: boolean },
) =>
  apiRequest<void>(`/skus/${skuId}/categories`, {
    method: 'POST',
    body,
  })

export const removeCategoryFromSku = (skuId: string, categoryId: string) =>
  apiRequest<void>(`/skus/${skuId}/categories/${categoryId}`, {
    method: 'DELETE',
  })
