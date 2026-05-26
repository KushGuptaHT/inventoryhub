import { Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { getStoredAuth } from '../lib/auth'

export function ProtectedRoute() {
  return getStoredAuth() ? <AppLayout /> : <Navigate to="/login" replace />
}
