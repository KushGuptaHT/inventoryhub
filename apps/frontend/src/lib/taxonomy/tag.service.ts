import { apiRequest } from '../api'
import type { Tag } from '../../types/api'

type TagListResponse = {
  items: Tag[]
}

export const fetchTags = () => apiRequest<TagListResponse>('/tags')

export const createTag = (body: { name: string; color?: string | null }) =>
  apiRequest<Tag>('/tags', { method: 'POST', body })

export const assignTagToSku = (skuId: string, body: { tagId: string }) =>
  apiRequest<void>(`/skus/${skuId}/tags`, { method: 'POST', body })

export const removeTagFromSku = (skuId: string, tagId: string) =>
  apiRequest<void>(`/skus/${skuId}/tags/${tagId}`, { method: 'DELETE' })
