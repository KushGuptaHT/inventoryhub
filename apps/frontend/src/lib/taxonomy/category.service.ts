import { apiRequest } from '../api'
import type { Category } from '../../types/api'

type CategoryListResponse = {
  items: Category[]
}

export const fetchCategoryTree = () =>
  apiRequest<CategoryListResponse>('/categories?format=tree')
