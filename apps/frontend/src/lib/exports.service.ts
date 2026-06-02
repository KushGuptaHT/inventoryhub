import { apiRequest } from './api'
import type { ExportJob, MovementType } from '../types/api'

export type MovementsExportRequest = {
  from?: string
  to?: string
  warehouseId?: string
  skuId?: string
  type?: MovementType
}

export type CreateExportJobResponse = {
  id: string
  status: string
}

export const createMovementsExportJob = (body: MovementsExportRequest) =>
  apiRequest<CreateExportJobResponse>('/exports/movements', {
    method: 'POST',
    body,
  })

export const fetchExportJob = (id: string) =>
  apiRequest<ExportJob>(`/exports/${id}`)

