import type { AuthResponse, PublicUser } from '../types/api'

const TOKEN_KEY = 'inventoryhub.accessToken'
const USER_KEY = 'inventoryhub.user'

export type StoredAuth = {
  accessToken: string
  user: PublicUser
}

export const getStoredAuth = (): StoredAuth | null => {
  const accessToken = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)
  if (!accessToken || !rawUser) {
    return null
  }

  try {
    return { accessToken, user: JSON.parse(rawUser) as PublicUser }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const saveAuth = (auth: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, auth.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getAccessToken = () => getStoredAuth()?.accessToken ?? null
