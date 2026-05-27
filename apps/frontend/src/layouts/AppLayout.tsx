import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuth, getStoredAuth } from '../lib/auth'
import { UserRole } from '../types/api'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/warehouses', label: 'Warehouses' },
  { to: '/skus', label: 'SKUs' },
  { to: '/movements', label: 'Movements' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/imports', label: 'Imports' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const auth = getStoredAuth()
  const roleLabel =
    auth?.user.role === UserRole.MANAGER ? 'Manager' : 'Operator'

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">InventoryHub</p>
          <h1>Operations</h1>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <strong>{auth?.user.name ?? 'Inventory user'}</strong>
            <span>{roleLabel}</span>
          </div>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
