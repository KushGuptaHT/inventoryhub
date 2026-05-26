import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RouteError } from './components/RouteError'
import { getStoredAuth } from './lib/auth'
import { AlertsPage } from './pages/AlertsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ImportsPage } from './pages/ImportsPage'
import { LoginPage } from './pages/LoginPage'
import { MovementsPage } from './pages/MovementsPage'
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage'
import { SkusPage } from './pages/SkusPage'
import { WarehousesPage } from './pages/WarehousesPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: getStoredAuth() ? <Navigate to="/" replace /> : <LoginPage />,
    errorElement: <RouteError />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'warehouses', element: <WarehousesPage /> },
      { path: 'skus', element: <SkusPage /> },
      { path: 'movements', element: <MovementsPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'purchase-orders', element: <PurchaseOrdersPage /> },
      { path: 'imports', element: <ImportsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
