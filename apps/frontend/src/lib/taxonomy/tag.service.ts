import { apiRequest } from '../api'
import type { Tag } from '../../types/api'

type TagListResponse = {
  items: Tag[]
}

export const fetchTags = () => apiRequest<TagListResponse>('/tags')
