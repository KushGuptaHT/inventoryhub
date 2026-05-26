import { clearAuth, getAccessToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

const buildHeaders = (body: unknown) => {
  const headers = new Headers()
  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

export const apiRequest = async <T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options.body),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (response.status === 401) {
    clearAuth()
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : `Request failed with ${response.status}`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export const toQueryString = (
  params: Record<string, string | number | boolean | undefined | null>,
) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}
